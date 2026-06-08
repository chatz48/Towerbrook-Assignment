from __future__ import annotations

import re

from app.schemas.domain import ExtractedCompany, ExtractedPerson


def stable_external_id(prefix: str, name: str, website_or_linkedin: str | None = None) -> str:
    basis = website_or_linkedin or name
    slug = re.sub(r"[^a-z0-9]+", "-", basis.lower()).strip("-")
    return f"{prefix}:{slug[:96]}"


def person_payload(person: ExtractedPerson) -> dict:
    return {
        "external_id": stable_external_id("person", person.name, person.linkedin_url),
        "name": person.name,
        "headline": person.headline,
        "current_organization": person.current_organization,
        "expert_type": person.expert_type,
        "theme_ids": person.theme_ids,
        "linkedin_url": person.linkedin_url,
        "website": person.website,
        "summary": person.summary,
        "why_relevant": person.why_relevant,
        "confidence": person.confidence,
    }


def company_payload(company: ExtractedCompany) -> dict:
    return {
        "external_id": stable_external_id("company", company.name, company.website),
        "name": company.name,
        "category": company.category,
        "theme_ids": company.theme_ids,
        "website": company.website,
        "hq": company.hq,
        "description": company.description,
        "why_interesting": company.why_interesting,
        "confidence": company.confidence,
    }
