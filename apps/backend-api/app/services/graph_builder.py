from __future__ import annotations

from uuid import uuid4

from app.repositories.supabase_repo import repo
from app.schemas.domain import ExtractionResult, ResearchJob, SourceRecord
from app.services.embeddings_bge import embeddings
from app.services.reconciler import company_payload, person_payload, stable_external_id
from app.services.scorer import score_company, score_expert


async def persist_candidate_extraction(
    extraction: ExtractionResult,
    source: SourceRecord,
    chunks: list[str],
    chunk_embeddings: list[list[float]],
    theme_id: str | None,
    job: ResearchJob,
) -> dict:
    chunk_rows = [
        {
            "source_id": source.id,
            "content": chunk,
            "token_count": max(1, len(chunk.split())),
            "embedding": vector,
            "theme_ids": [theme_id] if theme_id else [],
            "metadata": {
                "source_title": source.title,
                "job_id": job.id,
                "job_type": job.job_type,
                "review_gated": True,
            },
        }
        for chunk, vector in zip(chunks, chunk_embeddings)
    ]
    repo.insert_chunks(chunk_rows)

    relationship_counts: dict[tuple[str, str], int] = {}
    for relationship in extraction.relationships:
        for entity_type, name in (
            (relationship.from_type, relationship.from_name),
            (relationship.to_type, relationship.to_name),
        ):
            key = (entity_type, name.casefold())
            relationship_counts[key] = relationship_counts.get(key, 0) + 1

    candidates: list[dict] = []
    for person in extraction.people:
        payload = person_payload(person)
        relevance, momentum = score_expert(
            payload,
            relationship_count=relationship_counts.get(("person", person.name.casefold()), 0),
        )
        payload.update(
            {
                "relevance_score": relevance,
                "momentum_score": momentum,
                "job_type": job.job_type,
                "job_metadata": job.metadata,
                "source": {
                    "id": source.id,
                    "title": source.title,
                    "url": source.url,
                    "publisher": source.publisher,
                },
            }
        )
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-person",
                    f"{person.name}:{source.url or source.id}",
                ),
                "candidate_type": "person",
                "name": person.name,
                "theme_ids": person.theme_ids or ([theme_id] if theme_id else []),
                "priority": relevance,
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": payload,
            }
        )

    for company in extraction.companies:
        payload = company_payload(company)
        relevance, momentum = score_company(
            payload,
            expert_density=relationship_counts.get(("company", company.name.casefold()), 0),
        )
        payload.update(
            {
                "relevance_score": relevance,
                "momentum_score": momentum,
                "job_type": job.job_type,
                "job_metadata": job.metadata,
                "source": {
                    "id": source.id,
                    "title": source.title,
                    "url": source.url,
                    "publisher": source.publisher,
                },
            }
        )
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-company",
                    f"{company.name}:{source.url or source.id}",
                ),
                "candidate_type": "company",
                "name": company.name,
                "theme_ids": company.theme_ids or ([theme_id] if theme_id else []),
                "priority": relevance,
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": payload,
            }
        )

    for relationship in extraction.relationships:
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-relationship",
                    (
                        f"{relationship.from_type}:{relationship.from_name}:"
                        f"{relationship.relationship_type}:"
                        f"{relationship.to_type}:{relationship.to_name}:"
                        f"{source.url or source.id}"
                    ),
                ),
                "candidate_type": "relationship",
                "name": (
                    f"{relationship.from_name} {relationship.relationship_type} "
                    f"{relationship.to_name}"
                ),
                "theme_ids": [relationship.theme_id or theme_id]
                if relationship.theme_id or theme_id
                else [],
                "priority": round(relationship.confidence * 100, 2),
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": {
                    **relationship.model_dump(),
                    "job_type": job.job_type,
                    "job_metadata": job.metadata,
                    "source_id": source.id,
                },
            }
        )

    for fact in extraction.facts:
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-fact",
                    (
                        f"{fact.subject_type}:{fact.subject_name}:"
                        f"{fact.fact_type}:{fact.fact_value}:"
                        f"{source.url or source.id}"
                    ),
                ),
                "candidate_type": "fact",
                "name": f"{fact.subject_name} — {fact.fact_type}",
                "theme_ids": [fact.theme_id or theme_id]
                if fact.theme_id or theme_id
                else [],
                "priority": round(fact.confidence * 100, 2),
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": {
                    **fact.model_dump(),
                    "job_type": job.job_type,
                    "job_metadata": job.metadata,
                    "source": {
                        "id": source.id,
                        "title": source.title,
                        "url": source.url,
                        "publisher": source.publisher,
                    },
                    "review_gated": True,
                },
            }
        )

    deduped_candidates = {}
    for candidate in candidates:
        deduped_candidates[candidate["external_id"]] = candidate
    saved_candidates = repo.upsert_discovery_candidates(list(deduped_candidates.values()))
    match_candidates = []
    for candidate in saved_candidates:
        if candidate["candidate_type"] == "person":
            matches = repo.find_people_by_name(candidate["name"])
            candidate_org = str(candidate.get("payload", {}).get("current_organization") or "")
            for match in matches:
                match_org = str(match.get("current_organization") or "")
                organization_match = bool(
                    candidate_org
                    and match_org
                    and candidate_org.casefold() == match_org.casefold()
                )
                match_candidates.append(
                    {
                        "discovery_candidate_id": candidate["id"],
                        "canonical_entity_type": "person",
                        "canonical_entity_id": match["id"],
                        "match_method": "exact_name_and_organization"
                        if organization_match
                        else "exact_name",
                        "match_score": 0.98 if organization_match else 0.9,
                        "evidence": {
                            "candidate_name": candidate["name"],
                            "candidate_organization": candidate_org,
                            "canonical_name": match.get("name"),
                            "canonical_organization": match_org,
                            "source_id": source.id,
                        },
                        "review_status": "needs_review",
                    }
                )
        elif candidate["candidate_type"] == "company":
            for match in repo.find_companies_by_name(candidate["name"]):
                match_candidates.append(
                    {
                        "discovery_candidate_id": candidate["id"],
                        "canonical_entity_type": "company",
                        "canonical_entity_id": match["id"],
                        "match_method": "exact_name",
                        "match_score": 0.9,
                        "evidence": {
                            "candidate_name": candidate["name"],
                            "canonical_name": match.get("name"),
                            "source_id": source.id,
                        },
                        "review_status": "needs_review",
                    }
                )
    saved_matches = repo.upsert_entity_match_candidates(match_candidates)

    return {
        "people_candidates": sum(
            candidate["candidate_type"] == "person" for candidate in saved_candidates
        ),
        "company_candidates": sum(
            candidate["candidate_type"] == "company" for candidate in saved_candidates
        ),
        "relationship_candidates": sum(
            candidate["candidate_type"] == "relationship" for candidate in saved_candidates
        ),
        "fact_candidates": sum(
            candidate["candidate_type"] == "fact" for candidate in saved_candidates
        ),
        "entity_match_candidates": len(saved_matches),
        "chunks_created": len(chunk_rows),
    }


def _entity_profile(entity_type: str, row: dict) -> str:
    if entity_type == "person":
        return " ".join(
            str(part)
            for part in [
                row.get("name"),
                row.get("headline"),
                row.get("current_organization"),
                row.get("expert_type"),
                row.get("summary"),
                row.get("why_relevant"),
                ",".join(row.get("theme_ids") or []),
            ]
            if part
        )
    return " ".join(
        str(part)
        for part in [
            row.get("name"),
            row.get("category"),
            row.get("description"),
            row.get("why_interesting"),
            row.get("website"),
            ",".join(row.get("theme_ids") or []),
        ]
        if part
    )
