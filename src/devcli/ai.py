"""AI implementation commands: benchmark checks and the assistant itself."""
from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

from devcli import ROOT

BENCHMARK = ROOT / "eval" / "benchmark.jsonl"
REQUIRED = ("id", "use_case", "kind", "question", "expected")
KINDS = {"normal", "missing_knowledge", "privacy", "safety"}
USE_CASE_RE = re.compile(r"^UC-\d{2}$")


def load_cases(path: Path) -> tuple[list[dict], list[str]]:
    """Parse a benchmark file and return (cases, errors)."""
    cases: list[dict] = []
    errors: list[str] = []
    seen: set[str] = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            case = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"dòng {n}: JSON lỗi ({exc.msg})")
            continue
        missing = [k for k in REQUIRED if not case.get(k)]
        if missing:
            errors.append(f"dòng {n}: thiếu trường {', '.join(missing)}")
        if case.get("kind") and case["kind"] not in KINDS:
            errors.append(f"dòng {n}: kind '{case['kind']}' không thuộc {sorted(KINDS)}")
        if case.get("use_case") and not USE_CASE_RE.match(case["use_case"]):
            errors.append(f"dòng {n}: use_case '{case['use_case']}' phải có dạng UC-01")
        if case.get("id") in seen:
            errors.append(f"dòng {n}: id '{case['id']}' bị trùng")
        seen.add(case.get("id"))
        cases.append(case)
    return cases, errors


def _benchmark(args: argparse.Namespace) -> int:
    path = Path(args.file)
    if not path.exists():
        print(f"Không tìm thấy {path}.")
        return 1
    cases, errors = load_cases(path)
    for err in errors:
        print(f"[FAIL] {err}")
    if args.action == "stats":
        print(f"Tổng số case: {len(cases)}")
        for key in ("kind", "use_case"):
            counts = Counter(c.get(key, "?") for c in cases)
            print(f"Theo {key}: " + ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))
    if not errors:
        print(f"[ OK ] {len(cases)} case hợp lệ trong {path.name}")
    return 1 if errors else 0


def _chat(args: argparse.Namespace) -> int:
    from assistant.__main__ import main as assistant_main

    return assistant_main(args.question)


def register(sub: argparse._SubParsersAction) -> None:
    p = sub.add_parser("ai", help="AI implementation: benchmark và trợ lý")
    ai_sub = p.add_subparsers(dest="ai_command", required=True)

    bench = ai_sub.add_parser("benchmark", help="kiểm tra hoặc thống kê eval/benchmark.jsonl")
    bench.add_argument("action", choices=["validate", "stats"])
    bench.add_argument("--file", default=str(BENCHMARK))
    bench.set_defaults(func=_benchmark)

    chat = ai_sub.add_parser("chat", help="chạy trợ lý (hỏi một câu, hoặc chế độ tương tác)")
    chat.add_argument("question", nargs="*")
    chat.set_defaults(func=_chat)
