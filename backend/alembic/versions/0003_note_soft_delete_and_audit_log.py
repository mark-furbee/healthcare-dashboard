"""Soft-delete notes and keep an audit log of deletions."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade():
    op.add_column("notes", sa.Column("deleted_at", sa.DateTime(timezone=True)))
    # No foreign key to patients: entries must outlive the patient they describe.
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False, index=True),
        sa.Column("note_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
    )


def downgrade():
    op.drop_table("audit_log")
    op.drop_column("notes", "deleted_at")
