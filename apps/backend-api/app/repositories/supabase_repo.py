from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar
from uuid import uuid4
import hashlib

from supabase import Client, create_client

from app.config import get_settings
from app.schemas.domain import ResearchJob, ResearchJobRequest, SourceRecord

T = TypeVar("T")


class SupabaseRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = bool(settings.supabase_url and settings.supabase_service_role_key)
        self.client: Client | None = (
            create_client(settings.supabase_url, settings.supabase_service_role_key)
            if self.enabled
            else None
        )
        self.memory_jobs: dict[str, dict[str, Any]] = {}
        self.memory_sources: dict[str, dict[str, Any]] = {}
        self.memory_people: dict[str, dict[str, Any]] = {}
        self.memory_companies: dict[str, dict[str, Any]] = {}
        self.memory_discovery_candidates: dict[str, dict[str, Any]] = {}
        self.memory_entity_match_candidates: dict[str, dict[str, Any]] = {}

    def _dispatch(self, client_fn: Callable[[Client], T], memory_fn: Callable[[], T]) -> T:
        if self.client:
            return client_fn(self.client)
        return memory_fn()

    def health(self) -> dict[str, Any]:
        return {"supabase_enabled": self.enabled}

    def create_job(self, request: ResearchJobRequest) -> ResearchJob:
        payload = {
            "job_type": request.job_type,
            "status": "queued",
            "theme_id": request.theme_id,
            "query": request.query,
            "target_type": request.target_type,
            "target_id": str(request.target_id) if request.target_id else None,
            "priority": request.priority,
            "metadata": request.metadata,
        }

        def client_create(client: Client) -> ResearchJob:
            row = client.table("research_jobs").insert(payload).execute().data[0]
            return self._job_from_row(row)

        def memory_create() -> ResearchJob:
            job_id = str(uuid4())
            row = {"id": job_id, **payload, "progress_completed": 0, "progress_total": 0}
            self.memory_jobs[job_id] = row
            return self._job_from_row(row)

        return self._dispatch(client_create, memory_create)

    def get_job(self, job_id: str) -> ResearchJob | None:
        def client_get(client: Client) -> ResearchJob | None:
            rows = client.table("research_jobs").select("*").eq("id", job_id).limit(1).execute().data
            return self._job_from_row(rows[0]) if rows else None

        def memory_get() -> ResearchJob | None:
            row = self.memory_jobs.get(job_id)
            return self._job_from_row(row) if row else None

        return self._dispatch(client_get, memory_get)

    def claim_next_job(self) -> ResearchJob | None:
        def client_claim(client: Client) -> ResearchJob | None:
            rows = (
                client.table("research_jobs")
                .select("*")
                .eq("status", "queued")
                .order("priority", desc=True)
                .order("queued_at")
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                return None
            job_id = rows[0]["id"]
            updated = (
                client.table("research_jobs")
                .update({"status": "running"})
                .eq("id", job_id)
                .execute()
                .data[0]
            )
            return self._job_from_row(updated)

        def memory_claim() -> ResearchJob | None:
            for row in sorted(self.memory_jobs.values(), key=lambda x: (-x.get("priority", 0), x["id"])):
                if row["status"] == "queued":
                    row["status"] = "running"
                    return self._job_from_row(row)
            return None

        return self._dispatch(client_claim, memory_claim)

    def claim_job(self, job_id: str) -> ResearchJob | None:
        def client_claim(client: Client) -> ResearchJob | None:
            rows = (
                client.table("research_jobs")
                .select("*")
                .eq("id", job_id)
                .eq("status", "queued")
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                return None
            updated = (
                client.table("research_jobs")
                .update({"status": "running"})
                .eq("id", job_id)
                .eq("status", "queued")
                .execute()
                .data
            )
            return self._job_from_row(updated[0]) if updated else None

        def memory_claim() -> ResearchJob | None:
            row = self.memory_jobs.get(job_id)
            if not row or row["status"] != "queued":
                return None
            row["status"] = "running"
            return self._job_from_row(row)

        return self._dispatch(client_claim, memory_claim)

    def update_job(self, job_id: str, values: dict[str, Any]) -> None:
        if self.client:
            self.client.table("research_jobs").update(values).eq("id", job_id).execute()
            return
        if job_id in self.memory_jobs:
            self.memory_jobs[job_id].update(values)

    def upsert_source(self, source: dict[str, Any]) -> SourceRecord:
        external_id = source.get("external_id") or _stable_id(
            source.get("url") or source.get("title") or source.get("raw_text") or str(uuid4())
        )
        payload = {
            "external_id": external_id,
            "title": source.get("title") or source.get("url") or "Untitled source",
            "url": source.get("url"),
            "publisher": source.get("publisher"),
            "source_type": source.get("source_type", "submitted"),
            "raw_text": source.get("raw_text"),
            "storage_path": source.get("storage_path"),
            "metadata": source.get("metadata", {}),
        }

        def client_upsert(client: Client) -> SourceRecord:
            rows = client.table("sources").upsert(payload, on_conflict="external_id").execute().data
            return SourceRecord(**rows[0])

        def memory_upsert() -> SourceRecord:
            source_id = str(uuid4())
            row = {"id": source_id, **payload}
            self.memory_sources[source_id] = row
            return SourceRecord(**row)

        return self._dispatch(client_upsert, memory_upsert)

    def insert_chunks(self, chunks: list[dict[str, Any]]) -> None:
        if chunks and self.client:
            self.client.table("source_chunks").insert(chunks).execute()

    def upsert_people(self, people: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not people:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return client.table("people").upsert(people, on_conflict="external_id").execute().data

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for person in people:
                row = {"id": str(uuid4()), **person}
                self.memory_people[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_companies(self, companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not companies:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return client.table("companies").upsert(companies, on_conflict="external_id").execute().data

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for company in companies:
                row = {"id": str(uuid4()), **company}
                self.memory_companies[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_discovery_candidates(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not candidates:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("discovery_candidates")
                .upsert(candidates, on_conflict="external_id")
                .execute()
                .data
            )

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            existing_by_external_id = {
                row["external_id"]: candidate_id
                for candidate_id, row in self.memory_discovery_candidates.items()
            }
            for candidate in candidates:
                candidate_id = existing_by_external_id.get(candidate["external_id"], str(uuid4()))
                row = {"id": candidate_id, **candidate}
                self.memory_discovery_candidates[candidate_id] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_entity_match_candidates(self, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not matches:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("entity_match_candidates")
                .upsert(
                    matches,
                    on_conflict=(
                        "discovery_candidate_id,canonical_entity_type,"
                        "canonical_entity_id,match_method"
                    ),
                )
                .execute()
                .data
            )

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for match in matches:
                row = {"id": str(uuid4()), **match}
                self.memory_entity_match_candidates[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def find_people_by_name(self, name: str, limit: int = 10) -> list[dict[str, Any]]:
        def client_find(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("people")
                .select("*")
                .ilike("name", name)
                .limit(limit)
                .execute()
                .data
            )

        def memory_find() -> list[dict[str, Any]]:
            lowered = name.casefold()
            return [
                row
                for row in self.memory_people.values()
                if str(row.get("name", "")).casefold() == lowered
            ][:limit]

        return self._dispatch(client_find, memory_find)

    def find_companies_by_name(self, name: str, limit: int = 10) -> list[dict[str, Any]]:
        def client_find(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("companies")
                .select("*")
                .ilike("name", name)
                .limit(limit)
                .execute()
                .data
            )

        def memory_find() -> list[dict[str, Any]]:
            lowered = name.casefold()
            return [
                row
                for row in self.memory_companies.values()
                if str(row.get("name", "")).casefold() == lowered
            ][:limit]

        return self._dispatch(client_find, memory_find)

    def insert_relationships(self, relationships: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not relationships:
            return []
        if self.client:
            return self.client.table("relationships").insert(relationships).execute().data
        return [{"id": str(uuid4()), **item} for item in relationships]

    def insert_facts(self, facts: list[dict[str, Any]]) -> None:
        if facts and self.client:
            self.client.table("facts").insert(facts).execute()

    def insert_embeddings(self, table: str, rows: list[dict[str, Any]]) -> None:
        if rows and self.client:
            self.client.table(table).upsert(rows).execute()

    def list_source_chunks(self, offset: int = 0, limit: int = 64) -> list[dict[str, Any]]:
        if not self.client:
            return []
        return (
            self.client.table("source_chunks")
            .select("id,content")
            .order("id")
            .range(offset, offset + max(limit - 1, 0))
            .execute()
            .data
        )

    def update_chunk_embedding(self, chunk_id: str, embedding: list[float]) -> None:
        if self.client:
            self.client.table("source_chunks").update({"embedding": embedding}).eq("id", chunk_id).execute()

    def search_sources(self, query_embedding: list[float], theme_id: str | None, limit: int = 8) -> list[dict[str, Any]]:
        if not self.client:
            return []
        filters = {"theme_id": theme_id} if theme_id else {}
        return self.client.rpc(
            "match_source_chunks",
            {"query_embedding": query_embedding, "match_count": limit, "filter": filters},
        ).execute().data

    def search_entities(self, query_embedding: list[float], entity_type: str | None, limit: int = 8) -> list[dict[str, Any]]:
        if not self.client:
            return []
        filters = {"entity_type": entity_type} if entity_type else {}
        return self.client.rpc(
            "match_entity_embeddings",
            {"query_embedding": query_embedding, "match_count": limit, "filter": filters},
        ).execute().data

    def _job_from_row(self, row: dict[str, Any]) -> ResearchJob:
        return ResearchJob(
            id=str(row["id"]),
            job_type=row["job_type"],
            status=row["status"],
            theme_id=row.get("theme_id"),
            query=row.get("query"),
            progress_completed=row.get("progress_completed", 0),
            progress_total=row.get("progress_total", 0),
            sources_found=row.get("sources_found", 0),
            entities_created=row.get("entities_created", 0),
            relationships_created=row.get("relationships_created", 0),
            error=row.get("error"),
            metadata=row.get("metadata") or {},
        )


repo = SupabaseRepository()


def _stable_id(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
