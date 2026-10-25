"""The only module that talks to an LLM vendor. Pick one with LLM_PROVIDER (see .env.example)."""
from __future__ import annotations

import os

from app.llm.base import LLMClient, LLMResult
from app.llm.fake import FakeLLM

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

__all__ = ["LLMClient", "LLMResult", "FakeLLM", "get_client"]


def get_client() -> LLMClient:
    provider = os.environ.get("LLM_PROVIDER", "fake").strip().lower() or "fake"
    if provider == "fake":
        return FakeLLM()
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(f"Thiếu LLM_API_KEY (LLM_PROVIDER={provider}). Điền key vào .env.")
    if provider == "gemini":
        from app.llm.gemini import GeminiClient

        return GeminiClient(api_key, os.environ.get("LLM_MODEL", "").strip() or DEFAULT_GEMINI_MODEL)
    raise ValueError(f"LLM_PROVIDER không hỗ trợ: '{provider}'. Dùng: fake, gemini.")
