from typing import Annotated, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query, exceptions
from sqlalchemy import exc, func, or_, select

from ..audit import log_patient_deleted
from ..database import DbSession
from ..models import Allergy, Condition, Patient
from ..schemas import PatientIn, PatientOut, PatientPage, Status, Summary
from ..summary import summarize

router = APIRouter(prefix="/patients", tags=["patients"])

SORT_COLUMNS = {
    "name": Patient.last_name,
    "age": Patient.date_of_birth,
    "last_visit": Patient.last_visit,
    "status": Patient.status,
}


def get_patient_or_404(patient_id: int, db: DbSession) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(404, "Patient not found")
    return patient


PatientById = Annotated[Patient, Depends(get_patient_or_404)]


def commit_or_reject_duplicate_email(db: DbSession, email: str) -> None:
    # The database's unique constraint is the source of truth for duplicate emails,
    # which avoids the race between a separate "does this email exist?" query and the
    # insert. The error has the same shape as any other validation error, so a form can
    # show it on the email field.
    try:
        db.commit()
    except exc.IntegrityError as error:
        db.rollback()
        if "email" not in str(error.orig):
            raise
        raise exceptions.RequestValidationError(
            [
                {
                    "type": "duplicate_email",
                    "loc": ("body", "email"),
                    "msg": "A patient with this email already exists",
                    "input": email,
                }
            ]
        ) from None


def lookup_rows(
    db: DbSession, model: type[Allergy] | type[Condition], names: list[str]
) -> list:
    """Rows for the given names: existing ones matched case-insensitively, else new."""
    # A repeated name would insert the same link twice, so keep only its first spelling.
    unique: dict[str, str] = {}
    for name in names:
        unique.setdefault(name.lower(), name)
    existing = db.scalars(select(model).where(func.lower(model.name).in_(unique)))
    rows = {row.name.lower(): row for row in existing}
    return [rows.get(key) or model(name=name) for key, name in unique.items()]


@router.get("", response_model=PatientPage)
def list_patients(
    db: DbSession,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str, Query(max_length=100)] = "",
    status: Status | None = None,
    sort: Literal["name", "age", "last_visit", "status"] = "name",
    order: Literal["asc", "desc"] = "asc",
):
    query = select(Patient)
    if term := search.strip():
        # autoescape makes % and _ in the search term match literally rather than as
        # wildcards.
        full_name = Patient.first_name + " " + Patient.last_name
        query = query.where(
            or_(
                full_name.icontains(term, autoescape=True),
                Patient.email.icontains(term, autoescape=True),
            )
        )
    if status:
        query = query.where(Patient.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery()))

    # Older patients have earlier birth dates, so age sorts opposite to date_of_birth.
    descending = (order == "desc") != (sort == "age")
    column = SORT_COLUMNS[sort]
    query = query.order_by(
        (column.desc() if descending else column.asc()).nulls_last(), Patient.id
    )
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": items, "total": total}


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(payload: PatientIn, db: DbSession):
    patient = Patient(
        **payload.model_dump(exclude={"allergies", "conditions"}),
        allergies=lookup_rows(db, Allergy, payload.allergies),
        conditions=lookup_rows(db, Condition, payload.conditions),
    )
    db.add(patient)
    commit_or_reject_duplicate_email(db, payload.email)
    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient: PatientById):
    return patient


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(payload: PatientIn, patient: PatientById, db: DbSession):
    # The lookups and collection loads below would otherwise flush the new email early,
    # raising a duplicate-email error here instead of in
    # commit_or_reject_duplicate_email.
    with db.no_autoflush:
        for field, value in payload.model_dump(
            exclude={"allergies", "conditions"}
        ).items():
            setattr(patient, field, value)
        patient.allergies = lookup_rows(db, Allergy, payload.allergies)
        patient.conditions = lookup_rows(db, Condition, payload.conditions)
    commit_or_reject_duplicate_email(db, payload.email)
    return patient


@router.delete("/{patient_id}", status_code=204)
def delete_patient(patient: PatientById, db: DbSession):
    # Logged in the same transaction, so a deletion is never left unrecorded.
    log_patient_deleted(db, patient)
    db.delete(patient)
    db.commit()


@router.get("/{patient_id}/summary", response_model=Summary)
def get_summary(patient: PatientById, tz: Annotated[str, Query(max_length=64)] = "UTC"):
    """tz is an IANA time zone, such as America/Los_Angeles, for the notes' dates."""
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        raise exceptions.RequestValidationError(
            [
                {
                    "type": "time_zone",
                    "loc": ("query", "tz"),
                    "msg": "Unknown time zone",
                    "input": tz,
                }
            ]
        ) from None
    return summarize(patient, zone)
