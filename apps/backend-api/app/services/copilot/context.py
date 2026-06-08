from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

VERBATIM_TURN_LIMIT = 4


@dataclass
class CopilotContext:
    question: str
    theme_id: str | None = None
    objective: str | None = None
    geography: str | None = None
    page_context: dict[str, Any] = field(default_factory=dict)
    prior_entity_ids: dict[str, list[str]] = field(default_factory=dict)
    baseline_summary: str | None = None
    ranked_expert_names: list[str] = field(default_factory=list)
    ranked_company_names: list[str] = field(default_factory=list)
    conversation_summary: str | None = None
    recent_turns: list[dict[str, str]] = field(default_factory=list)
    raw_message: str = ""

    def to_prompt_block(self) -> str:
        lines = [
            f"Question: {self.question}",
            f"Theme: {self.theme_id or 'all themes'}",
        ]
        if self.objective:
            lines.append(f"Session objective: {self.objective}")
        if self.geography:
            lines.append(f"Geography focus: {self.geography}")
        if self.page_context:
            lines.append(f"Page context: {json.dumps(self.page_context, ensure_ascii=True)}")
        if self.prior_entity_ids:
            lines.append(f"Prior entity IDs: {json.dumps(self.prior_entity_ids, ensure_ascii=True)}")
        if self.baseline_summary:
            lines.append(f"Directory baseline summary: {self.baseline_summary}")
        if self.ranked_expert_names:
            lines.append(f"Baseline ranked experts: {', '.join(self.ranked_expert_names[:5])}")
        if self.ranked_company_names:
            lines.append(f"Baseline ranked companies: {', '.join(self.ranked_company_names[:5])}")
        if self.conversation_summary:
            lines.append(f"Prior conversation summary: {self.conversation_summary}")
        if self.recent_turns:
            lines.append(
                "Recent turns: "
                + json.dumps(self.recent_turns[: VERBATIM_TURN_LIMIT], ensure_ascii=True)
            )
        return "\n".join(lines)

    def search_query(self) -> str:
        return self.question.strip()


def parse_message(message: str, theme_id: str | None = None) -> CopilotContext:
    raw = message.strip()
    try:
        payload = json.loads(raw)
        if isinstance(payload, dict):
            question = str(payload.get("question") or payload.get("query") or raw)
            return CopilotContext(
                question=question,
                theme_id=payload.get("theme_id") or theme_id,
                objective=payload.get("objective"),
                geography=payload.get("geography"),
                page_context=_as_dict(payload.get("page_context")),
                prior_entity_ids=_as_entity_ids(payload.get("prior_entity_ids")),
                baseline_summary=payload.get("baseline_summary"),
                ranked_expert_names=_as_str_list(payload.get("ranked_expert_names")),
                ranked_company_names=_as_str_list(payload.get("ranked_company_names")),
                conversation_summary=_as_optional_str(payload.get("conversation_summary")),
                recent_turns=_as_recent_turns(payload.get("recent_turns")),
                raw_message=raw,
            )
    except json.JSONDecodeError:
        pass

    return CopilotContext(question=raw, theme_id=theme_id, raw_message=raw)


def extract_url(text: str) -> str | None:
    for part in text.split():
        if part.startswith("http://") or part.startswith("https://"):
            return part.rstrip(").,;")
    match = re.search(r"https?://[^\s)>,;]+", text)
    return match.group(0).rstrip(").,;") if match else None


def extract_person_name(text: str) -> str | None:
    match = re.search(
        r"\b(?:email|outreach|draft)\s+(?:to\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        text,
    )
    return match.group(1) if match else None


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def _as_recent_turns(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    turns: list[dict[str, str]] = []
    for item in value[:VERBATIM_TURN_LIMIT]:
        if not isinstance(item, dict):
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        role = str(item.get("role") or "user")
        turns.append({"role": "assistant" if role == "assistant" else "user", "content": content[:1200]})
    return turns


def _as_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if isinstance(item, str) and item.strip()]


def _as_entity_ids(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, dict):
        return {}
    result: dict[str, list[str]] = {}
    for key in ("expert_ids", "company_ids"):
        items = value.get(key)
        if isinstance(items, list):
            result[key] = [str(item) for item in items if item]
    return result
