"""views, likes, and shares for columns

Revision ID: h7b8c9d0e1f2
Revises: g6a7b8c9d0e1
Create Date: 2026-09-28 14:50:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "h7b8c9d0e1f2"
down_revision: str | None = "g6a7b8c9d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for name in ("view_count", "like_count", "share_count"):
        op.add_column(
            "opinion_posts",
            sa.Column(name, sa.Integer(), nullable=False, server_default="0"),
        )
    op.create_table(
        "column_likes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_column_likes_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["opinion_posts.id"],
            name=op.f("fk_column_likes_post_id_opinion_posts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "post_id", name=op.f("pk_column_likes")),
    )


def downgrade() -> None:
    op.drop_table("column_likes")
    for name in ("share_count", "like_count", "view_count"):
        op.drop_column("opinion_posts", name)
