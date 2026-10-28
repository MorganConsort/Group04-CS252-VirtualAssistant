"""DevOps commands: environment check, local CI, naming rules and git hooks."""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from devcli import ROOT, run
from devcli.conventions import check_branch, check_commit

HOOK = """#!/bin/sh
# Installed by: python dev.py devops install-hooks
python dev.py devops commit-msg --file "$1"
"""


def _check(args: argparse.Namespace) -> int:
    return run([sys.executable, "scripts/check_env.py"])


def _ci(args: argparse.Namespace) -> int:
    steps = [
        ["-m", "ruff", "check", "."],
        ["-m", "pytest", "tests/"],
        ["dev.py", "db", "scan-secrets"],
        ["dev.py", "ai", "benchmark", "validate"],
    ]
    failed = []
    for step in steps:
        if run([sys.executable, *step]) != 0:
            failed.append(" ".join(step))
    print("[ OK ] CI cục bộ đã pass." if not failed else f"[FAIL] Bước lỗi: {', '.join(failed)}")
    return 1 if failed else 0


def _branch(args: argparse.Namespace) -> int:
    name = args.name or subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout.strip()
    problem = check_branch(name)
    print(f"[FAIL] {problem}" if problem else f"[ OK ] Tên nhánh hợp lệ: {name}")
    return 1 if problem else 0


def _commit_msg(args: argparse.Namespace) -> int:
    message = Path(args.file).read_text(encoding="utf-8") if args.file else " ".join(args.message)
    problem = check_commit(message)
    print(f"[FAIL] {problem}" if problem else "[ OK ] Commit message hợp lệ.")
    return 1 if problem else 0


def _install_hooks(args: argparse.Namespace) -> int:
    hook = ROOT / ".git" / "hooks" / "commit-msg"
    if not hook.parent.exists():
        print("Không tìm thấy .git/hooks. Hãy chạy lệnh này trong repo đã clone.")
        return 1
    hook.write_text(HOOK, encoding="utf-8")
    hook.chmod(0o755)
    print(f"[ OK ] Đã cài {hook.relative_to(ROOT)}: commit sai cú pháp sẽ bị chặn.")
    return 0


def register(sub: argparse._SubParsersAction) -> None:
    p = sub.add_parser("devops", help="DevOps: kiểm tra môi trường, CI cục bộ, quy tắc branch/commit")
    ops = p.add_subparsers(dest="devops_command", required=True)

    ops.add_parser("check", help="chạy scripts/check_env.py").set_defaults(func=_check)
    ops.add_parser("ci", help="chạy lint + test + quét secret + kiểm tra benchmark").set_defaults(func=_ci)

    branch = ops.add_parser("branch", help="kiểm tra tên nhánh (mặc định: nhánh hiện tại)")
    branch.add_argument("name", nargs="?")
    branch.set_defaults(func=_branch)

    msg = ops.add_parser("commit-msg", help="kiểm tra cú pháp commit message")
    msg.add_argument("message", nargs="*")
    msg.add_argument("--file", help="đọc message từ file (dùng cho git hook)")
    msg.set_defaults(func=_commit_msg)

    ops.add_parser("install-hooks", help="cài git hook commit-msg").set_defaults(func=_install_hooks)
