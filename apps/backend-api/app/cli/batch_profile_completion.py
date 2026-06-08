import argparse
import asyncio
import json
from pathlib import Path
from typing import Any

from app.api.jobs import process_next_job
from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJobRequest


THEME_IDS = ("clean-energy-advisory", "grid-infrastructure", "smart-water")
ROOT = Path(__file__).resolve().parents[4]
WEB_DATA = ROOT / "apps" / "web" / "data"


def load_static_context() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    experts_path = WEB_DATA / "experts.json"
    companies_path = WEB_DATA / "companies.json"
    if not experts_path.exists() or not companies_path.exists():
        return {}, {}
    experts = json.loads(experts_path.read_text())
    companies = json.loads(companies_path.read_text())
    return (
        {expert["id"]: expert for expert in experts},
        {company["id"]: company for company in companies},
    )


def missing_profile_fields(person: dict[str, Any]) -> list[str]:
    missing = []
    if not (person.get("current_organization") or person.get("headline")):
        missing.append("current_role")
    if not (person.get("linkedin_url") or person.get("website")):
        missing.append("official_profile")
    if not (person.get("summary") and person.get("why_relevant")):
        missing.append("outreach_signal")
    metadata = person.get("metadata") or {}
    if not (metadata.get("source_urls") or metadata.get("sources") or metadata.get("approved_from")):
        missing.append("source_evidence")
    return missing


def static_company_names(static_expert: dict[str, Any] | None, companies_by_id: dict[str, dict[str, Any]]) -> list[str]:
    if not static_expert:
        return []
    names = []
    for link in static_expert.get("companies", []):
        company = companies_by_id.get(link.get("companyId"))
        if company:
            names.append(company["name"])
    return unique(names)


def static_source_urls(static_expert: dict[str, Any] | None) -> list[str]:
    if not static_expert:
        return []
    return unique(
        [
            source.get("url")
            for source in static_expert.get("sources", [])
            if isinstance(source, dict) and source.get("url")
        ]
    )


def unique(items: list[str | None]) -> list[str]:
    output = []
    seen = set()
    for item in items:
        if not item:
            continue
        normalized = " ".join(str(item).split())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        output.append(normalized)
    return output


def people_for_themes(theme_ids: list[str], min_relevance: float) -> list[dict[str, Any]]:
    rows = (
        repo.client.table("people")
        .select(
            "id,external_id,name,headline,current_organization,expert_type,theme_ids,"
            "linkedin_url,website,summary,why_relevant,metadata,relevance_score,confidence"
        )
        .execute()
        .data
    )
    people = []
    for person in rows:
        themes = person.get("theme_ids") or []
        if not any(theme_id in themes for theme_id in theme_ids):
            continue
        if float(person.get("relevance_score") or 0) < min_relevance:
            continue
        missing = missing_profile_fields(person)
        if missing:
            person["missing_profile_fields"] = missing
            people.append(person)
    return sorted(
        people,
        key=lambda person: (
            -float(person.get("relevance_score") or 0),
            person.get("name") or "",
        ),
    )


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run recursive profile completion for incomplete experts in the three themes"
    )
    parser.add_argument("--theme", action="append", choices=THEME_IDS)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--min-relevance", type=float, default=0)
    parser.add_argument("--max-rounds", type=int, default=2)
    parser.add_argument("--max-queries", type=int, default=3)
    parser.add_argument("--results-per-query", type=int, default=1)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    theme_ids = args.theme or list(THEME_IDS)
    static_experts, companies_by_id = load_static_context()
    people = people_for_themes(theme_ids, args.min_relevance)
    if args.limit:
        people = people[: args.limit]

    created = []
    for person in people:
        static_expert = static_experts.get(person.get("external_id") or "")
        target_companies = static_company_names(static_expert, companies_by_id)
        target_organizations = unique(
            [person.get("current_organization"), *target_companies[:2]]
        )
        metadata = {
            "category": "expert-profile-completion",
            "objective": (
                "Recursively complete a named expert profile for TowerBrook: "
                "official profile, current role, deal/company connections, source evidence, "
                "and outreach usefulness."
            ),
            "target_name": person["name"],
            "target_organizations": target_organizations,
            "target_companies": target_companies,
            "target_deals": [],
            "target_themes": [
                theme_id for theme_id in person.get("theme_ids", []) if theme_id in theme_ids
            ],
            "canonical_expert_id": person["id"],
            "canonical_external_id": person.get("external_id"),
            "missing_profile_fields": person["missing_profile_fields"],
            "seed_source_urls": static_source_urls(static_expert),
            "max_rounds": args.max_rounds,
            "max_queries": args.max_queries,
            "results_per_query": args.results_per_query,
            "review_gated": True,
            "dry_run": not args.execute,
        }
        created.append(
            repo.create_job(
                ResearchJobRequest(
                    job_type="expert_profile_completion",
                    theme_id=metadata["target_themes"][0] if metadata["target_themes"] else None,
                    query=None,
                    priority=int(person.get("relevance_score") or 50),
                    metadata=metadata,
                )
            )
        )

    results = []
    for _ in created:
        results.append(await process_next_job())

    summary = {
        "experts_scoped": len(people),
        "execute": args.execute,
        "supabase_enabled": repo.enabled,
        "completed": sum(result.get("processed") and not result.get("error") for result in results),
        "failed": sum(bool(result.get("error")) for result in results),
        "dry_runs": sum(bool(result.get("dry_run")) for result in results),
        "errors": sorted({result["error"] for result in results if result.get("error")}),
    }
    if args.verbose:
        summary["results"] = results
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
