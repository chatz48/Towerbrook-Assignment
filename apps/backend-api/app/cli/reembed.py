"""Re-embed all source_chunks with BGE (384-d). Run: python -m app.cli.reembed"""

from __future__ import annotations

import argparse
import logging

from app.repositories.supabase_repo import repo
from app.services.embeddings_bge import embeddings

logger = logging.getLogger("towerbrook.reembed")
BATCH_SIZE = 64


def reembed_all(*, dry_run: bool = False, limit: int | None = None) -> dict[str, int]:
    if not repo.client:
        raise RuntimeError("Supabase is not configured — cannot re-embed chunks.")

    if not embeddings.semantic_search_available:
        raise RuntimeError(
            "Semantic embeddings unavailable. Install fastembed and set BGE_SEMANTIC_ENABLED=true."
        )

    processed = 0
    offset = 0
    while True:
        batch_limit = BATCH_SIZE
        if limit is not None:
            remaining = limit - processed
            if remaining <= 0:
                break
            batch_limit = min(batch_limit, remaining)

        chunks = repo.list_source_chunks(offset=offset, limit=batch_limit)
        if not chunks:
            break

        if dry_run:
            processed += len(chunks)
            offset += len(chunks)
            continue

        vectors = embeddings.embed_many([chunk["content"] for chunk in chunks])
        for chunk, vector in zip(chunks, vectors):
            repo.update_chunk_embedding(chunk["id"], vector)
        processed += len(chunks)
        offset += len(chunks)
        logger.info("Re-embedded %s chunks", processed)

    return {"processed": processed, "semantic": embeddings.semantic_search_available}


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Re-embed source_chunks with BGE vectors")
    parser.add_argument("--dry-run", action="store_true", help="Count chunks only")
    parser.add_argument("--limit", type=int, default=None, help="Max chunks to process")
    args = parser.parse_args()
    result = reembed_all(dry_run=args.dry_run, limit=args.limit)
    print(result)


if __name__ == "__main__":
    main()
