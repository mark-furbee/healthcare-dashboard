from fastapi import APIRouter
from sqlalchemy import func, select

from ..database import DbSession
from ..models import Allergy, Condition

router = APIRouter(tags=["lookups"])


@router.get("/allergies", response_model=list[str])
def list_allergies(db: DbSession):
    """Every recorded allergy name, for the patient form's choices."""
    return db.scalars(select(Allergy.name).order_by(func.lower(Allergy.name))).all()


@router.get("/conditions", response_model=list[str])
def list_conditions(db: DbSession):
    """Every recorded condition name, for the patient form's choices."""
    return db.scalars(select(Condition.name).order_by(func.lower(Condition.name))).all()
