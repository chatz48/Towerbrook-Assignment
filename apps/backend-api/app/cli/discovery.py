import argparse
import asyncio

from app.api.jobs import process_next_job
from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJobRequest


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run TowerBrook deep discovery")
    parser.add_argument("--theme", default="grid-infrastructure")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    job = repo.create_job(
        ResearchJobRequest(
            job_type="deep_discovery",
            theme_id=args.theme,
            metadata={"dry_run": args.dry_run, "source": "cli"},
        )
    )
    if args.dry_run:
        print(f"Created dry-run job {job.id} for {args.theme}")
        return
    result = await process_next_job()
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
