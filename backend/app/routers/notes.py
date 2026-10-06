from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from ..audit import log_note_deleted
from ..database import DbSession
from ..models import Note
from ..schemas import NoteIn, NoteOut
from .patients import PatientById

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(patient: PatientById):
    return patient.active_notes


@router.post("", response_model=NoteOut, status_code=201)
def create_note(payload: NoteIn, patient: PatientById, db: DbSession):
    note = Note(
        content=payload.content, timestamp=payload.timestamp or datetime.now(UTC)
    )
    patient.notes.append(note)
    db.commit()
    return note


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, patient: PatientById, db: DbSession):
    note = db.get(Note, note_id)
    # A note is only reachable through its own patient's URL, and only once.
    if note is None or note.patient_id != patient.id or note.deleted_at:
        raise HTTPException(404, "Note not found")
    # Clinical records are kept: the note is hidden, not removed, and the deletion
    # is logged.
    note.deleted_at = datetime.now(UTC)
    log_note_deleted(db, note)
    db.commit()
