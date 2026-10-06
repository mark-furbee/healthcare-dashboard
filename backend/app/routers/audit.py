from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from ..database import DbSession
from ..models import AuditEntry
from ..schemas import AuditEntryOut

router = APIRouter(tags=["audit"])


@router.get("/audit-log", response_model=list[AuditEntryOut])
def list_audit_log(
    db: DbSession,
    patient_id: int | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    """Recorded deletions, newest first, optionally for one patient."""
    query = select(AuditEntry).order_by(
        AuditEntry.timestamp.desc(), AuditEntry.id.desc()
    )
    if patient_id is not None:
        query = query.where(AuditEntry.patient_id == patient_id)
    return db.scalars(query.limit(limit)).all()
