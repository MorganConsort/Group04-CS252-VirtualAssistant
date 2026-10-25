import pytest

from app.llm import FakeLLM, get_client
from app.llm.gemini import GeminiClient, RetryableError


def test_fake_returns_first_match_and_counts_calls():
    llm = FakeLLM({"concept": '{"concepts": []}', "question": "Q1"})
    assert llm.complete("extract concept from page 3").text == '{"concepts": []}'
    assert llm.complete("no match here").text == "{}"
    assert llm.calls == 2


def test_get_client_fake(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    assert isinstance(get_client(), FakeLLM)


def test_get_client_missing_key(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="Thiếu LLM_API_KEY"):
        get_client()


def test_get_client_gemini(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    monkeypatch.delenv("LLM_MODEL", raising=False)
    client = get_client()
    assert isinstance(client, GeminiClient) and client.model == "gemini-3.8-flash"


def test_get_client_unknown_provider(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "nope")
    monkeypatch.setenv("LLM_API_KEY", "test-key")
    with pytest.raises(ValueError):
        get_client()


def _gemini(monkeypatch, *outcomes):
    """GeminiClient whose vendor call returns/raises the given outcomes in order, no network."""
    client = GeminiClient("test-key", "gemini-3.8-flash")
    pending = list(outcomes)

    def fake_generate(*args):
        outcome = pending.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(client, "_generate", fake_generate)
    monkeypatch.setattr("app.llm.gemini.time.sleep", lambda s: None)
    return client


def test_gemini_bad_json_is_caught(monkeypatch):
    client = _gemini(monkeypatch, ("not json", 10, 5))
    with pytest.raises(ValueError, match="JSON"):
        client.complete("p", json_schema={"type": "object"})


def test_gemini_retries_then_succeeds(monkeypatch):
    client = _gemini(monkeypatch, RetryableError("429"), RetryableError("429"), ('{"ok": 1}', 1_000_000, 0))
    result = client.complete("p", json_schema={"type": "object"})
    assert result.text == '{"ok": 1}' and result.cost_usd == pytest.approx(0.75)


def test_gemini_gives_up_after_two_retries(monkeypatch):
    client = _gemini(monkeypatch, *[RetryableError("429")] * 3)
    with pytest.raises(RetryableError):
        client.complete("p")
