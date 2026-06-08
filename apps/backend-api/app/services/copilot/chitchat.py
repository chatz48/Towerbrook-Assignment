from __future__ import annotations

import json

from app.services.deepseek_llm import FLASH_MODEL, llm

CHITCHAT_SYSTEM = """You are Expert Engine Copilot for TowerBrook — a people-intelligence workflow for thematic PE sourcing.

Reply in 1–3 short sentences. Tone: friendly, professional, concise.
You help users find experts, map actionable companies, explore the relationship graph, build call plans, and draft outreach from a curated directory.
If asked what you can do, mention experts, targets, warm paths, call plans, and memos — not live market news or investor sentiment.
Do not invent expert names, companies, or deals. Do not write long paragraphs or bullet lists unless the user explicitly asks."""


def _format_turns(recent_turns: list[dict[str, str]]) -> str:
    if not recent_turns:
        return ""
    lines = []
    for turn in recent_turns[-4:]:
        role = str(turn.get("role") or "user").lower()
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content}")
    return "\n".join(lines)


def _fallback_reply(question: str) -> str:
    q = question.lower()
    if any(g in q for g in ("thank", "thanks")):
        return "You're welcome — ask anytime you want help ranking experts, mapping targets, or drafting a call plan."
    if any(g in q for g in ("hello", "hi", "hey", "good morning", "good afternoon")):
        return (
            "Hello — I'm Expert Engine Copilot. I can help you find experts, map targets, "
            "and build call plans from TowerBrook's sourced directory. What would you like to explore?"
        )
    return (
        "I'm here to help with expert sourcing, company mapping, call plans, and outreach drafts. "
        "What would you like to work on?"
    )


async def reply_chitchat(
    question: str,
    *,
    conversation_summary: str | None = None,
    recent_turns: list[dict[str, str]] | None = None,
    theme_scope: str | None = None,
) -> tuple[str, str]:
    if not llm.configured:
        return _fallback_reply(question), "deterministic-fallback"

    payload = {
        "question": question.strip(),
        "theme_scope": theme_scope or "all themes",
        "conversation_summary": conversation_summary or "",
        "recent_turns": _format_turns(recent_turns or []),
    }
    try:
        text = await llm.complete(
            CHITCHAT_SYSTEM,
            json.dumps(payload, ensure_ascii=False),
            model=FLASH_MODEL,
            max_tokens=180,
            temperature=0.35,
        )
        cleaned = text.strip()
        if cleaned:
            return cleaned[:900], FLASH_MODEL
    except Exception:
        pass

    return _fallback_reply(question), "deterministic-fallback"
