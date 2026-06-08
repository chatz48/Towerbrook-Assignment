from __future__ import annotations

import logging
from dataclasses import dataclass

from app.services.copilot.context import CopilotContext
from app.services.copilot.prompts import INTENT_ROUTER_SYSTEM
from app.services.copilot.tools import (
    INTENT_TOOL_PIPELINES,
    requests_web_search,
    resolve_tools,
)
from app.services.deepseek_llm import FLASH_MODEL, PRO_MODEL, llm

logger = logging.getLogger("towerbrook.copilot.intent")

VALID_INTENTS = frozenset(INTENT_TOOL_PIPELINES.keys())


@dataclass
class RoutedIntent:
    intent: str
    complexity: str
    model: str
    tools: list[str]
    search_queries: list[str]
    reasoning: str


def _match_intent_heuristic(ctx: CopilotContext) -> str | None:
    q = ctx.question.lower()
    if any(k in q for k in ("red team", "red-team", "disconfirm", "bear case")):
        return "red_team"
    if any(k in q for k in ("memo", "report")):
        return "generate_report"
    if any(k in q for k in ("email", "outreach")):
        return "draft_outreach"
    if any(k in q for k in ("dig deeper", "deep discovery", "find more")):
        return "deep_discovery"
    if "http://" in q or "https://" in q:
        return "source_analysis"
    if any(k in q for k in ("company", "companies", "target")):
        return "map_companies"
    if any(k in q for k in ("call plan", "sequence", "three-call")):
        return "build_call_plan"
    if any(k in q for k in ("market", "buyer", "sector trend")):
        return "market_research"
    return None


def _needs_llm_routing(ctx: CopilotContext) -> bool:
    if _match_intent_heuristic(ctx):
        return False
    q = ctx.question.lower()
    signals = [
        any(k in q for k in ("expert", "who should", "call")),
        any(k in q for k in ("company", "companies", "target")),
        any(k in q for k in ("market", "sector", "buyer")),
        any(k in q for k in ("email", "outreach", "memo", "report")),
        "http://" in q or "https://" in q,
    ]
    if sum(signals) >= 2:
        return True
    return len(ctx.question.split()) > 45


def _complexity_for(intent: str, ctx: CopilotContext) -> str:
    if intent in {"red_team", "generate_report"}:
        return "high"
    if intent == "market_research" and requests_web_search(ctx):
        return "high"
    return "low"


def _build_routed(
    intent: str,
    ctx: CopilotContext,
    tools_hint: list[str] | None,
    reasoning: str,
    search_queries: list[str] | None = None,
) -> RoutedIntent:
    complexity = _complexity_for(intent, ctx)
    model = PRO_MODEL if complexity == "high" else FLASH_MODEL
    return RoutedIntent(
        intent=intent,
        complexity=complexity,
        model=model,
        tools=resolve_tools(intent, ctx, tools_hint),
        search_queries=search_queries or [ctx.search_query()],
        reasoning=reasoning,
    )


def _heuristic_route(ctx: CopilotContext) -> RoutedIntent:
    intent = _match_intent_heuristic(ctx) or "find_experts"
    return _build_routed(
        intent,
        ctx,
        tools_hint=None,
        reasoning="Heuristic intent routing (DeepSeek unavailable).",
    )


async def route_intent(ctx: CopilotContext, tools_hint: list[str] | None = None) -> RoutedIntent:
    if tools_hint:
        intent = _intent_from_tools(tools_hint)
        return _build_routed(
            intent,
            ctx,
            tools_hint,
            reasoning="Explicit tools hint from client.",
        )

    if not llm.configured or not _needs_llm_routing(ctx):
        matched = _match_intent_heuristic(ctx)
        intent = matched or "find_experts"
        return _build_routed(
            intent,
            ctx,
            tools_hint=None,
            reasoning="Fast heuristic routing." if matched else "Default expert lookup routing.",
        )

    try:
        parsed = await llm.parse_json(
            INTENT_ROUTER_SYSTEM,
            ctx.to_prompt_block(),
            model=FLASH_MODEL,
        )
        intent = str(parsed.get("intent") or "find_experts")
        if intent not in VALID_INTENTS:
            intent = "find_experts"
        queries = parsed.get("search_queries")
        search_queries = [str(q) for q in queries[:2]] if isinstance(queries, list) and queries else [ctx.search_query()]
        return _build_routed(
            intent,
            ctx,
            tools_hint=None,
            reasoning=str(parsed.get("reasoning") or ""),
            search_queries=search_queries,
        )
    except Exception:
        logger.exception("Intent routing failed; using heuristic fallback")
        return _heuristic_route(ctx)


def _intent_from_tools(tools: list[str]) -> str:
    if "generate_report" in tools:
        return "generate_report"
    if "draft_email" in tools:
        return "draft_outreach"
    if "run_deep_discovery" in tools:
        return "deep_discovery"
    if "fetch_source" in tools:
        return "source_analysis"
    return "find_experts"
