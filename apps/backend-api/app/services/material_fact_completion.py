from __future__ import annotations

from typing import Any

from app.services.search_query_utils import dedupe_queries, first_text, join_terms


COMPANY_FACT_TYPES = {
    "seed_round",
    "last_funding",
    "total_funding",
    "launch_date",
    "product_live_status",
    "logo_url",
    "website",
}

EXPERT_CONTACT_FACT_TYPES = {"linkedin", "email", "website", "intro_path"}


def build_company_fact_queries(metadata: dict[str, Any]) -> list[str]:
    target = _target_name(metadata)
    if not target:
        return []
    website = _domain(metadata.get("target_website"))
    facts = _fact_types(metadata, COMPANY_FACT_TYPES)
    if not facts:
        facts = ["website", "last_funding", "launch_date", "product_live_status"]

    queries: list[str] = []
    for fact in facts:
        queries.extend(_company_fact_queries(target, fact, website))
    return dedupe_queries(queries)


def build_expert_contact_queries(metadata: dict[str, Any]) -> list[str]:
    target = _target_name(metadata)
    if not target:
        return []
    company = first_text(metadata, "target_company", "organization", "current_organization")
    role = first_text(metadata, "role", "headline")
    facts = _fact_types(metadata, EXPERT_CONTACT_FACT_TYPES)
    if not facts:
        facts = ["linkedin", "email"]

    queries: list[str] = []
    for fact in facts:
        if fact == "email":
            queries.extend(
                [
                    join_terms(target, company, role, "email contact public profile"),
                    join_terms(target, company, "email address contact"),
                    join_terms(target, "speaker bio email contact"),
                ]
            )
        elif fact == "linkedin":
            queries.extend(
                [
                    join_terms(target, company, role, "LinkedIn profile"),
                    join_terms(target, company, "linkedin.com/in"),
                    join_terms(target, "public profile current role LinkedIn"),
                ]
            )
        elif fact == "website":
            queries.extend(
                [
                    join_terms(target, company, "personal website biography"),
                    join_terms(target, role, "profile bio website"),
                ]
            )
        elif fact == "intro_path":
            queries.extend(
                [
                    join_terms(target, company, "deal advisor board investor relationship"),
                    join_terms(target, company, "conference speaker deal team"),
                ]
            )
    return dedupe_queries(queries)


def _company_fact_queries(target: str, fact: str, website: str | None) -> list[str]:
    name = f'"{target}"'
    site = f" site:{website}" if website else ""
    if fact == "seed_round":
        return [
            f'{name} "seed round" OR "seed funding" OR "pre-seed" raised investors{site}',
            f'{name} "funding round" seed investors amount date',
            f'{name} Crunchbase seed funding',
        ]
    if fact == "last_funding":
        return [
            f'{name} "latest funding" OR "last funding" OR "raised" OR "investment"{site}',
            f'{name} "Series" funding investors date amount',
            f'{name} "growth investment" OR "majority investment" OR "minority investment"',
        ]
    if fact == "total_funding":
        return [
            f'{name} "total funding" OR "funding to date" OR "raised to date"',
            f'{name} funding history total investors',
            f'{name} Crunchbase total funding',
        ]
    if fact == "launch_date":
        return [
            f'{name} founded launched established company history{site}',
            f'{name} "about us" founded launched',
            f'{name} "launch date" company',
        ]
    if fact == "product_live_status":
        return [
            f'{name} official website product platform customers case study{site}',
            f'{name} product live platform customers',
            f'{name} solutions customers case study',
        ]
    if fact == "logo_url":
        return [
            f'{name} official logo brand assets press kit{site}',
            f'{name} logo company website',
            f'{name} brand media kit',
        ]
    if fact == "website":
        return [
            f'{name} official website company',
            f'{name} homepage about us',
            f'{name} company website',
        ]
    return [f'{name} {fact} public source evidence{site}']


def _target_name(metadata: dict[str, Any]) -> str | None:
    return first_text(metadata, "target_name", "company_name", "expert_name", "name")


def _fact_types(metadata: dict[str, Any], allowed: set[str]) -> list[str]:
    raw = metadata.get("missing_fact_types") or metadata.get("requested_fact_types")
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, list):
        raw = [metadata.get("missing_fact")]
    return [
        item
        for item in (str(value).strip().lower().replace("-", "_").replace(" ", "_") for value in raw)
        if item in allowed
    ]


def _domain(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    return value.replace("https://", "").replace("http://", "").split("/", 1)[0].removeprefix("www.")
