from fastapi import APIRouter, HTTPException, Request

from app.config import get_settings
from app.repositories.supabase_repo import repo
from app.services.expert_profile_completion import (
    build_initial_profile_queries,
    create_profile_coverage,
)
from app.services.job_processor import run_discovery_queries, run_profile_completion_queries
from app.services.material_fact_completion import (
    build_company_fact_queries,
    build_expert_contact_queries,
)
from app.services.theme_job_queries import THEME_QUERIES

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/process-next")
async def process_next_job():
    job = repo.claim_next_job()
    if not job:
        return {"processed": False, "reason": "No queued jobs"}
    return await _process_claimed_job(job)


@router.post("/process/{job_id}")
async def process_job(job_id: str):
    job = repo.claim_job(job_id)
    if not job:
        current = repo.get_job(job_id)
        if not current:
            raise HTTPException(status_code=404, detail="Research job not found")
        return {
            "processed": False,
            "job_id": job_id,
            "status": current.status,
            "reason": "Job is not queued.",
        }
    return await _process_claimed_job(job)


async def _process_claimed_job(job):
    try:
        settings = get_settings()
        queries = _queries_for_job(job.theme_id, job.query, job.metadata)
        repo.update_job(job.id, {"progress_total": len(queries)})
        provider_status = {
            "keirolabs": bool(settings.keirolabs_api_key),
            "deepseek": bool(settings.deepseek_api_key),
            "supabase": repo.enabled,
        }
        if job.metadata.get("dry_run"):
            repo.update_job(
                job.id,
                {
                    "status": "completed",
                    "progress_completed": len(queries),
                    "metadata": {
                        **job.metadata,
                        "queries": queries,
                        "provider_status": provider_status,
                        "review_gated": True,
                    },
                },
            )
            return {
                "processed": True,
                "job_id": job.id,
                "dry_run": True,
                "queries": queries,
                "provider_status": provider_status,
            }
        missing_providers = [
            provider for provider, configured in provider_status.items() if not configured
        ]
        if missing_providers:
            error = f"Discovery pipeline not configured: {', '.join(missing_providers)}"
            repo.update_job(
                job.id,
                {
                    "status": "failed",
                    "error": error,
                    "metadata": {
                        **job.metadata,
                        "provider_status": provider_status,
                        "review_gated": True,
                    },
                },
            )
            return {
                "processed": True,
                "job_id": job.id,
                "error": error,
                "provider_status": provider_status,
            }

        if job.job_type == "expert_profile_completion":
            return await _process_expert_profile_completion(job, settings, provider_status)

        batch = await run_discovery_queries(job, queries, settings)
        totals = batch.totals
        repo.update_job(
            job.id,
            {
                "status": "completed",
                "sources_found": totals.sources,
                "entities_created": totals.people_candidates + totals.company_candidates,
                "relationships_created": totals.relationship_candidates,
                "metadata": {
                    **job.metadata,
                    "keirolabs_requests_used": batch.requests_used,
                    "provider_status": provider_status,
                    "review_gated": True,
                    "entity_match_candidates": totals.entity_match_candidates,
                    "fact_candidates": totals.fact_candidates,
                },
            },
        )
        return {
            "processed": True,
            "job_id": job.id,
            "keirolabs_requests_used": batch.requests_used,
            **totals.__dict__,
        }
    except Exception:
        error = "Research job failed during processing. Check server logs with the request id for details."
        repo.update_job(job.id, {"status": "failed", "error": error})
        return {"processed": True, "job_id": job.id, "error": error}


@router.get("/process-next")
async def process_next_job_cron(request: Request):
    settings = get_settings()
    authorization = request.headers.get("authorization")
    if not settings.cron_secret or authorization != f"Bearer {settings.cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await process_next_job()


def _queries_for_job(
    theme_id: str | None,
    query: str | None,
    metadata: dict | None = None,
) -> list[str]:
    if (metadata or {}).get("category") == "expert-profile-completion":
        profile_queries = build_initial_profile_queries(metadata or {})
        if profile_queries:
            return profile_queries
    if (metadata or {}).get("category") == "company-fact-completion":
        company_fact_queries = build_company_fact_queries(metadata or {})
        if company_fact_queries:
            return company_fact_queries
    if (metadata or {}).get("category") == "expert-contact-completion":
        expert_contact_queries = build_expert_contact_queries(metadata or {})
        if expert_contact_queries:
            return expert_contact_queries
    metadata_queries = (metadata or {}).get("queries")
    if isinstance(metadata_queries, list):
        queries = [item.strip() for item in metadata_queries if isinstance(item, str) and item.strip()]
        if queries:
            return queries
    if query:
        return [query]
    if theme_id and theme_id in THEME_QUERIES:
        return THEME_QUERIES[theme_id]
    return [item for queries in THEME_QUERIES.values() for item in queries]


async def _process_expert_profile_completion(job, settings, provider_status):
    coverage = create_profile_coverage(job.metadata)
    queries = _queries_for_job(job.theme_id, job.query, job.metadata)
    if not queries or queries == [None]:
        queries = build_initial_profile_queries(job.metadata)
    if not queries:
        error = "expert_profile_completion requires metadata.target_name"
        repo.update_job(job.id, {"status": "failed", "error": error})
        return {"processed": True, "job_id": job.id, "error": error}

    batch = await run_profile_completion_queries(
        job,
        queries,
        settings,
        coverage,
        max_rounds=int(job.metadata.get("max_rounds", 2)),
        max_queries=int(job.metadata.get("max_queries", 8)),
        results_per_query=int(job.metadata.get("results_per_query", 3)),
    )
    totals = batch.totals
    metadata = {
        **job.metadata,
        "executed_queries": batch.executed_queries,
        "keirolabs_requests_used": batch.requests_used,
        "provider_status": provider_status,
        "review_gated": True,
        "profile_completion": {
            "target_name": coverage.target_name,
            "score": coverage.score,
            "fields": coverage.fields,
            "missing_fields": coverage.missing_fields,
            "complete": coverage.complete,
            "evidence": coverage.evidence,
        },
        "entity_match_candidates": totals.entity_match_candidates,
        "fact_candidates": totals.fact_candidates,
    }
    repo.update_job(
        job.id,
        {
            "status": "completed",
            "sources_found": totals.sources,
            "entities_created": totals.people_candidates + totals.company_candidates,
            "relationships_created": totals.relationship_candidates,
            "metadata": metadata,
        },
    )
    return {
        "processed": True,
        "job_id": job.id,
        "keirolabs_requests_used": batch.requests_used,
        "profile_completion": metadata["profile_completion"],
        **totals.__dict__,
    }
