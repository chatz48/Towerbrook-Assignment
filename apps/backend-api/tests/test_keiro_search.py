from app.services.keiro_search import KeiroSearchService


def test_normalizes_keiro_search_result_with_extracted_content():
    service = KeiroSearchService()
    result = service._normalize_result(
        {"title": "Grid advisor", "url": "https://example.com/grid", "snippet": "Short result"},
        "grid connection advisor",
        {"url": "https://example.com/grid", "content": "Full extracted source"},
    )

    assert result["url"] == "https://example.com/grid"
    assert result["content"] == "Full extracted source"
