"""Google Gemini adapter. The only file allowed to import the google-genai SDK."""
from __future__ import annotations

import json
import logging
import time

from app.llm.base import LLMClient, LLMResult

log = logging.getLogger("app.llm")

TIMEOUT_MS = 30_000
RETRY_DELAYS = (1, 3)  # seconds before retry 1 and retry 2
# USD per 1M tokens (input, output).
# shortcut: unknown models log cost 0, add their price here when the team switches model.
PRICES = {"gemini-3.8-flash": (0.75, 3.75)}  # standard tier, Oct 2026


class RetryableError(Exception):
    """Network error or HTTP 429/5xx: worth trying again."""


class GeminiClient(LLMClient):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self._client = None  # created on first call so tests never need the SDK

    def complete(self, prompt: str, *, system: str = "", json_schema: dict | None = None,
                 max_tokens: int = 1024, temperature: float = 0.2) -> LLMResult:
        start = time.monotonic()
        for delay in (*RETRY_DELAYS, None):
            try:
                text, input_tokens, output_tokens = self._generate(
                    prompt, system, json_schema, max_tokens, temperature)
                break
            except RetryableError:
                if delay is None:
                    raise
                time.sleep(delay)
        if json_schema is not None:
            try:
                json.loads(text)
            except json.JSONDecodeError as e:
                raise ValueError(f"Gemini trả về JSON không hợp lệ: {e}") from e

        in_price, out_price = PRICES.get(self.model, (0.0, 0.0))
        result = LLMResult(text, input_tokens, output_tokens,
                           (input_tokens * in_price + output_tokens * out_price) / 1_000_000)
        # Never log prompt or answer: they may contain student work.
        log.info("provider=gemini model=%s input_tokens=%d output_tokens=%d cost_usd=%.6f duration_ms=%d",
                 self.model, input_tokens, output_tokens, result.cost_usd,
                 (time.monotonic() - start) * 1000)
        return result

    def _generate(self, prompt: str, system: str, json_schema: dict | None,
                  max_tokens: int, temperature: float) -> tuple[str, int, int]:
        import httpx
        from google import genai
        from google.genai import errors, types

        if self._client is None:
            self._client = genai.Client(api_key=self.api_key,
                                        http_options=types.HttpOptions(timeout=TIMEOUT_MS))
        config = types.GenerateContentConfig(
            system_instruction=system or None,
            max_output_tokens=max_tokens,
            temperature=temperature,
            response_mime_type="application/json" if json_schema is not None else None,
            response_json_schema=json_schema,
        )
        try:
            resp = self._client.models.generate_content(model=self.model, contents=prompt, config=config)
        except errors.APIError as e:
            if e.code == 429 or e.code >= 500:
                raise RetryableError(f"Gemini HTTP {e.code}") from e
            raise
        except httpx.TransportError as e:
            raise RetryableError(f"Gemini network error: {type(e).__name__}") from e
        usage = resp.usage_metadata
        # Thinking tokens are billed as output.
        output_tokens = (usage.candidates_token_count or 0) + (usage.thoughts_token_count or 0)
        return (resp.text or "", usage.prompt_token_count or 0, output_tokens)
