import asyncio

from app.services.copilot.chitchat import _fallback_reply, reply_chitchat


def test_fallback_reply_greeting():
    reply = _fallback_reply("Hello there")
    assert "Expert Engine" in reply


def test_reply_chitchat_uses_fallback_when_llm_unconfigured(monkeypatch):
    from app.services import deepseek_llm

    monkeypatch.setattr(deepseek_llm.llm.settings, "deepseek_api_key", "")
    reply, model = asyncio.run(reply_chitchat("Thanks!"))
    assert "welcome" in reply.lower()
    assert model == "deterministic-fallback"
