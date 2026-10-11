# Study Assistant — starter

Group 04 Repository for CS252 Virtual Assistant project.

## Prerequisites

- Python 3.10 or higher
- Git

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```

2. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     source .venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Verify your environment:
   ```bash
   python scripts/check_env.py
   ```

## Run

Run the assistant interactively:
```bash
python -m assistant
```

Or pass a single question directly:
```bash
python -m assistant "where is the training office?"
```

## Test

Run unit tests:
```bash
pytest tests/
```

## Project Structure

```text
├── .github/workflows/  # CI/CD workflows (linting, tests)
├── data/               # Datasets and lookup tables (offices.csv)
├── docs/               # Architecture documents, ADRs, logs
├── scripts/            # Setup and utility scripts (check_env.py)
├── src/assistant/      # Application package and rule engine
├── tests/              # Test suite (smoke and unit tests)
├── ui/                 # UI components
├── pyproject.toml      # Project configuration and metadata
└── requirements.txt    # Python dependencies
```
