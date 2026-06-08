from fastapi import APIRouter

from app.repositories.supabase_repo import repo
from app.schemas.domain import Citation, ReportRequest, ReportResponse
from app.services.embeddings_bge import embeddings
from app.services.report_generator import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportResponse)
async def create_report(request: ReportRequest):
    query = " ".join(part for part in [request.report_type, request.title, request.prompt, request.theme_id] if part)
    rows = repo.search_sources(embeddings.embed(query), request.theme_id, limit=8)
    citations = [
        Citation(
            source_id=str(row.get("source_id")),
            title=row.get("title") or "Source",
            url=row.get("url"),
            evidence=row.get("content") or "",
        )
        for row in rows
    ]
    report = await generate_report(request, citations)
    if repo.client:
        saved = repo.client.table("reports").insert(
            {
                "report_type": request.report_type,
                "title": report.title,
                "theme_id": request.theme_id,
                "subject_type": request.subject_type,
                "subject_id": request.subject_id,
                "markdown": report.markdown,
                "citations": [citation.model_dump() for citation in report.citations],
                "confidence": report.confidence,
            }
        ).execute().data[0]
        report.id = saved["id"]
    return report
