"""comment likes

Revision ID: b9c0d1e2f3a4
Revises: a8b9c0d1e2f3
Create Date: 2026-09-19 20:15:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b9c0d1e2f3a4"
down_revision: str | None = "a8b9c0d1e2f3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event_comments",
        sa.Column("like_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_table(
        "comment_likes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("comment_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_comment_likes_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["comment_id"],
            ["event_comments.id"],
            name=op.f("fk_comment_likes_comment_id_event_comments"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "comment_id", name=op.f("pk_comment_likes")),
    )


def downgrade() -> None:
    op.drop_table("comment_likes")
    op.drop_column("event_comments", "like_count")
