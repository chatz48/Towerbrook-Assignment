from __future__ import annotations

import asyncio
from typing import Any

from app.repositories.supabase_repo import repo
from app.schemas.domain import Citation, ReportRequest, ResearchJobRequest, ToolTrace
from app.services.copilot.context import CopilotContext, extract_person_name, extract_url
from app.services.email_drafter import draft_email
from app.services.embeddings_bge import embeddings
from app.services.keiro_search import keiro
from app.services.report_generator import generate_report
from app.services.url_safety import is_safe_fetch_url

# Intent → minimal directory-first pipeline. Live web search is opt-in only (see resolve_tools).
INTENT_TOOL_PIPELINES: dict[str, list[str]] = {
    "find_experts": ["rag_search_entities", "rag_search_sources"],
    "map_companies": ["rag_search_entities", "rag_search_sources"],
    "red_team": ["rag_search_sources", "rag_search_entities"],
    "build_call_plan": ["rag_search_entities", "rag_search_sources"],
    "market_research": ["rag_search_sources"],
    "deep_discovery": ["run_deep_discovery", "rag_search_sources"],
    "draft_outreach": ["rag_search_entities", "draft_email"],
    "generate_report": ["rag_search_sources", "generate_report"],
    "source_analysis": ["fetch_source", "rag_search_sources"],
}

PRO_INTENTS = frozenset({"red_team", "generate_report"})

WEB_SEARCH_PHRASES = (
    "search the web",
    "web search",
    "search online",
    "look online",
    "google ",
    "find online",
    "live web",
    "internet search",
    "recent news",
    "latest news",
    "current news",
    "news about",
)

LINKEDIN_PHRASES = ("linkedin", "linked in", "linked-in")

# When the web client already sent a directory baseline, one light RAG pass is enough.
BASELINE_ENRICHMENT_INTENTS = frozenset({"find_experts", "map_companies", "build_call_plan"})


def requests_web_search(ctx: CopilotContext) -> bool:
    q = ctx.question.lower()
    return any(phrase in q for phrase in WEB_SEARCH_PHRASES)


def requests_linkedin_search(ctx: CopilotContext) -> bool:
    q = ctx.question.lower()
    return any(phrase in q for phrase in LINKEDIN_PHRASES)


def resolve_tools(
    intent: str,
    ctx: CopilotContext,
    tools_hint: list[str] | None = None,
) -> list[str]:
    if tools_hint:
        return list(dict.fromkeys(tools_hint))

    tools = list(INTENT_TOOL_PIPELINES.get(intent, INTENT_TOOL_PIPELINES["find_experts"]))

    if ctx.baseline_summary and intent in BASELINE_ENRICHMENT_INTENTS:
        tools = ["rag_search_sources"]

    if requests_web_search(ctx) and "web_search" not in tools:
        tools = [*tools, "web_search"]

    if intent == "draft_outreach" and requests_linkedin_search(ctx) and "linkedin_link_search" not in tools:
        tools = ["linkedin_link_search", *tools]

    return tools


async def run_tool(
    tool_name: str,
    ctx: CopilotContext,
    citations: list[Citation],
    search_query: str,
) -> ToolTrace:
    if tool_name == "rag_search_sources":
        return await _rag_search_sources(ctx, citations, search_query)
    if tool_name == "rag_search_entities":
        return await _rag_search_entities(ctx, citations, search_query)
    if tool_name == "web_search":
        return await _web_search(ctx, citations, search_query)
    if tool_name == "fetch_source":
        return await _fetch_source(ctx, citations)
    if tool_name == "generate_report":
        return await _generate_report(ctx, citations)
    if tool_name == "run_deep_discovery":
        return await _run_deep_discovery(ctx)
    if tool_name == "linkedin_link_search":
        return await _linkedin_search(ctx, search_query)
    if tool_name == "draft_email":
        return await _draft_email(ctx, citations)
    return ToolTrace(tool_name=tool_name, input={}, output={"error": "unknown tool"}, status="skipped")


async def run_pipeline(
    tools: list[str],
    ctx: CopilotContext,
    search_query: str,
) -> tuple[list[Citation], list[ToolTrace]]:
    citations: list[Citation] = []
    traces: list[ToolTrace] = []
    # Run independent retrieval tools in parallel for latency.
    retrieval = [t for t in tools if t in {"rag_search_sources", "rag_search_entities", "web_search"}]
    sequential = [t for t in tools if t not in retrieval]

    if retrieval:
        results = await asyncio.gather(
            *[run_tool(name, ctx, citations, search_query) for name in retrieval],
            return_exceptions=True,
        )
        for name, item in zip(retrieval, results, strict=True):
            if isinstance(item, ToolTrace):
                traces.append(item)
            elif isinstance(item, BaseException):
                traces.append(
                    ToolTrace(
                        tool_name=name,
                        input={"query": search_query},
                        output={"error": str(item)[:300]},
                        status="failed",
                    )
                )

    for name in sequential:
        trace = await run_tool(name, ctx, citations, search_query)
        traces.append(trace)

    return citations[:12], traces


async def _rag_search_sources(ctx: CopilotContext, citations: list[Citation], query: str) -> ToolTrace:
    if not embeddings.semantic_search_available:
        return ToolTrace(
            tool_name="rag_search_sources",
            input={"theme_id": ctx.theme_id, "skipped": "hash embeddings — Keiro preferred"},
            output={"count": 0},
            status="skipped",
        )
    rows = repo.search_sources(embeddings.embed(query), ctx.theme_id, limit=6)
    for row in rows:
        citations.append(
            Citation(
                source_id=str(row.get("source_id") or ""),
                title=row.get("title") or "Source chunk",
                url=row.get("url"),
                evidence=(row.get("content") or "")[:500],
            )
        )
    return ToolTrace(
        tool_name="rag_search_sources",
        input={"theme_id": ctx.theme_id, "query": query},
        output={"count": len(rows)},
    )


async def _rag_search_entities(ctx: CopilotContext, citations: list[Citation], query: str) -> ToolTrace:
    if not embeddings.semantic_search_available:
        return ToolTrace(
            tool_name="rag_search_entities",
            input={"skipped": "hash embeddings"},
            output={"count": 0},
            status="skipped",
        )
    rows = repo.search_entities(embeddings.embed(query), None, limit=6)
    for row in rows:
        citations.append(
            Citation(
                source_id=str(row.get("id") or row.get("entity_id") or ""),
                title=row.get("name") or "Entity match",
                url=row.get("url"),
                evidence=str(row.get("summary") or row.get("description") or row.get("why_relevant") or "")[:500],
            )
        )
    return ToolTrace(
        tool_name="rag_search_entities",
        input={"query": query},
        output={"count": len(rows), "entities": rows[:3]},
    )


async def _web_search(ctx: CopilotContext, citations: list[Citation], query: str) -> ToolTrace:
    from app.config import get_settings

    settings = get_settings()
    provider = "keiro" if settings.keirolabs_api_key else "fallback"
    results = await keiro.search(query, limit=3)
    for item in results:
        metadata = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        item_provider = metadata.get("provider") or provider
        citations.append(
            Citation(
                title=item.get("title") or "Web result",
                url=item.get("url"),
                evidence=(item.get("snippet") or item.get("content") or "")[:500],
            )
        )
    return ToolTrace(
        tool_name="web_search",
        input={"query": query, "provider": provider},
        output={"count": len(results), "provider": provider, "keiro_live": bool(settings.keirolabs_api_key)},
    )


async def _fetch_source(ctx: CopilotContext, citations: list[Citation]) -> ToolTrace:
    url = extract_url(ctx.raw_message) or extract_url(ctx.question)
    if url and not is_safe_fetch_url(url):
        return ToolTrace(tool_name="fetch_source", input={"url": url}, output={"error": "URL blocked"}, status="failed")
    fetched: dict[str, Any] = await keiro.fetch_content(url) if url else {"error": "No URL found"}
    if fetched.get("content"):
        citations.append(
            Citation(
                title=fetched.get("title") or url or "Fetched source",
                url=url,
                evidence=str(fetched.get("content", ""))[:500],
            )
        )
    return ToolTrace(tool_name="fetch_source", input={"url": url}, output=fetched)


async def _generate_report(ctx: CopilotContext, citations: list[Citation]) -> ToolTrace:
    report = await generate_report(
        ReportRequest(
            report_type="custom",
            title="Research Copilot Report",
            theme_id=ctx.theme_id,  # type: ignore[arg-type]
            prompt=ctx.question,
        ),
        citations,
    )
    return ToolTrace(tool_name="generate_report", input={"prompt": ctx.question}, output=report.model_dump())


async def _run_deep_discovery(ctx: CopilotContext) -> ToolTrace:
    job = repo.create_job(
        ResearchJobRequest(
            job_type="deep_discovery",
            theme_id=ctx.theme_id,  # type: ignore[arg-type]
            query=ctx.question,
        )
    )
    return ToolTrace(tool_name="run_deep_discovery", input={"theme_id": ctx.theme_id}, output=job.model_dump())


async def _linkedin_search(ctx: CopilotContext, query: str) -> ToolTrace:
    links = await keiro.linkedin_links(query, None, None)
    return ToolTrace(tool_name="linkedin_link_search", input={"query": query}, output={"links": links[:5]})


async def _draft_email(ctx: CopilotContext, citations: list[Citation]) -> ToolTrace:
    recipient = extract_person_name(ctx.question) or "the expert"
    email = await draft_email(recipient, "expert diligence", citations)
    return ToolTrace(
        tool_name="draft_email",
        input={"recipient": recipient},
        output=email,
    )


def compute_confidence(citations: list[Citation], tool_calls: list[ToolTrace]) -> float:
    if not citations:
        return 0.45
    base = min(0.92, 0.42 + len(citations) * 0.06)
    if any(call.tool_name == "web_search" for call in tool_calls):
        base += 0.04
    if any(call.tool_name == "rag_search_sources" for call in tool_calls):
        base += 0.06
    if any(call.status == "skipped" for call in tool_calls):
        base -= 0.03
    return round(min(0.95, max(0.35, base)), 2)
