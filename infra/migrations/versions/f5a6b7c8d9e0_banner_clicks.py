"""banner click counts for DBrain product placements

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-09-25 11:20:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f5a6b7c8d9e0"
down_revision: str | None = "e4f5a6b7c8d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "banner_clicks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("banner_id", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_banner_clicks_banner",
        "banner_clicks",
        ["banner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_banner_clicks_banner", table_name="banner_clicks")
    op.drop_table("banner_clicks")
