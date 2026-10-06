from datetime import date, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Table, orm

from .database import Base

patient_allergies = Table(
    "patient_allergies",
    Base.metadata,
    Column(
        "patient_id", ForeignKey("patients.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "allergy_id",
        ForeignKey("allergies.id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    ),
)
patient_conditions = Table(
    "patient_conditions",
    Base.metadata,
    Column(
        "patient_id", ForeignKey("patients.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "condition_id",
        ForeignKey("conditions.id", ondelete="RESTRICT"),
        primary_key=True,
        index=True,
    ),
)


class Allergy(Base):
    __tablename__ = "allergies"

    id: orm.Mapped[int] = orm.mapped_column(primary_key=True)
    name: orm.Mapped[str] = orm.mapped_column(unique=True)


class Condition(Base):
    __tablename__ = "conditions"

    id: orm.Mapped[int] = orm.mapped_column(primary_key=True)
    name: orm.Mapped[str] = orm.mapped_column(unique=True)


class Patient(Base):
    __tablename__ = "patients"

    id: orm.Mapped[int] = orm.mapped_column(primary_key=True)
    first_name: orm.Mapped[str]
    last_name: orm.Mapped[str] = orm.mapped_column(index=True)
    date_of_birth: orm.Mapped[date]
    email: orm.Mapped[str] = orm.mapped_column(unique=True)
    phone: orm.Mapped[str]
    address: orm.Mapped[str]
    blood_type: orm.Mapped[str]
    status: orm.Mapped[str]
    last_visit: orm.Mapped[date | None]
    allergies: orm.Mapped[list[Allergy]] = orm.relationship(
        secondary=patient_allergies, order_by=Allergy.name
    )
    conditions: orm.Mapped[list[Condition]] = orm.relationship(
        secondary=patient_conditions, order_by=Condition.name
    )
    # Every note, including soft-deleted ones, which go only with the patient.
    notes: orm.Mapped[list["Note"]] = orm.relationship(
        cascade="all, delete-orphan", order_by="Note.timestamp.desc()"
    )
    # The notes the app shows: not deleted, newest first.
    active_notes: orm.Mapped[list["Note"]] = orm.relationship(
        primaryjoin="and_(Patient.id == Note.patient_id, Note.deleted_at.is_(None))",
        order_by="Note.timestamp.desc()",
        viewonly=True,
    )

    @property
    def age(self) -> int:
        today = date.today()
        birthday_pending = (today.month, today.day) < (
            self.date_of_birth.month,
            self.date_of_birth.day,
        )
        return today.year - self.date_of_birth.year - birthday_pending


class Note(Base):
    __tablename__ = "notes"

    id: orm.Mapped[int] = orm.mapped_column(primary_key=True)
    patient_id: orm.Mapped[int] = orm.mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    timestamp: orm.Mapped[datetime] = orm.mapped_column(DateTime(timezone=True))
    content: orm.Mapped[str]
    # Clinical records are kept: deleting a note hides it rather than removing it.
    deleted_at: orm.Mapped[datetime | None] = orm.mapped_column(DateTime(timezone=True))


class AuditEntry(Base):
    """One recorded deletion. Kept after the patient is deleted, so no foreign key."""

    __tablename__ = "audit_log"

    id: orm.Mapped[int] = orm.mapped_column(primary_key=True)
    timestamp: orm.Mapped[datetime] = orm.mapped_column(DateTime(timezone=True))
    action: orm.Mapped[str]
    patient_id: orm.Mapped[int] = orm.mapped_column(index=True)
    note_id: orm.Mapped[int | None]
    description: orm.Mapped[str]
