"""Database and Security commands: local schema and a secret scan."""
from __future__ import annotations

import argparse
import re
import sqlite3
import subprocess
from pathlib import Path

from devcli import ROOT

SCHEMA = ROOT / "db" / "schema.sql"
LOCAL_DB = ROOT / "data" / "local.db"

SECRET_PATTERNS = {
    "OpenAI key": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "Google API key": re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"),
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}


def init_db(path: Path) -> list[str]:
    """Create the schema in a SQLite file and return the table names."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA.read_text(encoding="utf-8"))
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
    return [r[0] for r in rows]


def scan_text(text: str) -> list[str]:
    """Return the names of secret patterns found in text."""
    return [name for name, pattern in SECRET_PATTERNS.items() if pattern.search(text)]


def tracked_files() -> list[Path]:
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=False).stdout
    return [ROOT / line for line in out.splitlines() if line]


def _init(args: argparse.Namespace) -> int:
    path = Path(args.db)
    if args.reset and path.exists():
        path.unlink()
    tables = init_db(path)
    print(f"[ OK ] {path}: {len(tables)} bảng ({', '.join(tables)})")
    return 0


def _scan(args: argparse.Namespace) -> int:
    hits = 0
    for file in tracked_files():
        if not file.is_file() or file.suffix in {".png", ".jpg", ".pdf", ".db", ".svg"}:
            continue
        found = scan_text(file.read_text(encoding="utf-8", errors="ignore"))
        if file.name == ".env" or file.name.startswith(".env."):
            found.append(".env file is tracked by git")
        for name in found:
            hits += 1
            print(f"[FAIL] {file.relative_to(ROOT)}: {name}")
    print("[ OK ] Không thấy secret trong các file git đang theo dõi." if not hits else f"{hits} vấn đề.")
    return 1 if hits else 0


def register(sub: argparse._SubParsersAction) -> None:
    p = sub.add_parser("db", help="Database & Security: schema cục bộ và quét secret")
    db_sub = p.add_subparsers(dest="db_command", required=True)

    init = db_sub.add_parser("init", help="tạo database SQLite cục bộ từ db/schema.sql")
    init.add_argument("--db", default=str(LOCAL_DB))
    init.add_argument("--reset", action="store_true", help="xóa file database cũ trước khi tạo")
    init.set_defaults(func=_init)

    scan = db_sub.add_parser("scan-secrets", help="tìm API key, token, private key trong repo")
    scan.set_defaults(func=_scan)
