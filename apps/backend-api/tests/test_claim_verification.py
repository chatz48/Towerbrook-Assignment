from app.schemas.domain import Citation
from app.services.copilot.claim_verification import claim_supported, verify_synthesis
from app.services.copilot.models import CopilotSynthesis


def test_claim_supported_with_overlap():
    corpus = "PJM interconnection delays are slowing grid connection projects in Pennsylvania."
    assert claim_supported("PJM interconnection delays in Pennsylvania", corpus)


def test_claim_supported_rejects_hallucination():
    corpus = "PJM interconnection delays are slowing grid projects."
    assert not claim_supported("Company XYZ acquired for $4.2bn last week", corpus)


def test_verify_synthesis_filters_unverified_findings():
    synthesis = CopilotSynthesis(
        answer_summary="PJM interconnection remains a bottleneck.",
        key_findings=[
            "PJM interconnection delays are slowing projects",
            "Random acquisition rumor without evidence",
        ],
        risks=["Grid connection backlog may extend timelines"],
        gaps=[],
        follow_ups=[],
        uncertainty_notes="",
    )
    citations = [
        Citation(
            title="Grid report",
            evidence="PJM interconnection delays are slowing grid connection projects.",
        )
    ]
    verified, warnings = verify_synthesis(synthesis, citations)
    assert len(verified.key_findings) == 1
    assert any("Removed unverified" in warning for warning in warnings)
