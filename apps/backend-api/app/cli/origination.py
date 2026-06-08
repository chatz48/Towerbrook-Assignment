import argparse
import asyncio
import json
import sys
from pathlib import Path

from app.api.jobs import process_next_job
from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJobRequest


DEFAULT_JOBS_PATH = (
    Path(__file__).parents[4] / "apps" / "web" / "data" / "origination-research-jobs.json"
)


def load_jobs(path: Path, category: str | None, limit: int | None) -> list[dict]:
    payload = json.loads(path.read_text())
    jobs = payload["jobs"]
    if category:
        jobs = [job for job in jobs if job["metadata"]["category"] == category]
    return jobs[:limit] if limit else jobs


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run expert-led investment origination research")
    parser.add_argument("--jobs", type=Path, default=DEFAULT_JOBS_PATH)
    parser.add_argument(
        "--category",
        choices=["founder-origination", "advisor-expert-gap", "identity-resolution"],
    )
    parser.add_argument("--limit", type=int)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args([arg for arg in sys.argv[1:] if arg != "--"])

    jobs = load_jobs(args.jobs, args.category, args.limit)
    created = []
    for job in jobs:
        metadata = {
            **job["metadata"],
            "external_job_id": job["external_job_id"],
            "source": "origination-cli",
            "dry_run": not args.execute,
        }
        created.append(
            repo.create_job(
                ResearchJobRequest(
                    job_type=job["job_type"],
                    theme_id=job["theme_id"],
                    query=job["query"],
                    priority=job["priority"],
                    metadata=metadata,
                )
            )
        )

    results = []
    for _ in created:
        results.append(await process_next_job())

    summary = {
        "jobs_loaded": len(jobs),
        "execute": args.execute,
        "supabase_enabled": repo.enabled,
        "completed": sum(result.get("processed") and not result.get("error") for result in results),
        "failed": sum(bool(result.get("error")) for result in results),
        "dry_runs": sum(bool(result.get("dry_run")) for result in results),
        "provider_status": results[0].get("provider_status") if results else {},
        "errors": sorted({result["error"] for result in results if result.get("error")}),
    }
    if args.verbose:
        summary["results"] = results
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
