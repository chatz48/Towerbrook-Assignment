from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import httpx

from app.config import get_settings


class KeiroSearchService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        if not self.settings.keirolabs_api_key:
            provider_results = await self._provider_search(query, limit)
            return (provider_results or self._fallback_results(query))[:limit]
        payload = {
            "apiKey": self.settings.keirolabs_api_key,
            "query": query,
            "maxResults": limit,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.settings.keirolabs_base_url.rstrip('/')}/api/search",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        if isinstance(data, list):
            results = data
            extracted = []
        else:
            results = data.get("search_results") or data.get("results") or []
            extracted = data.get("extracted_content") or []
        content_by_url = {
            item.get("url"): item
            for item in extracted
            if isinstance(item, dict) and item.get("url")
        }
        return [
            self._normalize_result(item, query, content_by_url.get(item.get("url") or item.get("link")))
            for item in results[:limit]
        ]


    async def _provider_search(self, query: str, limit: int) -> list[dict[str, Any]]:
        if self.settings.tavily_api_key:
            return await self._search_tavily(query, limit)
        if self.settings.serper_api_key:
            return await self._search_serper(query, limit)
        if self.settings.brave_search_api_key:
            return await self._search_brave(query, limit)
        return []

    async def _search_tavily(self, query: str, limit: int) -> list[dict[str, Any]]:
        payload = {
            "api_key": self.settings.tavily_api_key,
            "query": query,
            "max_results": limit,
            "search_depth": "basic",
            "include_answer": False,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post("https://api.tavily.com/search", json=payload)
            response.raise_for_status()
            data = response.json()
        return [
            {
                "title": item.get("title") or query,
                "url": item.get("url"),
                "snippet": item.get("content") or "",
                "publisher": "Tavily",
                "content": item.get("content") or "",
                "metadata": {"provider": "tavily", "search_result": item},
            }
            for item in data.get("results", [])[:limit]
        ]

    async def _search_serper(self, query: str, limit: int) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://google.serper.dev/search",
                json={"q": query, "num": limit},
                headers={"X-API-KEY": self.settings.serper_api_key or ""},
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "title": item.get("title") or query,
                "url": item.get("link"),
                "snippet": item.get("snippet") or "",
                "publisher": item.get("source") or "Serper",
                "content": item.get("snippet") or "",
                "metadata": {"provider": "serper", "search_result": item},
            }
            for item in data.get("organic", [])[:limit]
        ]

    async def _search_brave(self, query: str, limit: int) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": limit},
                headers={"X-Subscription-Token": self.settings.brave_search_api_key or "", "Accept": "application/json"},
            )
            response.raise_for_status()
            data = response.json()
        return [
            {
                "title": item.get("title") or query,
                "url": item.get("url"),
                "snippet": item.get("description") or "",
                "publisher": "Brave Search",
                "content": item.get("description") or "",
                "metadata": {"provider": "brave", "search_result": item},
            }
            for item in (data.get("web", {}).get("results") or [])[:limit]
        ]

    async def fetch_content(self, url: str) -> dict[str, Any]:
        if not self.settings.keirolabs_api_key:
            local = self._local_source_by_url(url)
            if local:
                return {
                    "url": url,
                    "title": local.get("title") or url,
                    "publisher": local.get("publisher"),
                    "content": local.get("content") or local.get("snippet") or "",
                    "metadata": {"provider": "local-public-source-index", "source": local},
                }
            return {"url": url, "title": url, "content": ""}
        payload = {
            "apiKey": self.settings.keirolabs_api_key,
            "query": url,
            "maxResults": 1,
            "mode": "deep",
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{self.settings.keirolabs_base_url.rstrip('/')}/api/search",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        extracted = data.get("extracted_content") or []
        results = data.get("search_results") or data.get("results") or []
        first = extracted[0] if extracted else (results[0] if results else data)
        return {
            "url": url,
            "title": first.get("title") or url,
            "publisher": first.get("publisher") or first.get("domain"),
            "content": (
                first.get("content")
                or first.get("markdown_content")
                or first.get("text")
                or first.get("snippet")
                or ""
            ),
            "metadata": first,
        }

    async def linkedin_links(self, name: str, company: str | None, role: str | None) -> list[dict[str, Any]]:
        query = " ".join(part for part in [name, company, role, "LinkedIn profile"] if part)
        results = await self.search(query, limit=8)
        links = []
        for result in results:
            url = result.get("url", "")
            if "linkedin.com/in/" not in url:
                continue
            links.append(
                {
                    "name": name,
                    "profile_url": url,
                    "confidence": 0.78 if company and company.lower() in result.get("snippet", "").lower() else 0.64,
                    "search_query": query,
                    "source_url": result.get("url"),
                }
            )
        return links[:5]

    def _normalize_result(
        self,
        item: dict[str, Any],
        query: str,
        extracted: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        extracted = extracted or {}
        return {
            "title": item.get("title") or extracted.get("title") or item.get("name") or query,
            "url": item.get("url") or item.get("link"),
            "snippet": item.get("snippet") or item.get("description") or "",
            "publisher": item.get("publisher") or item.get("domain"),
            "content": extracted.get("content") or extracted.get("markdown_content") or "",
            "metadata": {"search_result": item, "extracted_content": extracted},
        }

    def _fallback_results(self, query: str) -> list[dict[str, Any]]:
        tokens = self._tokens(query)
        results = []
        for item in self._local_public_sources():
            haystack = self._tokens(
                " ".join(
                    str(value)
                    for value in [
                        item.get("title"),
                        item.get("publisher"),
                        item.get("snippet"),
                        item.get("content"),
                        " ".join(item.get("entities") or []),
                    ]
                    if value
                )
            )
            if not haystack:
                continue
            score = sum(3 if token in haystack else 0 for token in tokens)
            score += sum(1 for token in tokens for word in haystack if token in word and token != word)
            if score <= 0:
                continue
            results.append((score, item))
        results.sort(key=lambda pair: pair[0], reverse=True)
        return [
            {
                "title": item.get("title") or query,
                "url": item.get("url"),
                "snippet": item.get("snippet") or item.get("content", "")[:320],
                "publisher": item.get("publisher") or "local-public-source-index",
                "content": item.get("content") or item.get("snippet") or "",
                "metadata": {
                    "query": query,
                    "provider": "local-public-source-index",
                    "score": score,
                    "source_type": item.get("source_type"),
                },
            }
            for score, item in results[:10]
        ] or [
            {
                "title": f"No local public-source match: {query}",
                "url": None,
                "snippet": "Set KEIROLABS_API_KEY for live web discovery, or add matching public sources to the source register.",
                "publisher": "local-public-source-index",
                "metadata": {"query": query, "provider": "local-public-source-index"},
            }
        ]

    def _local_source_by_url(self, url: str) -> dict[str, Any] | None:
        return next(
            (source for source in self._local_public_sources() if source.get("url") == url),
            None,
        )

    @staticmethod
    def _tokens(value: str) -> set[str]:
        stopwords = {
            "and",
            "are",
            "for",
            "from",
            "into",
            "or",
            "the",
            "to",
            "with",
        }
        return {
            token
            for token in re.findall(r"[a-z0-9]+", value.lower())
            if len(token) > 2 and token not in stopwords
        }

    @staticmethod
    @lru_cache(maxsize=1)
    def _local_public_sources() -> tuple[dict[str, Any], ...]:
        root = Path(__file__).parents[4]
        sources: list[dict[str, Any]] = []

        source_register_path = root / "apps" / "web" / "data" / "source-register.json"
        if source_register_path.exists():
            payload = json.loads(source_register_path.read_text())
            for source in payload.get("sources", []):
                content = " ".join(
                    str(value)
                    for value in [
                        source.get("why_useful"),
                        " ".join(source.get("expected_entities") or []),
                        " ".join(source.get("expected_relationships") or []),
                    ]
                    if value
                )
                sources.append(
                    {
                        "title": source.get("title"),
                        "url": source.get("url"),
                        "publisher": source.get("publisher"),
                        "source_type": source.get("source_type"),
                        "snippet": source.get("why_useful"),
                        "content": content,
                        "entities": source.get("expected_entities") or [],
                    }
                )

        pe_census_path = root / "apps" / "web" / "data" / "private-equity-deal-census-candidates.json"
        if pe_census_path.exists():
            payload = json.loads(pe_census_path.read_text())
            for deal in payload.get("candidates", []):
                entities = [
                    deal.get("target", {}).get("name"),
                    *[item.get("name") for item in deal.get("sponsors", [])],
                    *[item.get("name") for item in deal.get("advisors", [])],
                    *[item.get("name") for item in deal.get("people", [])],
                ]
                for source in deal.get("sources", []):
                    sources.append(
                        {
                            "title": source.get("title"),
                            "url": source.get("url"),
                            "publisher": source.get("publisher"),
                            "source_type": "private-equity-census",
                            "snippet": source.get("evidence"),
                            "content": " ".join(
                                item
                                for item in [
                                    deal.get("name"),
                                    deal.get("theme"),
                                    deal.get("thesis"),
                                    source.get("evidence"),
                                    " ".join(value for value in entities if value),
                                ]
                                if item
                            ),
                            "entities": [value for value in entities if value],
                        }
                    )

        deduped = {}
        for source in sources:
            key = source.get("url") or source.get("title")
            if key and key not in deduped:
                deduped[key] = source
        return tuple(deduped.values())


keiro = KeiroSearchService()
