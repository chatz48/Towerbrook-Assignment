from app.schemas.domain import (
    ExtractedPerson,
    ExtractedRelationship,
    ExtractionResult,
    SourceRecord,
)
from app.services.expert_profile_completion import (
    build_follow_up_profile_queries,
    build_initial_profile_queries,
    create_profile_coverage,
    update_profile_coverage,
)


def test_build_initial_profile_queries_are_targeted():
    queries = build_initial_profile_queries(
        {
            "target_name": "Jane Advisor",
            "target_organizations": ["Canaccord Genuity"],
            "target_companies": ["JSM Group"],
            "target_deals": [{"deal_name": "TowerBrook majority investment in JSM"}],
            "target_themes": ["grid-infrastructure"],
        }
    )

    assert len(queries) == 4
    assert all('"Jane Advisor"' in query for query in queries)
    assert any('"Canaccord Genuity"' in query for query in queries)
    assert any('"JSM Group"' in query for query in queries)
    assert any("transaction" in query for query in queries)


def test_profile_coverage_drives_follow_up_queries():
    coverage = create_profile_coverage(
        {
            "target_name": "Jane Advisor",
            "target_organizations": ["Canaccord Genuity"],
            "target_companies": ["JSM Group"],
        }
    )
    update_profile_coverage(
        coverage,
        ExtractionResult(
            people=[
                ExtractedPerson(
                    name="Jane Advisor",
                    current_organization="Canaccord Genuity",
                    linkedin_url="https://www.linkedin.com/in/jane-advisor",
                )
            ],
            relationships=[
                ExtractedRelationship(
                    from_name="Jane Advisor",
                    from_type="person",
                    to_name="JSM Group",
                    to_type="company",
                    relationship_type="advised_on",
                    theme_id="grid-infrastructure",
                    evidence_text="Jane Advisor advised on the JSM Group transaction.",
                )
            ],
        ),
        SourceRecord(
            id="source-1",
            title="Jane Advisor profile",
            url="https://www.linkedin.com/in/jane-advisor",
        ),
    )

    assert coverage.fields["identity"] is True
    assert coverage.fields["current_role"] is True
    assert coverage.fields["official_profile"] is True
    assert coverage.fields["deal_connection"] is True
    assert coverage.fields["company_connections"] is True
    assert coverage.complete is True
    assert build_follow_up_profile_queries(coverage)


def test_profile_coverage_uses_source_title_and_query_cooccurrence():
    coverage = create_profile_coverage(
        {
            "target_name": "Jane Advisor",
            "target_organizations": ["Canaccord Genuity"],
            "target_companies": ["JSM Group"],
            "target_deals": [{"deal_name": "TowerBrook majority investment in JSM"}],
        }
    )

    update_profile_coverage(
        coverage,
        ExtractionResult(),
        SourceRecord(
            id="source-2",
            title="Jane Advisor - Canaccord Genuity LinkedIn profile",
            url="https://www.linkedin.com/in/jane-advisor",
            metadata={
                "query": '"Jane Advisor" "JSM Group" deal transaction advised',
            },
        ),
    )

    assert coverage.fields["identity"] is True
    assert coverage.fields["official_profile"] is True
    assert coverage.fields["company_connections"] is True
    assert coverage.fields["deal_connection"] is True
