"""llm_developers: linkedin_url + github_url

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-09-22 16:50:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("llm_developers", sa.Column("linkedin_url", sa.Text(), nullable=True))
    op.add_column("llm_developers", sa.Column("github_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("llm_developers", "github_url")
    op.drop_column("llm_developers", "linkedin_url")
