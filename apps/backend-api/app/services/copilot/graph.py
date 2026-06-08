from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.context import CopilotContext
from app.services.copilot.intent import RoutedIntent, route_intent
from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.synthesis import draft_synthesis, verify_answer_synthesis
from app.services.copilot.tools import run_pipeline


class CopilotState(TypedDict, total=False):
    ctx: CopilotContext
    tools_hint: list[str]
    routed: RoutedIntent
    citations: list[Citation]
    tool_calls: list[ToolTrace]
    synthesis: CopilotSynthesis
    answer: str
    structured: dict[str, Any]
    confidence: float
    intent: str
    model_used: str
    verification_warnings: list[str]


async def _node_route(state: CopilotState) -> CopilotState:
    ctx = state["ctx"]
    routed = await route_intent(ctx, state.get("tools_hint"))
    return {
        "routed": routed,
        "intent": routed.intent,
        "model_used": routed.model,
    }


async def _node_research(state: CopilotState) -> CopilotState:
    routed = state["routed"]
    ctx = state["ctx"]
    query = routed.search_queries[0] if routed.search_queries else ctx.search_query()
    citations, tool_calls = await run_pipeline(routed.tools, ctx, query)
    return {"citations": citations, "tool_calls": tool_calls}


async def _node_synthesize(state: CopilotState) -> CopilotState:
    from app.services.copilot.tools import compute_confidence

    routed = state["routed"]
    ctx = state["ctx"]
    citations = state.get("citations") or []
    tool_calls = state.get("tool_calls") or []
    synthesis = await draft_synthesis(
        ctx,
        routed.intent,
        routed.model,
        citations,
        tool_calls,
    )
    confidence = compute_confidence(citations, tool_calls)
    return {
        "synthesis": synthesis,
        "confidence": confidence,
    }


async def _node_verify(state: CopilotState) -> CopilotState:
    routed = state["routed"]
    citations = state.get("citations") or []
    synthesis = state["synthesis"]
    verified, warnings = verify_answer_synthesis(synthesis, citations, routed.intent)
    return {
        "synthesis": verified,
        "structured": verified.model_dump(),
        "answer": verified.answer_summary,
        "verification_warnings": warnings,
    }


def _build_graph() -> Any:
    graph = StateGraph(CopilotState)
    graph.add_node("route", _node_route)
    graph.add_node("research", _node_research)
    graph.add_node("synthesize", _node_synthesize)
    graph.add_node("verify", _node_verify)
    graph.add_edge(START, "route")
    graph.add_edge("route", "research")
    graph.add_edge("research", "synthesize")
    graph.add_edge("synthesize", "verify")
    graph.add_edge("verify", END)
    return graph.compile()


_copilot_graph = _build_graph()


def get_copilot_graph() -> Any:
    return _copilot_graph
