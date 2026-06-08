import argparse
import asyncio

from app.repositories.supabase_repo import repo
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.scorer import score_company, score_expert


SAMPLE = """
Jane Smith, former CEO of GridConnect Analytics, advised utilities on connection queue
analytics and spoke at a UK grid infrastructure conference. GridConnect Analytics
provides software for interconnection bottleneck analysis.
"""


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run lightweight quality gates")
    parser.add_argument("--theme", default="grid-infrastructure")
    args = parser.parse_args()

    result = await extractor.extract(SAMPLE, "Quality gate sample", None, args.theme)
    vector = embeddings.embed(SAMPLE)
    expert_score, _ = score_expert({"expert_type": "operator", "confidence": 0.8}, relationship_count=2)
    company_score, _ = score_company({"category": "target", "confidence": 0.8}, expert_density=2)

    checks = {
        "embedding_dimension": len(vector) == 384,
        "embedding_nonzero": any(value != 0 for value in vector),
        "extraction_returns_people_or_companies": bool(result.people or result.companies),
        "citations_present": bool(result.citations),
        "expert_score_positive": expert_score > 0,
        "company_score_positive": company_score > 0,
        "supabase_config_observed": isinstance(repo.health()["supabase_enabled"], bool),
    }

    for name, passed in checks.items():
        print(f"{'PASS' if passed else 'FAIL'} {name}")

    if not all(checks.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
