import logging
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import chat, discovery, ingest, jobs, linkedin, reports, search
from app.api import embeddings as embeddings_api
from app.config import get_settings
from app.repositories.supabase_repo import repo
from app.services.embeddings_bge import embeddings

app = FastAPI(title="TowerBrook Backend API", version="0.1.0")
logger = logging.getLogger("towerbrook.api")
_request_count = 0
_error_count = 0

_settings = get_settings()
_allowed_origins = [
    origin.strip()
    for origin in (_settings.cors_allowed_origins or "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(embeddings_api.router)
app.include_router(discovery.router)
app.include_router(ingest.router)
app.include_router(jobs.router)
app.include_router(linkedin.router)
app.include_router(reports.router)
app.include_router(search.router)


@app.middleware("http")
async def require_api_token(request: Request, call_next):
    global _request_count, _error_count
    request_id = request.headers.get("x-request-id") or str(uuid4())
    started = time.perf_counter()
    _request_count += 1
    settings = get_settings()
    is_cron_job = request.url.path == "/jobs/process-next" and request.method == "GET"
    is_public = request.url.path == "/health" or (
        is_cron_job
        and settings.cron_secret
        and request.headers.get("authorization") == f"Bearer {settings.cron_secret}"
    )
    if (
        settings.backend_api_token
        and not is_public
        and request.method != "OPTIONS"
        and request.headers.get("authorization")
        != f"Bearer {settings.backend_api_token}"
    ):
        _error_count += 1
        response = JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "unauthorized",
                    "message": "Unauthorized",
                    "request_id": request_id,
                }
            },
        )
    else:
        try:
            response = await call_next(request)
            if response.status_code >= 500:
                _error_count += 1
        except Exception:
            _error_count += 1
            logger.exception(
                "Unhandled API request error",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                },
            )
            raise

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    response.headers["x-request-id"] = request_id
    response.headers["x-response-time-ms"] = str(elapsed_ms)
    logger.info(
        "API request complete",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": elapsed_ms,
        },
    )
    return response


def health_payload(detailed: bool = False):
    settings = get_settings()
    payload = {"ok": True, "supabase": repo.health()}
    if detailed:
        payload.update(
            {
                "deepseek_configured": bool(settings.deepseek_api_key),
                "keirolabs_configured": bool(settings.keirolabs_api_key),
                "live_search_configured": bool(
                    settings.keirolabs_api_key
                    or settings.tavily_api_key
                    or settings.serper_api_key
                    or settings.brave_search_api_key
                ),
                "embedding_model": embeddings.model_name,
                "embedding_dimensions": embeddings.dimensions,
                "requests_observed": _request_count,
                "errors_observed": _error_count,
            }
        )
    return payload


@app.get("/health")
async def health():
    return health_payload()


@app.get("/api/v1/health")
async def versioned_health():
    return health_payload()
