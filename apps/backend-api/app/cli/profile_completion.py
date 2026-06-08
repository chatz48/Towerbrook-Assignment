import argparse
import asyncio
import json

from app.api.jobs import process_next_job
from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJobRequest


async def main() -> None:
    parser = argparse.ArgumentParser(description="Recursively complete a named expert profile")
    parser.add_argument("--name", required=True)
    parser.add_argument("--theme", default="grid-infrastructure")
    parser.add_argument("--organization", action="append", default=[])
    parser.add_argument("--company", action="append", default=[])
    parser.add_argument("--deal", action="append", default=[])
    parser.add_argument("--max-rounds", type=int, default=2)
    parser.add_argument("--max-queries", type=int, default=8)
    parser.add_argument("--results-per-query", type=int, default=3)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    metadata = {
        "category": "expert-profile-completion",
        "objective": (
            "Recursively complete a named expert profile: current role, official profile, "
            "deal connection, company connections, and outreach usefulness."
        ),
        "target_name": args.name,
        "target_organizations": args.organization,
        "target_companies": args.company,
        "target_deals": [{"deal_name": deal} for deal in args.deal],
        "target_themes": [args.theme],
        "max_rounds": args.max_rounds,
        "max_queries": args.max_queries,
        "results_per_query": args.results_per_query,
        "review_gated": True,
        "dry_run": not args.execute,
    }
    job = repo.create_job(
        ResearchJobRequest(
            job_type="expert_profile_completion",
            theme_id=args.theme,
            query=None,
            priority=80,
            metadata=metadata,
        )
    )
    result = await process_next_job()
    summary = {
        "job_id": job.id,
        "execute": args.execute,
        "supabase_enabled": repo.enabled,
        "result": result if args.verbose else {
            key: value
            for key, value in result.items()
            if key not in {"queries"}
        },
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
