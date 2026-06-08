def score_expert(payload: dict, relationship_count: int = 0) -> tuple[float, float]:
    type_weight = {
        "ex-founder": 28,
        "operator": 24,
        "advisor": 18,
        "banker": 16,
        "lawyer": 14,
        "service-provider": 14,
        "investor": 20,
        "regulator": 18,
        "consultant": 14,
    }.get(payload.get("expert_type"), 12)
    confidence = float(payload.get("confidence") or 0.6)
    relevance = min(100.0, type_weight + relationship_count * 8 + confidence * 35)
    momentum = min(100.0, relationship_count * 10 + confidence * 45)
    return round(relevance, 2), round(momentum, 2)


def score_company(payload: dict, expert_density: int = 0) -> tuple[float, float]:
    category_weight = {
        "target": 26,
        "advisory": 18,
        "service-provider": 16,
        "investor": 12,
        "incumbent": 10,
        "fund": 12,
        "bank": 10,
        "law-firm": 10,
    }.get(payload.get("category"), 12)
    confidence = float(payload.get("confidence") or 0.6)
    relevance = min(100.0, category_weight + expert_density * 10 + confidence * 35)
    momentum = min(100.0, expert_density * 8 + confidence * 42)
    return round(relevance, 2), round(momentum, 2)
