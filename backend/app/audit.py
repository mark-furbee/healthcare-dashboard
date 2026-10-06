"""Audit log entries for deletions. The app has no user accounts yet; once it does, each
entry should also record who made the change.

Entries identify records by ID only, never by name or other personal details: the log is
kept after a patient is deleted, and must not keep the data that deletion removed."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from .models import AuditEntry, Note, Patient


def log_note_deleted(db: Session, note: Note) -> None:
    db.add(
        AuditEntry(
            timestamp=datetime.now(UTC),
            action="note.deleted",
            patient_id=note.patient_id,
            note_id=note.id,
            description=f"Deleted note {note.id}",
        )
    )


def log_patient_deleted(db: Session, patient: Patient) -> None:
    count = len(patient.notes)
    notes = f"{count} note" if count == 1 else f"{count} notes"
    db.add(
        AuditEntry(
            timestamp=datetime.now(UTC),
            action="patient.deleted",
            patient_id=patient.id,
            note_id=None,
            description=f"Deleted patient {patient.id} and their {notes}",
        )
    )
