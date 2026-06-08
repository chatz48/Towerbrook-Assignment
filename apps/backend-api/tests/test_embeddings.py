from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_embedding_status():
    response = client.get("/embeddings/status")
    assert response.status_code == 200
    body = response.json()
    assert body["dimensions"] == 384
    assert "semantic_search_available" in body


def test_embed_single_text():
    response = client.post("/embeddings", json={"text": "grid interconnection delays"})
    assert response.status_code == 200
    body = response.json()
    assert len(body["embedding"]) == 384
    assert body["dimensions"] == 384
