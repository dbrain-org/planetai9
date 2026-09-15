"""news submitter profile + author status + admin secret

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-15 15:10:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "news_submissions",
        sa.Column("submitter_profession", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "news_submissions",
        sa.Column("submitter_company", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "authors",
        sa.Column(
            "status",
            sa.String(length=12),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
    )
    op.add_column("authors", sa.Column("email", sa.String(length=200), nullable=True))
    op.add_column("authors", sa.Column("application_note", sa.Text(), nullable=True))
    op.create_table(
        "site_credentials",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("secret_hash", sa.String(length=64), nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_site_credentials")),
        sa.UniqueConstraint("kind", name="uq_site_credentials_kind"),
    )


def downgrade() -> None:
    op.drop_table("site_credentials")
    op.drop_column("authors", "application_note")
    op.drop_column("authors", "email")
    op.drop_column("authors", "status")
    op.drop_column("news_submissions", "submitter_company")
    op.drop_column("news_submissions", "submitter_profession")
