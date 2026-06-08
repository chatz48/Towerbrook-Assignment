from fastapi import APIRouter

from app.repositories.supabase_repo import repo
from app.schemas.domain import LinkedinLink, LinkedinSearchRequest
from app.services.keiro_search import keiro
from app.services.reconciler import stable_external_id

router = APIRouter(prefix="/linkedin", tags=["linkedin"])


@router.post("/search", response_model=list[LinkedinLink])
async def search_linkedin_links(request: LinkedinSearchRequest):
    links = await keiro.linkedin_links(request.name, request.company, request.role)
    if repo.client and links:
        candidates = []
        for link in links[:5]:
            profile_url = str(link.get("profile_url") or link.get("url") or "")
            if not profile_url:
                continue
            candidates.append(
                {
                    "external_id": stable_external_id("linkedin-candidate", request.name, profile_url),
                    "candidate_type": "person",
                    "name": link.get("name") or request.name,
                    "theme_ids": [],
                    "priority": round(float(link.get("confidence") or 0.5) * 100, 2),
                    "review_status": "needs_review",
                    "source_ids": [],
                    "job_id": None,
                    "payload": {
                        **link,
                        "search_query": link.get("search_query") or request.name,
                        "review_gated": True,
                        "origin": "linkedin_search",
                    },
                }
            )
        if candidates:
            repo.upsert_discovery_candidates(candidates)
    return links
