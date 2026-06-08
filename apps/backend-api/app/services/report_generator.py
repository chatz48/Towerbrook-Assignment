from app.schemas.domain import Citation, ReportRequest, ReportResponse
from app.services.deepseek_extractor import extractor


async def generate_report(request: ReportRequest, citations: list[Citation]) -> ReportResponse:
    title = request.title or _default_title(request)
    context = {"request": request.model_dump(), "citations": [item.model_dump() for item in citations]}
    markdown = await extractor.synthesize(
        f"Generate a concise Markdown {request.report_type} for a TowerBrook investment professional.",
        context,
    )
    return ReportResponse(title=title, markdown=markdown, citations=citations, confidence=0.72)


def _default_title(request: ReportRequest) -> str:
    if request.report_type == "expert_call_prep":
        return "Expert Call Prep"
    if request.report_type == "company_brief":
        return "Company Brief"
    if request.report_type == "red_team":
        return "Red-Team Thesis"
    return "Theme Landscape Memo"
