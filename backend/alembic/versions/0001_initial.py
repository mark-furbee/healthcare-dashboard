"""Create patients, allergies and conditions tables."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False, index=True),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("phone", sa.String(), nullable=False),
        sa.Column("address", sa.String(), nullable=False),
        sa.Column("blood_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("last_visit", sa.Date(), nullable=True),
    )
    op.create_table(
        "allergies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
    )
    op.create_table(
        "conditions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
    )
    op.create_table(
        "patient_allergies",
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "allergy_id",
            sa.Integer(),
            sa.ForeignKey("allergies.id", ondelete="RESTRICT"),
            primary_key=True,
            index=True,
        ),
    )
    op.create_table(
        "patient_conditions",
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "condition_id",
            sa.Integer(),
            sa.ForeignKey("conditions.id", ondelete="RESTRICT"),
            primary_key=True,
            index=True,
        ),
    )


def downgrade():
    op.drop_table("patient_conditions")
    op.drop_table("patient_allergies")
    op.drop_table("conditions")
    op.drop_table("allergies")
    op.drop_table("patients")
