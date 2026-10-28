"""Developer CLI: one command group per development domain (ui, ai, db, qa, devops)."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run(cmd: list[str], cwd: Path = ROOT) -> int:
    """Run a command, stream its output, and return its exit code."""
    print(f"$ {' '.join(cmd)}")
    try:
        env = {**os.environ, "PYTHONPATH": os.pathsep.join(filter(None, [str(ROOT / "src"), os.environ.get("PYTHONPATH")]))}
        return subprocess.run(cmd, cwd=cwd, env=env, check=False).returncode
    except FileNotFoundError:
        print(f"Không tìm thấy lệnh '{cmd[0]}'. Hãy cài đặt nó trước (xem README).", file=sys.stderr)
        return 127
