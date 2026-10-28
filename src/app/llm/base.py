"""The one interface every LLM vendor adapter implements (spec 6.1)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResult:
    text: str
    input_tokens: int
    output_tokens: int
    cost_usd: float


class LLMClient(ABC):
    @abstractmethod
    def complete(self, prompt: str, *, system: str = "", json_schema: dict | None = None,
                 max_tokens: int = 1024, temperature: float = 0.2) -> LLMResult: ...
