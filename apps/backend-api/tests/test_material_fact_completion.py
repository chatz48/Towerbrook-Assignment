from app.services.material_fact_completion import (
    build_company_fact_queries,
    build_expert_contact_queries,
)


def test_company_fact_queries_target_requested_facts():
    queries = build_company_fact_queries(
        {
            "target_name": "GridCo",
            "target_website": "https://www.gridco.example/about",
            "missing_fact_types": ["last_funding", "launch_date"],
        }
    )

    assert any("latest funding" in query or "last funding" in query for query in queries)
    assert any("founded" in query or "launched" in query for query in queries)
    assert any("site:gridco.example" in query for query in queries)


def test_expert_contact_queries_target_linkedin_and_email():
    queries = build_expert_contact_queries(
        {
            "target_name": "Jane Founder",
            "organization": "GridCo",
            "missing_fact_types": ["linkedin", "email"],
        }
    )

    assert any("LinkedIn" in query or "linkedin.com/in" in query for query in queries)
    assert any("email" in query for query in queries)
    assert all("Jane Founder" in query for query in queries)
