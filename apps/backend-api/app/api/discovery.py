from fastapi import APIRouter, HTTPException

from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJob, ResearchJobRequest

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.post("/jobs", response_model=ResearchJob)
async def create_discovery_job(request: ResearchJobRequest):
    return repo.create_job(request)


@router.get("/jobs/{job_id}", response_model=ResearchJob)
async def get_discovery_job(job_id: str):
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")
    return job
