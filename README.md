# Pathly — Study Assistant

Group 04 Repository for CS252 Virtual Assistant project.

## Prerequisites

- Python 3.10 or higher for the CLI and FastAPI backend
- Node.js 24.22.1 LTS or a newer Node 24 LTS patch for the web interface
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
   python -m pip install -e ".[dev]"
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

## Run the web interface

The Pathly interface is a separate React application. From the repository root:

```bash
cd ui
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.
See [`ui/README.md`](ui/README.md) for download instructions, supported platforms,
production builds, troubleshooting, and prototype limitations.

## Run the backend and connected workspace

From the repository root, after activating `.venv`:

```bash
python -m uvicorn assistant.backend.main:app --app-dir src --host 127.0.0.1 --port 8000
```

Windows users can also run `scripts\start_backend.cmd` without activating the environment.
Open [API documentation](http://127.0.0.1:8000/docs), or start the UI in another terminal
and choose **Workspace**. Create an account, add a task and availability, preview and save
a plan, then check in when a session starts. Workspace also supports team invitations,
task sharing, common free time, progress reports, reminders and companion chat.

The default database is a local `pathly.db` file. Copy `.env.example` to `.env` to configure
PostgreSQL or a Gemini/OpenAI-compatible service. No API key is needed for the labeled
offline companion. API credentials belong in the backend `.env`.

The original Home, Schedule, Progress, Library and AI Reporter pages remain the course
demo; account-backed data is in **Workspace**. See [Minh's handoff](docs/minh-handoff.md)
for assignment coverage, API contracts, the scheduling algorithm and provider configuration.

Run the disposable backend walkthrough with a simulated clock:

```bash
python scripts/demo_backend.py
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
├── scripts/            # Setup, backend launcher, demo and OpenAPI export
├── src/assistant/      # CLI and FastAPI backend package
├── tests/              # Test suite (smoke and unit tests)
├── ui/                 # React + TypeScript Pathly web interface
├── pyproject.toml      # Project configuration and metadata
└── requirements.txt    # Python dependencies
```
