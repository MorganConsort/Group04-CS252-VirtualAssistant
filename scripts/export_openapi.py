"""Export the API contract without creating a database or contacting the LLM."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from assistant.backend.config import Settings
from assistant.backend.main import create_app

if __name__ == "__main__":
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("docs/openapi.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    document = create_app(Settings(database_url="sqlite://")).openapi()
    destination.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Exported {len(document['paths'])} API paths to {destination}")
