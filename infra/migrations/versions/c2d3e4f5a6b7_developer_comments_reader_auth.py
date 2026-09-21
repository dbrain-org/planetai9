"""developer_comments: switch to logged-in reader comments (like news)

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-09-21 17:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("ix_developer_comments_status", table_name="developer_comments")
    op.drop_index("ix_developer_comments_dev_status", table_name="developer_comments")
    op.drop_table("developer_comments")

    op.create_table(
        "developer_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("developer_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="active"),
        sa.Column("like_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["developer_id"], ["llm_developers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["developer_comments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_developer_comments_dev",
        "developer_comments",
        ["developer_id", "created_at"],
    )
    op.create_index("ix_developer_comments_user", "developer_comments", ["user_id"])
    op.create_index("ix_developer_comments_parent", "developer_comments", ["parent_id"])

    op.create_table(
        "developer_comment_likes",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("comment_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["comment_id"], ["developer_comments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "comment_id"),
    )


def downgrade() -> None:
    op.drop_table("developer_comment_likes")
    op.drop_index("ix_developer_comments_parent", table_name="developer_comments")
    op.drop_index("ix_developer_comments_user", table_name="developer_comments")
    op.drop_index("ix_developer_comments_dev", table_name="developer_comments")
    op.drop_table("developer_comments")

    op.create_table(
        "developer_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("developer_id", sa.Uuid(), nullable=False),
        sa.Column("author_name", sa.String(length=120), nullable=False),
        sa.Column("author_email", sa.String(length=200), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="pending"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["developer_id"], ["llm_developers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_developer_comments_dev_status",
        "developer_comments",
        ["developer_id", "status", "created_at"],
    )
    op.create_index(
        "ix_developer_comments_status", "developer_comments", ["status", "created_at"]
    )
