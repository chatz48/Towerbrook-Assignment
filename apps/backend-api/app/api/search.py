from __future__ import annotations

from fastapi import APIRouter, Query

from app.config import get_settings
from app.services.keiro_search import keiro

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(q: str = Query(..., min_length=2), limit: int = Query(8, ge=1, le=20)):
    """Unified backend search endpoint for provider-backed or local-source discovery."""
    settings = get_settings()
    results = await keiro.search(q, limit=limit)
    return {
        "query": q,
        "limit": limit,
        "providers": {
            "keirolabs": bool(settings.keirolabs_api_key),
            "tavily": bool(settings.tavily_api_key),
            "serper": bool(settings.serper_api_key),
            "brave": bool(settings.brave_search_api_key),
            "deepseek": bool(settings.deepseek_api_key),
        },
        "results": results,
    }
