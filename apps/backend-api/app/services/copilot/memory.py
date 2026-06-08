from __future__ import annotations

import json
import re

from app.services.deepseek_llm import FLASH_MODEL, llm

MEMORY_SYSTEM = """You compress TowerBrook PE research copilot threads for continuation.
Keep only what matters for the next user question:
- user goals and decisions
- named experts, companies, themes, deals
- open questions and follow-ups agreed
- disconfirming risks or thesis shifts

Use short bullet lines. No JSON. No preamble. Max 14 bullets."""


def _truncate(text: str, limit: int) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) <= limit:
        return clean
    return f"{clean[: limit - 1].rstrip()}…"


def heuristic_summarize(prior_summary: str | None, pairs: list[dict[str, str]]) -> str:
    bullets: list[str] = []
    if prior_summary and prior_summary.strip():
        bullets.append(prior_summary.strip())
    for pair in pairs:
        user = _truncate(str(pair.get("user") or ""), 140)
        assistant = _truncate(str(pair.get("assistant") or ""), 200)
        bullets.append(f"- User: {user} → Copilot: {assistant}")
    return "\n".join(bullets)[:1800]


async def summarize_conversation(
    prior_summary: str | None,
    pairs: list[dict[str, str]],
) -> str:
    if not pairs:
        return (prior_summary or "").strip()

    if not llm.configured:
        return heuristic_summarize(prior_summary, pairs)

    payload = {
        "prior_summary": prior_summary or "",
        "turns_to_merge": pairs,
    }
    try:
        text = await llm.complete(
            MEMORY_SYSTEM,
            json.dumps(payload, ensure_ascii=False),
            model=FLASH_MODEL,
            max_tokens=500,
            temperature=0.1,
        )
        cleaned = text.strip()
        if cleaned:
            return cleaned[:1800]
    except Exception:
        pass

    return heuristic_summarize(prior_summary, pairs)
