from app.services.scorer import score_company, score_expert


def test_relationship_evidence_increases_expert_priority():
    thin_relevance, thin_momentum = score_expert(
        {"expert_type": "lawyer", "confidence": 0.8},
        relationship_count=0,
    )
    connected_relevance, connected_momentum = score_expert(
        {"expert_type": "lawyer", "confidence": 0.8},
        relationship_count=3,
    )

    assert connected_relevance > thin_relevance
    assert connected_momentum > thin_momentum


def test_expert_density_increases_company_priority():
    thin_relevance, _ = score_company(
        {"category": "target", "confidence": 0.8},
        expert_density=0,
    )
    connected_relevance, _ = score_company(
        {"category": "target", "confidence": 0.8},
        expert_density=3,
    )

    assert connected_relevance > thin_relevance
