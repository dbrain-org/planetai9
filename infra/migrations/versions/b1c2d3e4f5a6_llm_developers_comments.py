"""llm_developers + developer_comments for Türkiye LLM vitrin

Revision ID: b1c2d3e4f5a6
Revises: b9c0d1e2f3a4
Create Date: 2026-09-21 15:50:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "b9c0d1e2f3a4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "llm_developers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("kind", sa.String(length=12), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("website_url", sa.Text(), nullable=True),
        sa.Column("hf_url", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("lat", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("lng", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("radar_slug", sa.String(length=160), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(
        "ix_llm_developers_published", "llm_developers", ["published", "sort_order"]
    )
    op.create_index("ix_llm_developers_radar_slug", "llm_developers", ["radar_slug"])

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


def downgrade() -> None:
    op.drop_index("ix_developer_comments_status", table_name="developer_comments")
    op.drop_index("ix_developer_comments_dev_status", table_name="developer_comments")
    op.drop_table("developer_comments")
    op.drop_index("ix_llm_developers_radar_slug", table_name="llm_developers")
    op.drop_index("ix_llm_developers_published", table_name="llm_developers")
    op.drop_table("llm_developers")
