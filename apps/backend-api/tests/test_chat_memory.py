from app.services.copilot.memory import heuristic_summarize


def test_heuristic_summarize_merges_prior():
    summary = heuristic_summarize(
        "- User: earlier → Copilot: kept grid experts",
        [{"user": "Who next?", "assistant": "Call Jane Smith first."}],
    )
    assert "earlier" in summary
    assert "Jane Smith" in summary
