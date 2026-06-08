from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.embeddings_bge import embeddings

router = APIRouter(prefix="/embeddings", tags=["embeddings"])


class EmbeddingRequest(BaseModel):
    text: str = Field(min_length=1, max_length=24000)
    texts: list[str] | None = None


class EmbeddingResponse(BaseModel):
    embedding: list[float] | None = None
    embeddings: list[list[float]] | None = None
    dimensions: int
    model: str
    semantic: bool


@router.post("", response_model=EmbeddingResponse)
async def embed_text(body: EmbeddingRequest) -> EmbeddingResponse:
    if body.texts:
        vectors = embeddings.embed_many(body.texts[:64])
        return EmbeddingResponse(
            embeddings=vectors,
            dimensions=embeddings.dimensions,
            model=embeddings.model_name,
            semantic=embeddings.semantic_search_available,
        )
    return EmbeddingResponse(
        embedding=embeddings.embed(body.text),
        dimensions=embeddings.dimensions,
        model=embeddings.model_name,
        semantic=embeddings.semantic_search_available,
    )


@router.get("/status")
async def embedding_status():
    return {
        "model": embeddings.model_name,
        "dimensions": embeddings.dimensions,
        "semantic_search_available": embeddings.semantic_search_available,
    }
