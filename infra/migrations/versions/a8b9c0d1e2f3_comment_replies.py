"""comment replies (parent_id)

Revision ID: a8b9c0d1e2f3
Revises: f7a8b9c0d1e2
Create Date: 2026-09-19 20:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a8b9c0d1e2f3"
down_revision: str | None = "f7a8b9c0d1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "event_comments",
        sa.Column("parent_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_event_comments_parent_id_event_comments"),
        "event_comments",
        "event_comments",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_event_comments_parent", "event_comments", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_event_comments_parent", table_name="event_comments")
    op.drop_constraint(
        op.f("fk_event_comments_parent_id_event_comments"),
        "event_comments",
        type_="foreignkey",
    )
    op.drop_column("event_comments", "parent_id")
