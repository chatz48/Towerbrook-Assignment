from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger("towerbrook.request_trace")


def _is_serverless() -> bool:
    return bool(os.getenv("VERCEL")) or bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))


def traces_enabled() -> bool:
    flag = os.getenv("REQUEST_TRACES")
    if flag == "0":
        return False
    if flag == "1":
        return True
    if _is_serverless():
        return False
    return os.getenv("NODE_ENV", os.getenv("ENV", "development")) == "development"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


def _trace_root() -> Path:
    override = os.getenv("REQUEST_TRACE_DIR")
    if override:
        return Path(override)
    if _is_serverless():
        return Path("/tmp/towerbrook/traces")
    return _repo_root() / ".traces"


def _trace_dir(surface: str) -> Path:
    day = datetime.now(UTC).strftime("%Y-%m-%d")
    return _trace_root() / surface / day


def record_copilot_trace(
    *,
    request_id: str,
    question: str,
    theme_id: str | None,
    intent: str | None,
    outcome: str,
    durations_ms: dict[str, int],
    tool_calls: list[dict[str, Any]] | None = None,
    node_timings_ms: dict[str, int] | None = None,
    phases: list[dict[str, Any]] | None = None,
    errors: list[str] | None = None,
    session_id: str | None = None,
    summary: dict[str, Any] | None = None,
    stream: bool = False,
) -> str | None:
    if not traces_enabled():
        return None

    record = {
        "request_id": request_id,
        "surface": "backend-copilot",
        "created_at": datetime.now(UTC).isoformat(),
        "question": question[:2000],
        "theme_id": theme_id,
        "session_id": session_id,
        "intent": intent,
        "outcome": outcome,
        "stream": stream,
        "durations_ms": durations_ms,
        "phases": phases or None,
        "tool_calls": tool_calls or None,
        "node_timings_ms": node_timings_ms or None,
        "errors": errors or None,
        "summary": summary or None,
    }

    directory = _trace_dir("backend-copilot")
    file_path = directory / f"{request_id}.json"
    try:
        directory.mkdir(parents=True, exist_ok=True)
        file_path.write_text(f"{json.dumps(record, indent=2, default=str)}\n", encoding="utf-8")
        return str(file_path)
    except OSError as exc:
        logger.warning("Failed to write copilot trace to %s: %s", directory, exc)
        return None
