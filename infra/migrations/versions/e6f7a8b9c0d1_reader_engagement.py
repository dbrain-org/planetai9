"""reader engagement: users, sessions, likes, comments, event counters

Revision ID: e6f7a8b9c0d1
Revises: d4e5f6a7b8c9
Create Date: 2026-09-19 16:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: str | None = "d4e5f6a7b8c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "events",
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "events",
        sa.Column("like_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "events",
        sa.Column("comment_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index("ix_events_view_count", "events", ["view_count"])
    op.create_index("ix_events_comment_count", "events", ["comment_count"])

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "auth_magic_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_magic_links")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_auth_magic_links_token_hash")),
    )
    op.create_index("ix_auth_magic_email", "auth_magic_links", ["email"])

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("ip", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_user_sessions_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_sessions_token_hash")),
    )
    op.create_index("ix_user_sessions_user", "user_sessions", ["user_id"])

    op.create_table(
        "event_likes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], name=op.f("fk_event_likes_event_id_events"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_event_likes_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "event_id", name=op.f("pk_event_likes")),
    )

    op.create_table(
        "event_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("event_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], name=op.f("fk_event_comments_event_id_events"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_event_comments_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_event_comments")),
    )
    op.create_index("ix_event_comments_event", "event_comments", ["event_id", "created_at"])
    op.create_index("ix_event_comments_user", "event_comments", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_event_comments_user", table_name="event_comments")
    op.drop_index("ix_event_comments_event", table_name="event_comments")
    op.drop_table("event_comments")
    op.drop_table("event_likes")
    op.drop_index("ix_user_sessions_user", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_auth_magic_email", table_name="auth_magic_links")
    op.drop_table("auth_magic_links")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_events_comment_count", table_name="events")
    op.drop_index("ix_events_view_count", table_name="events")
    op.drop_column("events", "comment_count")
    op.drop_column("events", "like_count")
    op.drop_column("events", "view_count")
