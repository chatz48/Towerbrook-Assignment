import asyncio

from app.repositories.supabase_repo import repo
from app.schemas.domain import (
    ExtractedCompany,
    ExtractedFact,
    ExtractedPerson,
    ExtractedRelationship,
    ExtractionResult,
    ResearchJob,
    SourceRecord,
)
from app.services.graph_builder import persist_candidate_extraction


def test_live_discovery_persists_review_gated_candidates_and_matches():
    repo.memory_discovery_candidates.clear()
    repo.memory_entity_match_candidates.clear()
    repo.memory_people.clear()
    repo.memory_companies.clear()
    repo.memory_people["person-1"] = {
        "id": "person-1",
        "name": "Jane Founder",
        "current_organization": "New Grid Co",
    }

    extraction = ExtractionResult(
        people=[
            ExtractedPerson(
                name="Jane Founder",
                current_organization="New Grid Co",
                expert_type="ex-founder",
                theme_ids=["grid-infrastructure"],
                confidence=0.9,
            )
        ],
        companies=[
            ExtractedCompany(
                name="New Grid Co",
                category="target",
                theme_ids=["grid-infrastructure"],
                confidence=0.8,
            )
        ],
        relationships=[
            ExtractedRelationship(
                from_name="Jane Founder",
                from_type="person",
                to_name="New Grid Co",
                to_type="company",
                relationship_type="founded",
                theme_id="grid-infrastructure",
                evidence_text="Jane Founder founded New Grid Co.",
                confidence=0.9,
            )
        ],
        facts=[
            ExtractedFact(
                subject_name="New Grid Co",
                subject_type="company",
                fact_type="last_funding",
                fact_value="$10m Series A in 2025",
                evidence_text="New Grid Co raised a $10m Series A in 2025.",
                theme_id="grid-infrastructure",
                confidence=0.82,
            )
        ],
    )
    source = SourceRecord(
        id="source-1",
        title="Founder profile",
        url="https://example.com/founder",
    )
    job = ResearchJob(
        id="job-1",
        job_type="founder_origination",
        status="running",
        theme_id="grid-infrastructure",
        metadata={"objective": "Find new founder-led opportunities"},
    )

    result = asyncio.run(
        persist_candidate_extraction(
            extraction,
            source,
            ["Jane Founder founded New Grid Co."],
            [[0.0] * 384],
            "grid-infrastructure",
            job,
        )
    )

    assert result["people_candidates"] == 1
    assert result["company_candidates"] == 1
    assert result["relationship_candidates"] == 1
    assert result["fact_candidates"] == 1
    assert any(
        candidate["candidate_type"] == "fact"
        and candidate["payload"]["fact_type"] == "last_funding"
        for candidate in repo.memory_discovery_candidates.values()
    )
    assert result["entity_match_candidates"] == 1
    assert all(
        candidate["review_status"] == "needs_review"
        for candidate in repo.memory_discovery_candidates.values()
    )
    assert len(repo.memory_people) == 1
