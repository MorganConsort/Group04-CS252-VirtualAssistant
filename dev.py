"""Developer CLI entry point, no install needed:  python dev.py --help"""
import sys
from pathlib import Path

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
    from devcli.__main__ import main

    raise SystemExit(main())
