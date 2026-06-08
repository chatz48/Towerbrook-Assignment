from __future__ import annotations

from typing import Any


def dedupe_queries(queries: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for query in queries:
        normalized = query.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def join_terms(*parts: str | None) -> str:
    return " ".join(part for part in parts if part)


def join_quoted(terms: list[str], suffix: str) -> str:
    quoted = " ".join(f'"{term}"' for term in terms if term)
    return f"{quoted} {suffix}".strip()


def unique_strings(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        normalized = " ".join(item.split())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        output.append(normalized)
    return output


def first_text(metadata: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None
