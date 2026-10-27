"""Alembic environment.

The database URL always comes from ``DATABASE_URL`` so local runs use SQLite
and staging/production use PostgreSQL without editing files:

    DATABASE_URL=sqlite:///./local.db alembic upgrade head
    DATABASE_URL=postgresql+psycopg://... alembic upgrade head
"""

from __future__ import annotations

import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import create_engine, event, pool
from sqlalchemy.engine import make_url

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

# No ORM models yet: migrations are the source of truth and are written by hand
# to mirror db/schema.sql. Set this once models are introduced.
target_metadata = None


def _ensure_sqlite_directory(database_url: str) -> None:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return
    database = url.database
    if database and database != ":memory:" and not database.startswith("file:"):
        Path(database).expanduser().parent.mkdir(parents=True, exist_ok=True)


def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys = ON")
    finally:
        cursor.close()


def run_migrations_offline() -> None:
    """Run migrations without a DBAPI connection (emit SQL)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database."""
    _ensure_sqlite_directory(DATABASE_URL)
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    if connectable.dialect.name == "sqlite":
        event.listen(connectable, "connect", _enable_sqlite_foreign_keys)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=connectable.dialect.name == "sqlite",
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
