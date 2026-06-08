from __future__ import annotations

import hashlib
import logging
import math
import shutil
from os import getenv
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger("towerbrook.embeddings")

BGE_MODEL_DEFAULT = "BAAI/bge-small-en-v1.5"
_CORRUPT_CACHE_MARKERS = (
    "no_suchfile",
    "file doesn't exist",
    "corrupted",
    "could not load model",
    "model_optimized.onnx",
)


def _is_serverless() -> bool:
    return bool(getenv("VERCEL")) or bool(getenv("AWS_LAMBDA_FUNCTION_NAME"))


def _resolve_fastembed_cache_dir() -> Path:
    override = getenv("FASTEMBED_CACHE_PATH")
    if override:
        return Path(override).expanduser()
    if _is_serverless():
        return Path("/tmp/towerbrook/fastembed")
    return Path.home() / ".cache" / "towerbrook" / "fastembed"


def _is_corrupt_cache_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in _CORRUPT_CACHE_MARKERS)


def _clear_fastembed_cache(cache_dir: Path) -> None:
    if cache_dir.exists():
        shutil.rmtree(cache_dir, ignore_errors=True)
    cache_dir.mkdir(parents=True, exist_ok=True)


class BgeEmbeddingService:
    """BGE-small-en-v1.5 @ 384-d for pgvector. Uses fastembed when available."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.dimensions = self.settings.bge_vector_dimensions
        self.model_name = self.settings.bge_model or BGE_MODEL_DEFAULT
        self._fastembed: object | None = None
        self.semantic_search_available = False
        self._load_semantic_model()

    def _load_semantic_model(self) -> None:
        if getenv("TOWERBROOK_TESTING") == "1":
            return
        if getenv("BGE_SEMANTIC_ENABLED", "true").lower() == "false":
            return

        cache_dir = _resolve_fastembed_cache_dir()
        for attempt in range(2):
            try:
                from fastembed import TextEmbedding

                self._fastembed = TextEmbedding(
                    model_name=self.model_name,
                    cache_dir=str(cache_dir),
                )
                self.semantic_search_available = True
                logger.info(
                    "Loaded semantic embeddings: %s (%sd) cache=%s",
                    self.model_name,
                    self.dimensions,
                    cache_dir,
                )
                return
            except ImportError as exc:
                logger.warning(
                    "fastembed unavailable (%s); using hash fallback. pip install fastembed to enable semantic RAG.",
                    exc,
                )
                return
            except Exception as exc:
                if attempt == 0 and _is_corrupt_cache_error(exc):
                    logger.warning(
                        "fastembed cache corrupt (%s); clearing %s and retrying download",
                        exc,
                        cache_dir,
                    )
                    _clear_fastembed_cache(cache_dir)
                    continue
                logger.warning(
                    "fastembed unavailable (%s); using hash fallback. pip install fastembed to enable semantic RAG.",
                    exc,
                )
                return

    def embed(self, text: str) -> list[float]:
        if self.semantic_search_available and self._fastembed is not None:
            return self._semantic_embed(text)
        return self._hash_embed(text)

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if self.semantic_search_available and self._fastembed is not None and texts:
            return self._semantic_embed_many(texts)
        return [self._hash_embed(text) for text in texts]

    def _semantic_embed(self, text: str) -> list[float]:
        assert self._fastembed is not None
        vectors = list(self._fastembed.embed([text[:8000]]))  # type: ignore[attr-defined]
        vector = vectors[0]
        values = vector.tolist() if hasattr(vector, "tolist") else list(vector)
        return [round(float(v), 8) for v in values[: self.dimensions]]

    def _semantic_embed_many(self, texts: list[str]) -> list[list[float]]:
        assert self._fastembed is not None
        trimmed = [text[:8000] for text in texts]
        vectors = list(self._fastembed.embed(trimmed))  # type: ignore[attr-defined]
        result: list[list[float]] = []
        for vector in vectors:
            values = vector.tolist() if hasattr(vector, "tolist") else list(vector)
            result.append([round(float(v), 8) for v in values[: self.dimensions]])
        return result

    def _hash_embed(self, text: str) -> list[float]:
        tokens = [token.lower() for token in text.split() if token.strip()]
        vector = [0.0] * self.dimensions
        for token in tokens or [text[:64] or "empty"]:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [round(value / norm, 8) for value in vector]

    def profile_hash(self, text: str) -> str:
        return hashlib.sha256(f"{self.model_name}:{text}".encode("utf-8")).hexdigest()


embeddings = BgeEmbeddingService()
