"""author api_key_hash + is_moderator

Revision ID: a1b2c3d4e5f6
Revises: f3a9c7d21b44
Create Date: 2026-09-15 10:15:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "f3a9c7d21b44"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("authors", sa.Column("api_key_hash", sa.String(length=64), nullable=True))
    op.add_column(
        "authors",
        sa.Column("is_moderator", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("authors", "is_moderator")
    op.drop_column("authors", "api_key_hash")
