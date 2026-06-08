from uuid import uuid4

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.schemas.domain import (
    ChatRequest,
    ChatResponse,
    ChitchatRequest,
    ChitchatResponse,
    MemorySummarizeRequest,
    MemorySummarizeResponse,
)
from app.services.copilot.chitchat import reply_chitchat
from app.services.copilot.memory import summarize_conversation
from app.services.copilot.orchestrator import run_copilot, run_copilot_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/chitchat", response_model=ChitchatResponse)
async def chitchat(request: ChitchatRequest) -> ChitchatResponse:
    """Short friendly replies for greetings and meta questions — DeepSeek v4 flash."""
    reply, model_used = await reply_chitchat(
        request.question,
        conversation_summary=request.conversation_summary or None,
        recent_turns=request.recent_turns,
        theme_scope=request.theme_scope or None,
    )
    return ChitchatResponse(reply=reply, model_used=model_used)


@router.post("/memory/summarize", response_model=MemorySummarizeResponse)
async def summarize_memory(request: MemorySummarizeRequest) -> MemorySummarizeResponse:
    """Compress older copilot turns while preserving names, goals, and open questions."""
    summary = await summarize_conversation(
        request.prior_summary or None,
        request.pairs,
    )
    return MemorySummarizeResponse(summary=summary)


@router.post("", response_model=ChatResponse)
async def chat(http_request: Request, request: ChatRequest) -> ChatResponse:
    """LangGraph copilot: intent router → Keiro/DeepSeek workflow → structured synthesis."""
    request_id = http_request.headers.get("x-request-id") or str(uuid4())
    return await run_copilot(request, request_id=request_id)


@router.post("/stream")
async def chat_stream(http_request: Request, request: ChatRequest) -> StreamingResponse:
    """SSE stream with per-node phase updates, then final ChatResponse."""
    request_id = http_request.headers.get("x-request-id") or str(uuid4())

    async def event_generator():
        async for chunk in run_copilot_stream(request, request_id=request_id):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Request-Id": request_id,
        },
    )
