"""BM25 retrieval over slide pages (issue #11).

The retriever works on the ``sources`` table / fixture rows: one row per page
with ``id`` (or ``source_id``), ``text``, ``page`` and ``file_name``. Vietnamese
diacritics are preserved; only Unicode composition is normalised so NFC and NFD
inputs produce the same tokens.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from rank_bm25 import BM25Okapi

MIN_SCORE: float = 1.5
NOT_FOUND_MESSAGE: str = "Không tìm thấy trong tài liệu của bạn"

# Hư từ / từ để hỏi phổ biến. Removing them keeps BM25 scores focused on
# content words, which matters for out-of-document (missing_knowledge) queries.
VIETNAMESE_STOPWORDS: frozenset[str] = frozenset(
    {
        "là",
        "và",
        "của",
        "có",
        "cho",
        "trong",
        "các",
        "một",
        "những",
        "được",
        "với",
        "thế",
        "nào",
        "gì",
        "ở",
        "đâu",
        "ại",
        "sao",
        "như",
        "khi",
        "để",
        "này",
        "đó",
    }
)

_WORD_RE = re.compile(r"\w+", flags=re.UNICODE)
# BM25Okapi divides by the average document length. A stopword-only page would
# otherwise contribute an empty document and break that division.
_EMPTY_TOKEN = "__empty__"


@dataclass
class RetrievalHit:
    """One retrieved page, with enough metadata to render a citation chip."""

    source_id: str
    score: float
    page: int | None = None
    file_name: str | None = None
    text: str | None = None


def tokenize_vi(text: str, remove_stopwords: bool = True) -> list[str]:
    """Tokenize Vietnamese text while keeping diacritics.

    ``NFC`` normalisation makes a composed ``"bậc"`` and a decomposed ``NFD``
    ``"bậc"`` collapse to the same token. When stopword removal would leave no
    tokens at all, the original tokens are returned so a query such as
    ``"là gì?"`` is not silently turned into an empty query.
    """
    if not text:
        return []

    normalized = unicodedata.normalize("NFC", text.lower())
    tokens = _WORD_RE.findall(normalized)
    if not remove_stopwords:
        return tokens

    meaningful = [token for token in tokens if token not in VIETNAMESE_STOPWORDS]
    return meaningful or tokens


def _field(source: Any, name: str, default: Any = None) -> Any:
    """Read a field from a dict, an object, or a SQLAlchemy ``Row``."""
    if isinstance(source, Mapping):
        return source.get(name, default)
    if hasattr(source, name):
        return getattr(source, name)
    mapping = getattr(source, "_mapping", None)
    if mapping is not None:
        return mapping.get(name, default)
    return default


def _source_id(source: Any) -> str:
    value = _field(source, "id")
    if value is None:
        value = _field(source, "source_id")
    return "" if value is None else str(value)


def _source_text(source: Any) -> str:
    value = _field(source, "text", "")
    return "" if value is None else str(value)


def _source_page(source: Any) -> int | None:
    value = _field(source, "page")
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _source_file_name(source: Any) -> str | None:
    value = _field(source, "file_name")
    return None if value is None else str(value)


class BM25Retriever:
    """Rank slide pages for a query with :class:`rank_bm25.BM25Okapi`."""

    def __init__(self, sources: Sequence[Any]) -> None:
        self.sources = list(sources)
        self._ids = [_source_id(source) for source in self.sources]
        self._texts = [_source_text(source) for source in self.sources]
        self._pages = [_source_page(source) for source in self.sources]
        self._file_names = [_source_file_name(source) for source in self.sources]

        corpus = [tokenize_vi(text) or [_EMPTY_TOKEN] for text in self._texts]
        self._bm25 = BM25Okapi(corpus) if corpus else None

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = MIN_SCORE,
    ) -> list[RetrievalHit]:
        """Return at most ``top_k`` pages scoring at least ``min_score``.

        If the best score is below ``min_score`` (or non-positive), the result
        is empty: callers then show :data:`NOT_FOUND_MESSAGE` instead of asking
        the LLM. Ties are broken by page number, then input order, so the output
        is deterministic.
        """
        if self._bm25 is None or top_k <= 0:
            return []

        query_tokens = tokenize_vi(query)
        if not query_tokens:
            return []

        scores = [float(score) for score in self._bm25.get_scores(query_tokens)]
        if not scores:
            return []

        best_score = max(scores)
        if best_score < min_score or best_score <= 0.0:
            return []

        ranked = sorted(
            enumerate(scores),
            key=lambda item: (
                -item[1],
                self._pages[item[0]]
                if self._pages[item[0]] is not None
                else float("inf"),
                item[0],
            ),
        )

        hits: list[RetrievalHit] = []
        for index, score in ranked:
            if score < min_score:
                break
            hits.append(
                RetrievalHit(
                    source_id=self._ids[index],
                    score=score,
                    page=self._pages[index],
                    file_name=self._file_names[index],
                    text=self._texts[index],
                )
            )
            if len(hits) >= top_k:
                break
        return hits


def retrieve_top_k(
    query: str,
    sources: list[dict[str, Any]] | Sequence[Any],
    top_k: int = 5,
    min_score: float = MIN_SCORE,
) -> list[RetrievalHit]:
    """Convenience wrapper: build a retriever and return the top-``k`` hits."""
    if not sources:
        return []
    return BM25Retriever(sources).retrieve(query, top_k=top_k, min_score=min_score)
