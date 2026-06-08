import re

from app.schemas.domain import Citation
from app.services.deepseek_extractor import extractor


async def draft_email(person_name: str, purpose: str, citations: list[Citation]) -> dict:
    context = {
        "person_name": person_name,
        "purpose": purpose,
        "citations": [item.model_dump() for item in citations],
    }
    raw = await extractor.synthesize(
        "Draft a short, professional outreach email as plain text. "
        "Start with 'Subject: ...' on the first line, then a blank line, then the email body. "
        "Do not return JSON. Do not overstate facts beyond the citations.",
        context,
    )
    subject = f"Introductory conversation — {person_name}"
    body = raw.strip()
    if body.lower().startswith("subject:"):
        parts = body.split("\n\n", 1)
        if len(parts) == 2:
            subject = re.sub(r"^Subject:\s*", "", parts[0], flags=re.IGNORECASE).strip()
            body = parts[1].strip()
    return {
        "subject": subject,
        "body": body,
        "citations": [item.model_dump() for item in citations],
    }
