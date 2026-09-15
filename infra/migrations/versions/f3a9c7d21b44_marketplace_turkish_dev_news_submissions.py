"""marketplace turkish-dev flag + news submissions

Revision ID: f3a9c7d21b44
Revises: d0e494bf775e
Create Date: 2026-09-13 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3a9c7d21b44"
down_revision: str | None = "d0e494bf775e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:

    op.add_column(
        "marketplace_apps",
        sa.Column(
            "is_turkish_dev", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
    )

    op.create_table(
        "news_submissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("submitter_name", sa.String(length=120), nullable=True),
        sa.Column("submitter_email", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=12), nullable=False, server_default="pending"),
        sa.Column("event_id", sa.Uuid(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["event_id"],
            ["events.id"],
            name=op.f("fk_news_submissions_event_id_events"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_news_submissions")),
    )
    op.create_index("ix_news_submissions_status", "news_submissions", ["status"], unique=False)


def downgrade() -> None:

    op.drop_index("ix_news_submissions_status", table_name="news_submissions")
    op.drop_table("news_submissions")
    op.drop_column("marketplace_apps", "is_turkish_dev")
