"""course cover urls for education cards

Revision ID: g6a7b8c9d0e1
Revises: f5a6b7c8d9e0
Create Date: 2026-09-27 14:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g6a7b8c9d0e1"
down_revision: str | None = "f5a6b7c8d9e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("curated_links", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("curated_links", "image_url")
