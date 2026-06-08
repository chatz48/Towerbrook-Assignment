import asyncio

from app.services.copilot.context import CopilotContext, parse_message
from app.services.copilot.intent import _heuristic_route, route_intent
from app.services.copilot.tools import INTENT_TOOL_PIPELINES, resolve_tools


def test_heuristic_intent_red_team():
    ctx = parse_message("Red-team the grid interconnection thesis", "grid-infrastructure")
    routed = _heuristic_route(ctx)
    assert routed.intent == "red_team"
    assert "pro" in routed.model


def test_parse_structured_message():
    payload = '{"question":"Who should I call?","theme_id":"smart-water","objective":"Find experts"}'
    ctx = parse_message(payload, None)
    assert ctx.question == "Who should I call?"
    assert ctx.theme_id == "smart-water"
    assert ctx.objective == "Find experts"


def test_intent_tool_pipelines_cover_all_intents():
    assert set(INTENT_TOOL_PIPELINES.keys()) == {
        "find_experts",
        "map_companies",
        "red_team",
        "build_call_plan",
        "market_research",
        "deep_discovery",
        "draft_outreach",
        "generate_report",
        "source_analysis",
    }


def test_route_intent_without_llm():
    ctx = parse_message("Draft outreach email to Jane Smith", None)
    routed = asyncio.run(route_intent(ctx))
    assert routed.intent == "draft_outreach"
    assert "draft_email" in routed.tools


def test_default_pipelines_skip_web_search():
    assert "web_search" not in INTENT_TOOL_PIPELINES["find_experts"]
    assert "web_search" not in INTENT_TOOL_PIPELINES["map_companies"]
    assert "web_search" not in INTENT_TOOL_PIPELINES["red_team"]


def test_web_search_only_when_explicitly_requested():
    ctx = CopilotContext(question="Who should I call about PJM interconnection?")
    tools = resolve_tools("find_experts", ctx)
    assert "web_search" not in tools

    explicit = CopilotContext(question="Search the web for recent PJM interconnection news")
    tools = resolve_tools("find_experts", explicit)
    assert "web_search" in tools


def test_baseline_enrichment_uses_single_rag_pass():
    ctx = CopilotContext(
        question="Who should I call?",
        baseline_summary="Directory already ranked three grid experts.",
    )
    tools = resolve_tools("find_experts", ctx)
    assert tools == ["rag_search_sources"]
