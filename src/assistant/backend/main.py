"""Run: python -m uvicorn assistant.backend.main:app --app-dir src --reload."""

from contextlib import asynccontextmanager
from threading import RLock

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import routes_ai, routes_auth, routes_schedule, routes_tasks, routes_teams
from .config import Settings
from .database import Database
from .models import utcnow


def create_app(settings: Settings | None = None, *, now=utcnow, ai_transport=None):
    settings = settings or Settings.from_env()
    database = Database(settings.database_url)

    @asynccontextmanager
    async def lifespan(app):
        database.create_schema()
        yield
        database.engine.dispose()

    application = FastAPI(
        title="Pathly Scheduling & AI Companion API",
        version="0.2.0",
        lifespan=lifespan,
        description="CS252 Group 04 — Minh's Backend/Scheduler and AI integration. "
        "Register or log in, then use Authorize with the returned access_token.",
    )
    application.state.database = database
    application.state.settings = settings
    application.state.now = now
    application.state.ai_transport = ai_transport
    application.state.schedule_lock = RLock()
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    for router in (
        routes_auth.router,
        routes_tasks.router,
        routes_schedule.router,
        routes_teams.router,
        routes_ai.router,
    ):
        application.include_router(router)

    @application.get("/health", tags=["Health"])
    def health():
        return {
            "status": "ok",
            "ai_provider": "llm" if settings.llm_model else "offline",
        }

    return application


app = create_app()
