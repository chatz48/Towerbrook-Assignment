from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.schemas.domain import ExtractionResult, SourceRecord
from app.services.search_query_utils import join_quoted, unique_strings


PROFILE_FIELDS = (
    "identity",
    "current_role",
    "official_profile",
    "deal_connection",
    "company_connections",
    "outreach_signal",
)


@dataclass
class ProfileCoverage:
    target_name: str
    target_organizations: list[str] = field(default_factory=list)
    target_deals: list[dict[str, Any]] = field(default_factory=list)
    target_companies: list[str] = field(default_factory=list)
    fields: dict[str, bool] = field(default_factory=lambda: {key: False for key in PROFILE_FIELDS})
    evidence: dict[str, list[dict[str, str | None]]] = field(
        default_factory=lambda: {key: [] for key in PROFILE_FIELDS}
    )
    seen_urls: set[str] = field(default_factory=set)

    @property
    def score(self) -> float:
        completed = sum(1 for value in self.fields.values() if value)
        return round(completed / len(PROFILE_FIELDS), 2)

    @property
    def missing_fields(self) -> list[str]:
        return [field_name for field_name, value in self.fields.items() if not value]

    @property
    def complete(self) -> bool:
        required = {"identity", "current_role", "deal_connection", "company_connections"}
        return required.issubset({key for key, value in self.fields.items() if value})


def build_initial_profile_queries(metadata: dict[str, Any]) -> list[str]:
    name = metadata.get("target_name")
    if not isinstance(name, str) or not name.strip():
        return []

    organizations = _list_text(metadata.get("target_organizations"))
    companies = _list_text(metadata.get("target_companies"))
    deals = _deal_names(metadata.get("target_deals"))
    themes = _list_text(metadata.get("target_themes"))

    return unique_strings(
        [
            join_quoted([name, *organizations], "profile OR bio OR biography OR LinkedIn"),
            join_quoted([name, *organizations], "partner OR managing director OR director OR advisor"),
            join_quoted([name, *deals[:2], *companies[:2]], "deal OR transaction OR advised OR counsel OR investment"),
            join_quoted([name, *companies[:2], *themes[:2]], "board OR founder OR investor OR advisor OR portfolio"),
        ]
    )


def build_follow_up_profile_queries(coverage: ProfileCoverage) -> list[str]:
    name = coverage.target_name
    organizations = coverage.target_organizations
    companies = coverage.target_companies
    deals = _deal_names(coverage.target_deals)
    queries: list[str] = []

    if "official_profile" in coverage.missing_fields:
        queries.extend(
            [
                join_quoted([name, *organizations[:1]], "site:*.com profile bio"),
                join_quoted([name, *organizations[:1]], "LinkedIn"),
            ]
        )
    if "current_role" in coverage.missing_fields:
        queries.append(join_quoted([name, *organizations], "current role partner director managing"))
    if "deal_connection" in coverage.missing_fields:
        queries.append(join_quoted([name, *deals[:2], *organizations[:1]], "transaction deal advised counsel"))
    if "company_connections" in coverage.missing_fields:
        queries.append(join_quoted([name, *companies[:3]], "company board advisor founder investor"))
    if "outreach_signal" in coverage.missing_fields:
        queries.append(join_quoted([name, *organizations[:1]], "email contact speaker podcast conference"))

    return unique_strings(queries)


def create_profile_coverage(metadata: dict[str, Any]) -> ProfileCoverage:
    return ProfileCoverage(
        target_name=str(metadata.get("target_name") or ""),
        target_organizations=_list_text(metadata.get("target_organizations")),
        target_deals=[
            deal for deal in metadata.get("target_deals", []) if isinstance(deal, dict)
        ],
        target_companies=_list_text(metadata.get("target_companies")),
    )


def update_profile_coverage(
    coverage: ProfileCoverage,
    extraction: ExtractionResult,
    source: SourceRecord,
) -> None:
    if source.url:
        coverage.seen_urls.add(source.url)

    query = ""
    if isinstance(source.metadata, dict):
        query = str(source.metadata.get("query") or "")
    source_text = f"{source.title} {source.url or ''} {query}".casefold()
    source_ref = {"title": source.title, "url": source.url}
    target_in_source = coverage.target_name.casefold() in source_text
    target_tokens = [
        *coverage.target_organizations,
        *coverage.target_companies,
        *_deal_names(coverage.target_deals),
    ]
    cooccurring_target = any(token.casefold() in source_text for token in target_tokens)
    if target_in_source:
        _mark(coverage, "identity", source_ref)
    if target_in_source and "linkedin.com/in/" in source_text:
        _mark(coverage, "official_profile", source_ref)
    if "linkedin.com/in/" in source_text or any(token in source_text for token in ("profile", "bio")):
        _mark(coverage, "official_profile", source_ref)
    if target_in_source and cooccurring_target:
        _mark(coverage, "company_connections", source_ref)
    if target_in_source and any(
        word in source_text for word in ("deal", "transaction", "advised", "counsel", "investment")
    ):
        _mark(coverage, "deal_connection", source_ref)

    for person in extraction.people:
        if not _same_person(person.name, coverage.target_name):
            continue
        _mark(coverage, "identity", source_ref)
        if person.current_organization or person.headline:
            _mark(coverage, "current_role", source_ref)
        if person.linkedin_url or person.website:
            _mark(coverage, "official_profile", source_ref)
        if person.summary or person.why_relevant:
            _mark(coverage, "outreach_signal", source_ref)

    for relationship in extraction.relationships:
        relation_blob = " ".join(
            [
                relationship.from_name,
                relationship.to_name,
                relationship.relationship_type,
                relationship.evidence_text,
            ]
        ).casefold()
        if coverage.target_name.casefold() not in relation_blob:
            continue
        if any(token.casefold() in relation_blob for token in target_tokens):
            _mark(coverage, "company_connections", source_ref)
        if any(word in relation_blob for word in ("deal", "transaction", "advised", "counsel", "invested")):
            _mark(coverage, "deal_connection", source_ref)

    for fact in extraction.facts:
        fact_blob = " ".join(
            [fact.subject_name, fact.fact_type, fact.fact_value, fact.evidence_text]
        ).casefold()
        if coverage.target_name.casefold() not in fact_blob:
            continue
        if any(word in fact_blob for word in ("deal", "transaction", "advised", "counsel", "investment")):
            _mark(coverage, "deal_connection", source_ref)
        if any(token.casefold() in fact_blob for token in target_tokens):
            _mark(coverage, "company_connections", source_ref)


def _mark(coverage: ProfileCoverage, field_name: str, source_ref: dict[str, str | None]) -> None:
    coverage.fields[field_name] = True
    if source_ref not in coverage.evidence[field_name]:
        coverage.evidence[field_name].append(source_ref)


def _same_person(name: str, target_name: str) -> bool:
    return name.casefold() == target_name.casefold()


def _deal_names(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    names = []
    for item in value:
        if isinstance(item, dict):
            names.extend(
                str(item[key])
                for key in ("deal_name", "target", "organization")
                if item.get(key)
            )
        elif isinstance(item, str):
            names.append(item)
    return unique_strings(names)


def _list_text(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item.strip()]

