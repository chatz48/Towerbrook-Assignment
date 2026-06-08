from __future__ import annotations

import json
import logging
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel

from app.config import get_settings
from app.services.deepseek_extractor import _retry_with_backoff

logger = logging.getLogger("towerbrook.deepseek_llm")

FLASH_MODEL = "deepseek-v4-flash"
PRO_MODEL = "deepseek-v4-pro"

T = TypeVar("T", bound=BaseModel)


class DeepSeekLLM:
    """Thin DeepSeek client for intent routing, structured synthesis, and tool planning."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = "https://api.deepseek.com"

    @property
    def configured(self) -> bool:
        return bool(self.settings.deepseek_api_key)

    async def complete(
        self,
        system: str,
        user: str,
        *,
        model: str = FLASH_MODEL,
        max_tokens: int = 1200,
        json_mode: bool = False,
        temperature: float = 0.15,
    ) -> str:
        if not self.configured:
            raise RuntimeError("DEEPSEEK_API_KEY is not configured")

        async def _call() -> str:
            payload: dict[str, Any] = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                    json=payload,
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]

        return await _retry_with_backoff(_call)

    async def structured(
        self,
        system: str,
        user: str,
        schema: type[T],
        *,
        model: str = FLASH_MODEL,
        max_tokens: int = 1600,
    ) -> T:
        raw = await self.complete(system, user, model=model, max_tokens=max_tokens, json_mode=True)
        try:
            return schema.model_validate_json(raw)
        except Exception:
            match = raw.strip()
            start = match.find("{")
            end = match.rfind("}")
            if start >= 0 and end > start:
                return schema.model_validate_json(match[start : end + 1])
            raise

    async def parse_json(self, system: str, user: str, *, model: str = FLASH_MODEL) -> dict[str, Any]:
        raw = await self.complete(system, user, model=model, json_mode=True, max_tokens=600)
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}")
            if start >= 0 and end > start:
                parsed = json.loads(raw[start : end + 1])
                return parsed if isinstance(parsed, dict) else {}
            return {}


llm = DeepSeekLLM()
