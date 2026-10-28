"""Visual pass over a PDF (issue #9): a vision model notes what text extraction misses.

Diagrams, charts, image tables and scanned pages carry ideas that pypdf cannot read. The
notes are stored beside each page's text and read by concept extraction; they are never
cited, because they are model output, not the slide's own words.
"""
from __future__ import annotations

import json
import logging
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from app.llm import LLMClient

log = logging.getLogger("app.concepts")

PROMPT = Path(__file__).parent / "prompts" / "visual_v1.txt"
PAGES_PER_CALL = 20  # small enough that the model looks at every page closely
MAX_NOTE = 800
MAX_INLINE_BYTES = 14 * 1024 * 1024  # Gemini's 20 MB request limit counts base64 overhead
SCHEMA = {
    "type": "object",
    "properties": {
        "pages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"page": {"type": "integer"}, "notes": {"type": "string"}},
                "required": ["page", "notes"],
            },
        }
    },
    "required": ["pages"],
}


def read_visuals(llm: LLMClient, pdf: bytes, page_count: int) -> list[str]:
    """One note per page, "" when a page shows nothing beyond its text. Never raises."""
    notes = [""] * page_count
    system = PROMPT.read_text(encoding="utf-8")
    for first in range(0, page_count, PAGES_PER_CALL):
        last = min(first + PAGES_PER_CALL, page_count)
        # Optional enrichment: any failure (quota, bad JSON, oversized or odd PDF) only costs
        # these pages their notes, never the upload.
        try:
            chunk = pdf if (first, last) == (0, page_count) else _pages(pdf, first, last)
            if len(chunk) > MAX_INLINE_BYTES:
                raise ValueError(f"{len(chunk)} bytes is over the inline limit")
            answer = llm.complete(
                f"The attached PDF has {last - first} pages, numbered 1-{last - first}.",
                system=system, json_schema=SCHEMA, max_tokens=8192, temperature=0.2,
                pdf=chunk).text
            for item in json.loads(answer)["pages"]:
                number = item.get("page")
                if type(number) is int and 1 <= number <= last - first:
                    notes[first + number - 1] = str(item.get("notes") or "").strip()[:MAX_NOTE]
        except Exception as exc:  # noqa: BLE001
            log.warning("visuals: skipped pages %d-%d: %s", first + 1, last, exc)
    return notes


def _pages(pdf: bytes, first: int, last: int) -> bytes:
    """Pages first+1..last (1-based) as their own PDF."""
    writer = PdfWriter()
    for page in PdfReader(BytesIO(pdf)).pages[first:last]:
        writer.add_page(page)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()
