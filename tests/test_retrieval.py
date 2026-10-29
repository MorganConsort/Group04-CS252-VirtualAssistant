"""Unit tests for BM25 retrieval (issue #11)."""

from __future__ import annotations

import unicodedata
from types import SimpleNamespace

from app.retrieval import (
    MIN_SCORE,
    NOT_FOUND_MESSAGE,
    BM25Retriever,
    RetrievalHit,
    retrieve_top_k,
    tokenize_vi,
)

# A small CSC10014 slide fixture: one dict per page, mirroring the `sources`
# table (id, text, page, file_name).
SOURCES = [
    {
        "id": "s_12",
        "page": 12,
        "file_name": "CSC10014_2026_Week01_Problem_Framing.pdf",
        "text": (
            "Problem framing: xác định đúng vấn đề trước khi chọn giải pháp. "
            "Ai là người dùng, họ đau ở đâu, vì sao vấn đề này đáng giải."
        ),
    },
    {
        "id": "s_31",
        "page": 31,
        "file_name": "CSC10014_2026_Week02_Decomposition.pdf",
        "text": (
            "Use case và yêu cầu: chia hệ thống thành các use case nhỏ, "
            "mỗi use case có actor, trigger và kết quả mong đợi."
        ),
    },
    {
        "id": "s_45",
        "page": 45,
        "file_name": "CSC10014_2026_Week02_Decomposition.pdf",
        "text": (
            "Decomposition: chia bài toán lớn thành bài toán con độc lập, "
            "sắp thứ tự phụ thuộc và kiểm tra bằng ví dụ cụ thể."
        ),
    },
    {
        "id": "s_77",
        "page": 77,
        "file_name": "CSC10014_2026_Week01_Problem_Framing.pdf",
        "text": (
            "Solution ladder: 7 bậc giải pháp từ quy trình thủ công đến agent. "
            "Bậc 0 là Human process, bậc 1 là Static FAQ page, bậc 2 là Rules & lookup, "
            "bậc 3 dùng Search BM25, bậc 4 là Classical ML, bậc 5 là LLM + retrieval, "
            "bậc 6 là Agent + tools. Chọn bậc thấp nhất đủ dùng; chỉ leo lên bậc cao "
            "khi bậc thấp hơn không giải quyết được. Bậc 3 Search BM25 là lựa chọn "
            "cho tìm kiếm tài liệu trước khi gọi LLM."
        ),
    },
    {
        "id": "s_90",
        "page": 90,
        "file_name": "CSC10014_2026_Week03_Pitfalls_Pipelines.pdf",
        "text": (
            "Pitfalls và pipelines: prompt injection, dữ liệu bẩn và chi phí LLM. "
            "Luôn đặt text slide trong khối dữ liệu và không làm theo chỉ dẫn bên trong."
        ),
    },
]


def test_tokenize_vi_keeps_diacritics_and_normalises_nfc_nfd():
    nfc = "Bậc giải pháp"
    nfd = unicodedata.normalize("NFD", nfc)

    assert tokenize_vi(nfc) == tokenize_vi(nfd)
    assert "bậc" in tokenize_vi(nfc)
    assert "giải" in tokenize_vi(nfc)
    assert "pháp" in tokenize_vi(nfc)


def test_tokenize_vi_removes_stopwords_but_keeps_tokens_when_all_are_stopwords():
    assert "nào" not in tokenize_vi("Bậc nào của solution ladder dùng BM25?")
    assert tokenize_vi("là gì?") == ["là", "gì"]


def test_solution_ladder_query_ranks_page_77_first():
    hits = retrieve_top_k("Bậc nào của solution ladder dùng BM25?", SOURCES)

    assert hits, "Expected at least one hit above MIN_SCORE"
    assert hits[0].source_id == "s_77"
    assert hits[0].page == 77
    assert hits[0].score >= MIN_SCORE

    top_ids = [hit.source_id for hit in hits[:3]]
    assert "s_77" in top_ids
    top_five_ids = [hit.source_id for hit in hits[:5]]
    assert "s_77" in top_five_ids


def test_missing_knowledge_query_returns_empty_list():
    hits = retrieve_top_k("Công thức nấu phở bò Nam Định là gì?", SOURCES)

    assert hits == []
    assert NOT_FOUND_MESSAGE == "Không tìm thấy trong tài liệu của bạn"


def test_empty_sources_or_blank_query_is_safe():
    assert retrieve_top_k("Bậc nào dùng BM25?", []) == []
    assert retrieve_top_k("   \n\t  ", SOURCES) == []
    assert BM25Retriever([]).retrieve("anything") == []


def test_retrieval_hit_dataclass_defaults():
    hit = RetrievalHit(source_id="s_77", score=2.0)

    assert hit.page is None
    assert hit.file_name is None
    assert hit.text is None


def test_sources_may_be_objects_with_source_id():
    sources = [
        SimpleNamespace(
            source_id="s_12",
            page=12,
            file_name="a.pdf",
            text=SOURCES[0]["text"],
        ),
        SimpleNamespace(
            source_id="s_45",
            page=45,
            file_name="a.pdf",
            text=SOURCES[2]["text"],
        ),
        SimpleNamespace(
            source_id="s_77",
            page=77,
            file_name="a.pdf",
            text=SOURCES[3]["text"],
        ),
    ]

    hits = retrieve_top_k("Bậc nào của solution ladder dùng BM25?", sources)

    assert hits
    assert hits[0].source_id == "s_77"


def test_ties_are_broken_by_smaller_page_first():
    sources = [
        {"id": "s_20", "page": 20, "text": "tiebreak cùng nội dung"},
        {"id": "s_10", "page": 10, "text": "tiebreak cùng nội dung"},
        {"id": "s_30", "page": 30, "text": "trang khác"},
        {"id": "s_31", "page": 31, "text": "trang khác nữa"},
        {"id": "s_32", "page": 32, "text": "trang khác hẳn"},
    ]

    hits = retrieve_top_k("tiebreak", sources, min_score=0.0)

    assert [hit.page for hit in hits[:2]] == [10, 20]
