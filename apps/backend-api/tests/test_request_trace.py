import json

from app.services.copilot.request_trace import record_copilot_trace


def test_record_copilot_trace_writes_json(tmp_path, monkeypatch):
    monkeypatch.setenv("REQUEST_TRACES", "1")
    monkeypatch.setenv("REQUEST_TRACE_DIR", str(tmp_path))

    path = record_copilot_trace(
        request_id="trace-test-1",
        question="Who should I call?",
        theme_id="grid-infrastructure",
        intent="find_experts",
        outcome="complete",
        durations_ms={"total": 120},
        tool_calls=[{"tool_name": "rag_search_entities", "status": "completed"}],
        node_timings_ms={"route": 10, "research": 40, "synthesize": 70},
        summary={"answer_preview": "Call Jane first."},
    )

    assert path is not None
    payload = json.loads(open(path, encoding="utf-8").read())
    assert payload["request_id"] == "trace-test-1"
    assert payload["surface"] == "backend-copilot"
    assert payload["intent"] == "find_experts"
    assert payload["tool_calls"][0]["tool_name"] == "rag_search_entities"


def test_record_copilot_trace_disabled(monkeypatch):
    monkeypatch.setenv("REQUEST_TRACES", "0")
    assert (
        record_copilot_trace(
            request_id="trace-test-2",
            question="test",
            theme_id=None,
            intent=None,
            outcome="error",
            durations_ms={"total": 1},
        )
        is None
    )


def test_record_copilot_trace_disabled_on_vercel(monkeypatch):
    monkeypatch.delenv("REQUEST_TRACES", raising=False)
    monkeypatch.setenv("VERCEL", "1")
    assert (
        record_copilot_trace(
            request_id="trace-test-3",
            question="test",
            theme_id=None,
            intent=None,
            outcome="complete",
            durations_ms={"total": 1},
        )
        is None
    )


def test_record_copilot_trace_write_failure_is_non_fatal(monkeypatch):
    monkeypatch.setenv("REQUEST_TRACES", "1")
    monkeypatch.setenv("REQUEST_TRACE_DIR", "/.traces")
    assert (
        record_copilot_trace(
            request_id="trace-test-4",
            question="test",
            theme_id=None,
            intent=None,
            outcome="complete",
            durations_ms={"total": 1},
        )
        is None
    )
