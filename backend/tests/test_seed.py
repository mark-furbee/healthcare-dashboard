from sqlalchemy import func, select

from app.models import Allergy, Condition, Patient
from app.schemas import PatientOut
from app.seed import ALLERGIES, CONDITIONS, PATIENT_COUNT, generate_patients, seed


def test_seed_inserts_sample_patients_once(db):
    seed(db)
    seed(db)
    assert db.scalar(select(func.count(Patient.id))) == PATIENT_COUNT == 100


def test_generated_patients_are_valid_unique_and_reproducible(db):
    patients = generate_patients()
    db.add_all(patients)
    db.commit()
    for patient in patients:
        PatientOut.model_validate(patient)
    assert len({patient.email for patient in patients}) == PATIENT_COUNT
    assert len({patient.phone for patient in patients}) == PATIENT_COUNT

    def fingerprint(patient):
        return (
            patient.email,
            patient.blood_type,
            sorted(condition.name for condition in patient.conditions),
            sorted(allergy.name for allergy in patient.allergies),
        )

    assert [fingerprint(p) for p in generate_patients()] == [
        fingerprint(p) for p in patients
    ]


def test_seed_stores_each_allergy_and_condition_once(db):
    db.add(Allergy(name="Latex"))
    db.commit()
    seed(db)
    assert sorted(db.scalars(select(Allergy.name))) == sorted(ALLERGIES)
    assert sorted(db.scalars(select(Condition.name))) == sorted(CONDITIONS)
    assert db.scalar(
        select(func.count()).select_from(Patient).where(Patient.allergies.any())
    )
