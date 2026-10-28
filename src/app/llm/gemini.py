"""Google Gemini adapter. The only file allowed to import the google-genai SDK."""
from __future__ import annotations

import json
import logging
import time

from app.llm.base import LLMClient, LLMResult, RetryableError

log = logging.getLogger("app.llm")

TIMEOUT_MS = 180_000  # a whole deck in one call (vision or concepts) can take over a minute
RETRY_DELAYS = (1, 3)  # seconds before retry 1 and retry 2
MAX_WAIT = 60  # a longer server-requested wait is a daily quota: retrying now cannot succeed
# USD per 1M tokens (input, output).
# shortcut: unknown models log cost 0, add their price here when the team switches model.
PRICES = {"gemini-3.8-flash": (0.75, 3.75)}  # standard tier, Oct 2026

__all__ = ["GeminiClient", "RetryableError"]


def _retry_after(error) -> float | None:
    """Seconds from the RetryInfo detail Gemini attaches to a 429, e.g. "42s"."""
    details = error.details.get("error", {}).get("details", []) if isinstance(error.details, dict) else []
    for detail in details:
        if str(detail.get("@type", "")).endswith("RetryInfo"):
            try:
                return float(str(detail.get("retryDelay", "")).rstrip("s"))
            except ValueError:
                return None
    return None


class GeminiClient(LLMClient):
    def __init__(self, api_key: str, models: list[str]):
        self.api_key = api_key
        self.models = list(models)  # in priority order; the next one is used when one fails
        self._client = None  # created on first call so tests never need the SDK

    def complete(self, prompt: str, *, system: str = "", json_schema: dict | None = None,
                 max_tokens: int = 1024, temperature: float = 0.2,
                 pdf: bytes | None = None) -> LLMResult:
        start = time.monotonic()
        for model in list(self.models):
            try:
                text, input_tokens, output_tokens = self._with_retries(
                    model, prompt, system, json_schema, max_tokens, temperature, pdf)
                break
            except RetryableError as e:
                if model == self.models[-1]:
                    raise
                if (e.retry_after or 0) > MAX_WAIT:  # daily quota: skip it for this client's life
                    self.models.remove(model)
                log.warning("provider=gemini model=%s unavailable (%s), trying the next model",
                            model, e)
        if json_schema is not None:
            try:
                json.loads(text)
            except json.JSONDecodeError as e:
                raise ValueError(f"Gemini trả về JSON không hợp lệ: {e}") from e

        in_price, out_price = PRICES.get(model, (0.0, 0.0))
        result = LLMResult(text, input_tokens, output_tokens,
                           (input_tokens * in_price + output_tokens * out_price) / 1_000_000)
        # Never log prompt or answer: they may contain student work.
        log.info("provider=gemini model=%s input_tokens=%d output_tokens=%d cost_usd=%.6f duration_ms=%d",
                 model, input_tokens, output_tokens, result.cost_usd,
                 (time.monotonic() - start) * 1000)
        return result

    def _with_retries(self, model: str, *args) -> tuple[str, int, int]:
        for delay in (*RETRY_DELAYS, None):
            try:
                return self._generate(model, *args)
            except RetryableError as e:
                wait = max(delay or 0, e.retry_after or 0)
                if delay is None or wait > MAX_WAIT:
                    raise
                time.sleep(wait)
        raise AssertionError("unreachable")  # the last attempt returns or raises

    def _generate(self, model: str, prompt: str, system: str, json_schema: dict | None,
                  max_tokens: int, temperature: float, pdf: bytes | None) -> tuple[str, int, int]:
        import ssl

        import httpx
        import truststore
        from google import genai
        from google.genai import errors, types

        if self._client is None:
            # OS trust store, not certifi: antivirus/proxy TLS inspection on Windows otherwise
            # fails every call with CERTIFICATE_VERIFY_FAILED.
            verify = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            self._client = genai.Client(api_key=self.api_key, http_options=types.HttpOptions(
                timeout=TIMEOUT_MS, client_args={"verify": verify}))
        config = types.GenerateContentConfig(
            system_instruction=system or None,
            max_output_tokens=max_tokens,
            temperature=temperature,
            response_mime_type="application/json" if json_schema is not None else None,
            response_json_schema=json_schema,
        )
        contents = ([types.Part.from_bytes(data=pdf, mime_type="application/pdf"), prompt]
                    if pdf is not None else prompt)
        try:
            resp = self._client.models.generate_content(model=model, contents=contents, config=config)
        except errors.APIError as e:
            if e.code == 429 or e.code >= 500:
                raise RetryableError(f"Gemini HTTP {e.code}", _retry_after(e)) from e
            raise
        except httpx.TransportError as e:
            raise RetryableError(f"Gemini network error: {type(e).__name__}: {e}") from e
        usage = resp.usage_metadata
        # Thinking tokens are billed as output.
        output_tokens = (usage.candidates_token_count or 0) + (usage.thoughts_token_count or 0)
        return (resp.text or "", usage.prompt_token_count or 0, output_tokens)
