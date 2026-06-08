from app.api.jobs import _queries_for_job
from app.services.theme_job_queries import THEME_QUERIES


def test_theme_queries_are_private_equity_led():
    for queries in THEME_QUERIES.values():
        assert len(queries) == 6
        assert queries[0].startswith("site:towerbrook.com")
        assert any('"private equity"' in query for query in queries)
        assert any('"portfolio company"' in query for query in queries)
        assert any('"secondary buyout"' in query for query in queries)
        assert any("founder OR CEO OR chair" in query for query in queries)
        assert any('"financial advisor"' in query and '"legal counsel"' in query for query in queries)


def test_query_override_takes_precedence():
    assert _queries_for_job("grid-infrastructure", "TowerBrook JSM advisors") == [
        "TowerBrook JSM advisors"
    ]


def test_structured_job_queries_take_precedence():
    assert _queries_for_job(
        "grid-infrastructure",
        "fallback query",
        {"queries": ["founder query", "identity query"]},
    ) == ["founder query", "identity query"]


def test_expert_profile_completion_uses_targeted_profile_queries():
    queries = _queries_for_job(
        "grid-infrastructure",
        None,
        {
            "category": "expert-profile-completion",
            "target_name": "Jane Advisor",
            "target_organizations": ["Canaccord Genuity"],
            "target_companies": ["JSM Group"],
            "target_deals": [{"deal_name": "TowerBrook majority investment in JSM"}],
            "target_themes": ["grid-infrastructure"],
        },
    )

    assert all('"Jane Advisor"' in query for query in queries)
    assert any('"Canaccord Genuity"' in query for query in queries)
    assert any('"JSM Group"' in query for query in queries)


def test_unknown_theme_runs_all_private_equity_queries():
    queries = _queries_for_job("unknown-theme", None)

    assert len(queries) == sum(len(theme_queries) for theme_queries in THEME_QUERIES.values())
    assert sum(query.startswith("site:towerbrook.com") for query in queries) == len(THEME_QUERIES)
