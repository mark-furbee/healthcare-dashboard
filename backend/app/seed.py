import random
from datetime import date, timedelta
from itertools import product

from sqlalchemy import orm, select

from .database import SessionLocal
from .models import Allergy, Condition, Patient

# Phone numbers use (XXX) 555-0100 to (XXX) 555-0199, the range reserved for fictional
# use, so 100 is the cap.
PATIENT_COUNT = 100
# A fixed seed gives every developer the same patients, so bugs reproduce consistently.
RANDOM_SEED = 2026

FIRST_NAMES = [
    "Aisha", "Amara", "Ana", "Benjamin", "Carlos", "Chloe", "Daniel", "David", "Elena",
    "Emily", "Ethan", "Fatima", "Grace", "Hannah", "Hiroshi", "Isabella", "James",
    "Jamal", "Leo", "Lucas", "Maria", "Mei", "Michael", "Mia", "Noah", "Olivia", "Omar",
    "Priya", "Robert", "Samuel", "Sofia", "Susan", "Thomas", "Wei", "William", "Zoe",
]  # fmt: skip
LAST_NAMES = [
    "Anderson", "Brown", "Chen", "Davis", "Garcia", "Harris", "Ibrahim", "Jackson",
    "Johnson", "Kim", "Lee", "Lopez", "Martin", "Miller", "Moore", "Nguyen", "Okafor",
    "Patel", "Rodriguez", "Rossi", "Sato", "Singh", "Taylor", "Thomas", "Thompson",
    "White", "Williams", "Wilson",
]  # fmt: skip
CONDITIONS = [
    "Anemia", "Anxiety", "Asthma", "Atrial fibrillation", "Chronic kidney disease",
    "COPD", "Coronary artery disease", "Depression", "Eczema", "GERD", "Heart failure",
    "High cholesterol", "Hypertension", "Hypothyroidism", "Migraine", "Obesity",
    "Osteoarthritis", "Osteoporosis", "Rheumatoid arthritis", "Sleep apnea",
    "Type 2 diabetes",
]  # fmt: skip
ALLERGIES = [
    "Aspirin", "Codeine", "Eggs", "Ibuprofen", "Latex", "Peanuts", "Penicillin",
    "Pollen", "Shellfish", "Sulfa drugs", "Tree nuts",
]  # fmt: skip
STREETS = [
    "Maple Street", "Oak Avenue", "Cedar Lane", "Pine Road", "Elm Court", "Birch Way",
]  # fmt: skip
# Each city's real area code, so a patient's phone number matches their address.
CITY_AREA_CODES = {
    "Portland, OR": "503", "Seattle, WA": "206", "Boise, ID": "208",
    "Sacramento, CA": "916", "Spokane, WA": "509",
}  # fmt: skip

# Approximate US blood type distribution.
BLOOD_TYPE_WEIGHTS = {
    "O+": 38,
    "A+": 34,
    "B+": 9,
    "O-": 7,
    "A-": 6,
    "AB+": 3,
    "B-": 2,
    "AB-": 1,
}
STATUS_WEIGHTS = {"active": 70, "inactive": 20, "discharged": 10}
# Days since the last visit, by status: active patients were seen recently, inactive
# ones not.
LAST_VISIT_DAYS = {"active": (0, 180), "inactive": (365, 1095), "discharged": (30, 730)}


def weighted_choice(rng: random.Random, weights: dict[str, int]) -> str:
    return rng.choices(list(weights), weights=list(weights.values()))[0]


def generate_patients(
    count: int = PATIENT_COUNT,
    seed: int = RANDOM_SEED,
    allergies: dict[str, Allergy] | None = None,
    conditions: dict[str, Condition] | None = None,
) -> list[Patient]:
    """Build sample patients, reusing the allergy and condition rows passed in."""
    allergies = {name: Allergy(name=name) for name in ALLERGIES} | (allergies or {})
    conditions = {name: Condition(name=name) for name in CONDITIONS} | (
        conditions or {}
    )
    rng = random.Random(seed)
    today = date.today()
    # Sampling distinct name pairs keeps the generated email addresses unique.
    names = rng.sample(list(product(FIRST_NAMES, LAST_NAMES)), count)
    patients = []
    for index, (first, last) in enumerate(names):
        status = weighted_choice(rng, STATUS_WEIGHTS)
        never_visited = rng.random() < 0.05
        date_of_birth = today - timedelta(days=rng.randint(18 * 365, 90 * 365))
        house_number, street = rng.randint(100, 9999), rng.choice(STREETS)
        city = rng.choice(list(CITY_AREA_CODES))
        patients.append(
            Patient(
                first_name=first,
                last_name=last,
                date_of_birth=date_of_birth,
                email=f"{first}.{last}@example.com".lower(),
                phone=f"({CITY_AREA_CODES[city]}) 555-01{index:02d}",
                address=f"{house_number} {street}, {city}",
                blood_type=weighted_choice(rng, BLOOD_TYPE_WEIGHTS),
                status=status,
                conditions=[
                    conditions[name]
                    for name in rng.sample(
                        CONDITIONS, rng.choices([0, 1, 2, 3], [3, 4, 2, 1])[0]
                    )
                ],
                allergies=[
                    allergies[name]
                    for name in rng.sample(
                        ALLERGIES, rng.choices([0, 1, 2], [11, 7, 2])[0]
                    )
                ],
                last_visit=(
                    None
                    if never_visited
                    else today - timedelta(days=rng.randint(*LAST_VISIT_DAYS[status]))
                ),
            )
        )
    return patients


def seed(db: orm.Session) -> None:
    """Insert the sample patients into an empty database; a no-op once any exist."""
    if db.scalar(select(Patient.id).limit(1)):
        return
    allergies = {allergy.name: allergy for allergy in db.scalars(select(Allergy))}
    conditions = {
        condition.name: condition for condition in db.scalars(select(Condition))
    }
    db.add_all(generate_patients(allergies=allergies, conditions=conditions))
    db.commit()


if __name__ == "__main__":
    with SessionLocal() as session:
        seed(session)
