"""Initial Study Companion schema (9 tables + cards due index).

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-25
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), server_default=sa.text("'student'"), nullable=False),
        sa.Column("account_level", sa.Text(), server_default=sa.text("'university'"), nullable=False),
        sa.Column("birth_year", sa.Integer(), nullable=True),
        sa.Column("companion_mode", sa.Text(), server_default=sa.text("'buddy'"), nullable=False),
        sa.Column("adult_verified", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("failed_login_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("locked_until", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "courses",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("owner_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("level", sa.Text(), server_default=sa.text("'university'"), nullable=False),
        sa.Column("language", sa.Text(), server_default=sa.text("'vi'"), nullable=False),
        sa.Column("created_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sources",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("course_id", sa.Text(), nullable=False),
        sa.Column("file_name", sa.Text(), nullable=False),
        sa.Column("page", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.CheckConstraint("page >= 1", name="ck_sources_page"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "file_name", "page"),
    )

    op.create_table(
        "concepts",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("course_id", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("bloom_level", sa.Text(), server_default=sa.text("'understand'"), nullable=False),
        sa.Column("source_pages", sa.Text(), nullable=True),
        sa.Column("confirmed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "slug"),
    )

    op.create_table(
        "prereqs",
        sa.Column("parent_id", sa.Text(), nullable=False),
        sa.Column("child_id", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), server_default=sa.text("'strict'"), nullable=False),
        sa.Column("confidence", sa.Float(), server_default=sa.text("1.0"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["child_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("parent_id", "child_id"),
    )

    op.create_table(
        "items",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("concept_id", sa.Text(), nullable=False),
        sa.Column("source_id", sa.Text(), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("choices", sa.Text(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("rubric", sa.Text(), nullable=True),
        sa.Column("graded", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'draft'"), nullable=False),
        sa.ForeignKeyConstraint(["concept_id"], ["concepts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "cards",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("item_id", sa.Text(), nullable=False),
        sa.Column("fsrs_state", sa.Text(), nullable=False),
        sa.Column("due_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "item_id"),
    )
    op.create_index("idx_cards_user_due", "cards", ["user_id", "due_at"], unique=False)

    op.create_table(
        "reviews",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("item_id", sa.Text(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("hints_used", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("reviewed_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("rating BETWEEN 1 AND 4", name="ck_reviews_rating"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_reviews_user", "reviews", ["user_id", "reviewed_at"], unique=False)

    op.create_table(
        "companion_events",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # Reverse foreign-key order so SQLite and PostgreSQL can both drop cleanly.
    op.drop_table("companion_events")
    op.drop_index("idx_reviews_user", table_name="reviews")
    op.drop_table("reviews")
    op.drop_index("idx_cards_user_due", table_name="cards")
    op.drop_table("cards")
    op.drop_table("items")
    op.drop_table("prereqs")
    op.drop_table("concepts")
    op.drop_table("sources")
    op.drop_table("courses")
    op.drop_table("users")
