from __future__ import annotations

import json

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.claim_verification import verify_synthesis
from app.services.copilot.context import CopilotContext
from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.prompts import INTENT_SYNTHESIS_PROMPTS, SYNTHESIS_BASE
from app.services.deepseek_extractor import extractor
from app.services.deepseek_llm import llm


def _trim_synthesis(synthesis: CopilotSynthesis, intent: str = "") -> CopilotSynthesis:
    summary = synthesis.answer_summary.strip()
    max_len = 1400 if intent == "draft_outreach" else 420
    if len(summary) > max_len:
        summary = f"{summary[: max_len - 3].rstrip()}..."
    return CopilotSynthesis(
        answer_summary=summary,
        key_findings=synthesis.key_findings[:2],
        gaps=synthesis.gaps[:2],
        risks=synthesis.risks[:1],
        follow_ups=synthesis.follow_ups[:3],
        uncertainty_notes=synthesis.uncertainty_notes[:200].strip(),
    )


def _parse_fallback_synthesis(raw: str) -> CopilotSynthesis | None:
    text = raw.strip()
    if not text.startswith("{"):
        return None
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        payload = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, dict):
        return None
    summary = payload.get("answer_summary")
    if not isinstance(summary, str) or not summary.strip():
        return None
    return CopilotSynthesis(
        answer_summary=summary.strip(),
        key_findings=[str(item) for item in payload.get("key_findings") or [] if item][:2],
        gaps=[str(item) for item in payload.get("gaps") or [] if item][:2],
        risks=[str(item) for item in payload.get("risks") or [] if item][:1],
        follow_ups=[str(item) for item in payload.get("follow_ups") or [] if item][:3],
        uncertainty_notes=str(payload.get("uncertainty_notes") or "Fallback synthesis path used.")[:200],
    )


async def draft_synthesis(
    ctx: CopilotContext,
    intent: str,
    model: str,
    citations: list[Citation],
    tool_calls: list[ToolTrace],
) -> CopilotSynthesis:
    instruction = INTENT_SYNTHESIS_PROMPTS.get(intent, INTENT_SYNTHESIS_PROMPTS["find_experts"])
    user_payload = {
        "context": ctx.to_prompt_block(),
        "intent": intent,
        "citations": [c.model_dump(mode="json") for c in citations[:10]],
        "tool_trace": [t.model_dump(mode="json") for t in tool_calls],
    }
    user_json = json.dumps(user_payload, ensure_ascii=False)

    synthesis: CopilotSynthesis | None = None
    if llm.configured:
        try:
            synthesis = await llm.structured(
                f"{SYNTHESIS_BASE}\n\n{instruction}",
                user_json,
                CopilotSynthesis,
                model=model,
                max_tokens=900 if model.endswith("pro") else 600,
            )
        except Exception:
            synthesis = None

    if synthesis is None:
        prose = await extractor.synthesize(
            f"{SYNTHESIS_BASE}\n\n{instruction}",
            user_payload,
        )
        parsed = _parse_fallback_synthesis(prose)
        if parsed is not None:
            synthesis = parsed
        else:
            max_len = 1400 if intent == "draft_outreach" else 420
            synthesis = CopilotSynthesis(
                answer_summary=prose[:max_len],
                key_findings=[],
                gaps=[],
                risks=[],
                follow_ups=[],
                uncertainty_notes="Fallback synthesis path used.",
            )

    return _trim_synthesis(synthesis, intent)


def verify_answer_synthesis(
    synthesis: CopilotSynthesis,
    citations: list[Citation],
    intent: str,
) -> tuple[CopilotSynthesis, list[str]]:
    verified, warnings = verify_synthesis(synthesis, citations)
    if warnings:
        verified.uncertainty_notes = (
            f"{verified.uncertainty_notes} {'; '.join(warnings[:3])}".strip()
        )
    return _trim_synthesis(verified, intent), warnings


async def synthesize_answer(
    ctx: CopilotContext,
    intent: str,
    model: str,
    citations: list[Citation],
    tool_calls: list[ToolTrace],
) -> CopilotSynthesis:
    synthesis = await draft_synthesis(ctx, intent, model, citations, tool_calls)
    verified, _warnings = verify_answer_synthesis(synthesis, citations, intent)
    return verified
