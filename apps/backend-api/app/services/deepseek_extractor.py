from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Any

import httpx

from app.config import get_settings
from app.schemas.domain import (
    Citation,
    ExtractedCompany,
    ExtractedFact,
    ExtractedPerson,
    ExtractedRelationship,
    ExtractionResult,
)

logger = logging.getLogger("towerbrook.extractor")

# Retry configuration for external API calls
MAX_RETRIES = 3
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


async def _retry_with_backoff(fn, *args, max_retries=MAX_RETRIES, **kwargs):
    """Call an async function with exponential backoff on transient failures."""
    last_exc = None
    for attempt in range(max_retries):
        try:
            return await fn(*args, **kwargs)
        except httpx.TimeoutException as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                delay = 2 ** attempt
                logger.warning("API timeout (attempt %d/%d), retrying in %ds", attempt + 1, max_retries, delay)
                await asyncio.sleep(delay)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in RETRYABLE_STATUSES and attempt < max_retries - 1:
                delay = 2 ** attempt
                logger.warning("API %d (attempt %d/%d), retrying in %ds", exc.response.status_code, attempt + 1, max_retries, delay)
                await asyncio.sleep(delay)
                last_exc = exc
            else:
                raise
        except (httpx.ConnectError, httpx.RemoteProtocolError) as exc:
            last_exc = exc
            if attempt < max_retries - 1:
                delay = 2 ** attempt
                logger.warning("API connection error (attempt %d/%d), retrying in %ds", attempt + 1, max_retries, delay)
                await asyncio.sleep(delay)
    raise last_exc  # type: ignore[misc]


SYSTEM_PROMPT = """You extract private-equity people intelligence.
Experts are the primary output. Deals and companies are evidence and graph anchors.

Prioritize every named person with a source-grounded role, especially:
- founders, former founders, management, operators, board members and alumni;
- private-equity and infrastructure-fund dealmakers;
- named bankers, lawyers, lenders, diligence professionals and service providers.

For each person, classify expert_type and explain why the person matters to the supplied theme.
Create typed person-to-company and person-to-deal relationships using exact roles such as
founded, led, invested_in, advised_on, banked, legal_counsel, diligence_provider or board_member.
Extract companies that become interesting through those expert relationships.

When target_context includes missing_fact_types or requested_fact_types, facts are
the primary required output. Reason about those requested fields first, then return
each supported value in facts[] using the exact fact_type names requested, including
seed_round, last_funding, total_funding, launch_date, product_live_status, logo_url,
website, linkedin, or email. Use target_context.target_name as subject_name and
target_context.target_type as subject_type when available. Only add people or
companies if the source provides useful additional entities. If the source does not
support a requested fact, omit it rather than guessing.

Return strict JSON with keys: people, companies, relationships, facts, citations.
Do not return arrays of strings. Every item must be an object matching the key names in the request.
Only extract facts grounded in the supplied text. Do not invent URLs, dates, people or companies."""


class DeepSeekExtractor:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def extract(
        self,
        text: str,
        title: str | None,
        url: str | None,
        theme_id: str | None,
        objective: str | None = None,
        target_context: dict[str, Any] | None = None,
    ) -> ExtractionResult:
        if not self.settings.deepseek_api_key:
            return self._heuristic_extract(text, title, url, theme_id)

        prompt = {
            "theme_id": theme_id,
            "source_title": title,
            "source_url": url,
            "research_objective": objective,
            "target_context": target_context or {},
            "text": text[:18000],
        }
        async def _call():
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.deepseek.com/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                    json={
                        "model": self.settings.deepseek_model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": json.dumps(prompt)},
                        ],
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]

        raw = await _retry_with_backoff(_call)
        if not raw or not raw.strip():
            return self._heuristic_extract(text, title, url, theme_id)
        try:
            result = ExtractionResult.model_validate_json(raw)
            return self._apply_target_fact_context(result, target_context)
        except (ValueError, TypeError) as exc:
            logger.warning("Primary extraction parse failed: %s", exc, extra={"raw_preview": raw[:200]})
            try:
                parsed = json.loads(raw)
                result = ExtractionResult.model_validate(
                    self._normalize_extraction_payload(parsed, title, url, theme_id)
                )
                return self._apply_target_fact_context(result, target_context)
            except (ValueError, TypeError, json.JSONDecodeError) as exc2:
                logger.warning("Fallback extraction parse also failed: %s", exc2)
                return self._heuristic_extract(text, title, url, theme_id)

    async def synthesize(self, instruction: str, context: dict[str, Any]) -> str:
        if not self.settings.deepseek_api_key:
            return self._fallback_synthesis(instruction, context)

        async def _call():
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.deepseek.com/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                    json={
                        "model": self.settings.deepseek_model,
                        "messages": [
                            {"role": "system", "content": "Write concise, source-grounded investment research output. Do not invent facts."},
                            {
                                "role": "user",
                                "content": json.dumps(
                                    {"instruction": instruction, "context": context},
                                    default=str,
                                ),
                            },
                        ],
                    },
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]

        return await _retry_with_backoff(_call)

    def _heuristic_extract(self, text: str, title: str | None, url: str | None, theme_id: str | None) -> ExtractionResult:
        people = []
        companies = []
        relationships = []
        facts = []
        evidence = text[:400]
        names = sorted(set(re.findall(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", text)))[:5]
        orgs = sorted(set(re.findall(r"\b[A-Z][A-Za-z0-9&.\-]+(?: [A-Z][A-Za-z0-9&.\-]+){0,3}\b", text)))[:8]

        acquisition_patterns = [
            r"\b(?:acquires?|acquired|has acquired)\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)",
            r"\bacquisition of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)(?:\s+from|\s+for|\.|,|$)",
            r"\bsale of\s+([A-Z][A-Za-z0-9&.,' -]{2,80}?)\s+to\b",
        ]
        target_name = None
        for pattern in acquisition_patterns:
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match and match.group(1):
                target_name = match.group(1).strip(" ,.")
                break

        # Heuristic mode never auto-creates people — capitalized token pairs are too noisy for PE graphs.

        if target_name:
            companies.append(
                ExtractedCompany(
                    name=target_name,
                    category="target",
                    theme_ids=[theme_id] if theme_id else [],
                    description=f"Acquisition target mentioned in {title or 'uploaded source'}.",
                    confidence=0.72,
                )
            )

        for org in orgs:
            if org in names or len(org) < 4 or (target_name and org == target_name):
                continue
            companies.append(
                ExtractedCompany(
                    name=org,
                    category="target",
                    theme_ids=[theme_id] if theme_id else [],
                    description=f"Mentioned in {title or 'uploaded source'}.",
                    confidence=0.4,
                )
            )

        if people and companies:
            relationships.append(
                ExtractedRelationship(
                    from_name=people[0].name,
                    from_type="person",
                    to_name=companies[0].name,
                    to_type="company",
                    relationship_type="mentioned_in_same_source",
                    theme_id=theme_id,  # type: ignore[arg-type]
                    evidence_text=evidence,
                    confidence=0.35,
                )
            )

        if target_name:
            facts.append(
                ExtractedFact(
                    subject_name=target_name,
                    subject_type="company",
                    fact_type="target_company",
                    fact_value=target_name,
                    evidence_text=evidence,
                    theme_id=theme_id,  # type: ignore[arg-type]
                    confidence=0.72,
                )
            )

        if theme_id:
            facts.append(
                ExtractedFact(
                    subject_name=title or "source",
                    subject_type="theme",
                    fact_type="source_signal",
                    fact_value=evidence,
                    evidence_text=evidence,
                    theme_id=theme_id,  # type: ignore[arg-type]
                    confidence=0.4,
                )
            )

        return ExtractionResult(
            people=people,
            companies=companies,
            relationships=relationships,
            facts=facts,
            citations=[Citation(title=title or "Uploaded source", url=url, evidence=evidence)] if evidence else [],
        )

    def _normalize_extraction_payload(
        self,
        payload: Any,
        title: str | None,
        url: str | None,
        theme_id: str | None,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            payload = {}

        return {
            "people": [
                item
                for item in (
                    self._normalize_person(person, theme_id)
                    for person in self._as_list(payload.get("people"))
                )
                if item
            ],
            "companies": [
                item
                for item in (
                    self._normalize_company(company, theme_id)
                    for company in self._as_list(payload.get("companies"))
                )
                if item
            ],
            "relationships": [
                item
                for item in (
                    self._normalize_relationship(relationship, theme_id)
                    for relationship in self._as_list(payload.get("relationships"))
                )
                if item
            ],
            "facts": [
                item
                for item in (
                    self._normalize_fact(fact, title, theme_id)
                    for fact in self._as_list(payload.get("facts"))
                )
                if item
            ],
            "citations": [
                item
                for item in (
                    self._normalize_citation(citation, title, url)
                    for citation in self._as_list(payload.get("citations"))
                )
                if item
            ],
        }

    def _normalize_person(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            name = value.strip()
            data: dict[str, Any] = {"name": name}
        elif isinstance(value, dict):
            data = dict(value)
            name = self._first_text(data, "name", "person", "person_name", "full_name")
        else:
            return None
        if not name:
            return None
        return {
            "name": name,
            "headline": self._first_text(data, "headline", "title", "role"),
            "current_organization": self._first_text(
                data,
                "current_organization",
                "organization",
                "company",
                "firm",
                "current_employer",
            ),
            "expert_type": self._first_text(data, "expert_type", "type", "category") or "operator",
            "theme_ids": self._theme_ids(data, theme_id),
            "linkedin_url": self._first_text(data, "linkedin_url", "linkedin", "profile_url"),
            "website": self._first_text(data, "website", "url"),
            "summary": self._first_text(data, "summary", "description"),
            "why_relevant": self._first_text(data, "why_relevant", "relevance", "evidence"),
            "confidence": self._confidence(data),
        }

    def _normalize_company(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            name = value.strip()
            data: dict[str, Any] = {"name": name}
        elif isinstance(value, dict):
            data = dict(value)
            name = self._first_text(data, "name", "company", "organization", "target")
        else:
            return None
        if not name:
            return None
        return {
            "name": name,
            "category": self._first_text(data, "category", "type") or "target",
            "theme_ids": self._theme_ids(data, theme_id),
            "website": self._first_text(data, "website", "url"),
            "hq": self._first_text(data, "hq", "headquarters"),
            "description": self._first_text(data, "description", "summary"),
            "why_interesting": self._first_text(data, "why_interesting", "why_relevant", "evidence"),
            "confidence": self._confidence(data),
        }

    def _normalize_relationship(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        from_name = self._first_text(
            value,
            "from_name",
            "from",
            "from_entity",
            "person",
            "source",
            "organization",
        )
        to_name = self._first_text(
            value,
            "to_name",
            "to",
            "to_entity",
            "company",
            "target",
            "deal",
        )
        if not from_name or not to_name:
            return None
        return {
            "from_name": from_name,
            "from_type": self._entity_type(value.get("from_type"), fallback="person" if value.get("person") else "organization"),
            "to_name": to_name,
            "to_type": self._entity_type(value.get("to_type"), fallback="company" if value.get("company") else "organization"),
            "relationship_type": self._first_text(value, "relationship_type", "type", "role", "relationship") or "related_to",
            "theme_id": value.get("theme_id") or theme_id,
            "evidence_text": self._first_text(value, "evidence_text", "evidence", "description", "source") or f"{from_name} is related to {to_name}.",
            "confidence": self._confidence(value),
        }

    def _normalize_fact(self, value: Any, title: str | None, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            data: dict[str, Any] = {"fact_value": value}
        elif isinstance(value, dict):
            data = dict(value)
        else:
            return None
        fact_value = self._first_text(data, "fact_value", "fact", "value", "description", "evidence")
        if not fact_value:
            return None
        return {
            "subject_name": self._first_text(data, "subject_name", "subject", "name") or title or "source",
            "subject_type": self._entity_type(data.get("subject_type"), fallback="theme"),
            "fact_type": self._first_text(data, "fact_type", "type") or "source_signal",
            "fact_value": fact_value,
            "evidence_text": self._first_text(data, "evidence_text", "evidence", "source") or fact_value,
            "theme_id": data.get("theme_id") or theme_id,
            "confidence": self._confidence(data),
        }

    def _normalize_citation(self, value: Any, title: str | None, url: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            return {"title": title or value, "url": value if value.startswith("http") else url, "evidence": title or value}
        if not isinstance(value, dict):
            return None
        evidence = self._first_text(value, "evidence", "text", "quote", "snippet") or title
        return {
            "source_id": self._first_text(value, "source_id"),
            "title": self._first_text(value, "title", "source_title", "name") or title or "Source",
            "url": self._first_text(value, "url", "source_url") or url,
            "evidence": evidence or "Source cited by extraction.",
        }

    def _as_list(self, value: Any) -> list[Any]:
        return value if isinstance(value, list) else []

    def _first_text(self, data: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _theme_ids(self, data: dict[str, Any], theme_id: str | None) -> list[str]:
        value = data.get("theme_ids")
        if isinstance(value, list):
            return [item for item in value if isinstance(item, str)]
        value = data.get("theme_id")
        if isinstance(value, str):
            return [value]
        return [theme_id] if theme_id else []

    def _confidence(self, data: dict[str, Any]) -> float:
        value = data.get("confidence")
        if isinstance(value, int | float):
            return max(0.0, min(1.0, float(value)))
        return 0.7

    def _entity_type(self, value: Any, fallback: str) -> str:
        allowed = {"person", "company", "organization", "deal", "event", "theme", "relationship"}
        return value if isinstance(value, str) and value in allowed else fallback

    def _apply_target_fact_context(
        self,
        result: ExtractionResult,
        target_context: dict[str, Any] | None,
    ) -> ExtractionResult:
        if not target_context:
            return result
        requested = self._requested_fact_types(target_context)
        target_name = self._first_text(target_context, "target_name", "company_name", "expert_name")
        target_type = self._target_subject_type(target_context.get("target_type"))
        if not requested or not target_name:
            return result

        facts = []
        for fact in result.facts:
            normalized_type = fact.fact_type.strip().lower().replace("-", "_").replace(" ", "_")
            if normalized_type not in requested:
                facts.append(fact)
                continue
            facts.append(
                fact.model_copy(
                    update={
                        "subject_name": target_name,
                        "subject_type": target_type,
                        "fact_type": normalized_type,
                    }
                )
            )
        return result.model_copy(update={"facts": facts})

    def _requested_fact_types(self, target_context: dict[str, Any]) -> set[str]:
        raw = target_context.get("missing_fact_types") or target_context.get("requested_fact_types")
        if isinstance(raw, str):
            raw = [raw]
        if not isinstance(raw, list):
            raw = [target_context.get("missing_fact")]
        return {
            str(value).strip().lower().replace("-", "_").replace(" ", "_")
            for value in raw
            if isinstance(value, str) and value.strip()
        }

    def _target_subject_type(self, value: Any) -> str:
        if value == "expert":
            return "person"
        return self._entity_type(value, fallback="company")

    def _fallback_synthesis(self, instruction: str, context: dict[str, Any]) -> str:
        citations = context.get("citations") or []
        if not citations:
            return (
                "Structured synthesis is unavailable without DEEPSEEK_API_KEY. "
                "Use the ranked experts and citations from the baseline answer."
            )
        titles = [str(item.get("title") or "Source") for item in citations[:3]]
        return (
            f"Research surfaced {len(citations)} grounded source(s), including "
            f"{', '.join(titles)}. Review citations and ranked experts for call sequencing."
        )


extractor = DeepSeekExtractor()
