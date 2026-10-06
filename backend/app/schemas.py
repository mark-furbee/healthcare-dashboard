import re
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    StringConstraints,
    field_validator,
)


def not_in_future(value: date) -> date:
    if value > date.today():
        raise ValueError("Date cannot be in the future")
    return value


def valid_email(value: str) -> str:
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
        raise ValueError("Enter a valid email address")
    return value


def text(max_length: int, min_length: int = 1) -> StringConstraints:
    return StringConstraints(
        strip_whitespace=True, min_length=min_length, max_length=max_length
    )


Status = Literal["active", "inactive", "discharged"]
NotFutureDate = Annotated[date, AfterValidator(not_in_future)]
Name = Annotated[str, text(80)]
ListItem = Annotated[str, text(100)]
# Lowercased so the unique constraint treats addresses case-insensitively.
Email = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, max_length=254),
    AfterValidator(valid_email),
]


class PatientIn(BaseModel):
    first_name: Name
    last_name: Name
    date_of_birth: NotFutureDate
    email: Email
    phone: Annotated[str, text(40, min_length=5)]
    address: Annotated[str, text(300, min_length=3)]
    blood_type: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    status: Status
    allergies: list[ListItem] = []
    conditions: list[ListItem] = []
    last_visit: NotFutureDate | None = None


class PatientOut(PatientIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    age: int

    # The API exchanges allergies and conditions as names; the model holds lookup-table
    # rows.
    @field_validator("allergies", "conditions", mode="before")
    @classmethod
    def to_names(cls, items: list) -> list:
        return [getattr(item, "name", item) for item in items]


class PatientPage(BaseModel):
    items: list[PatientOut]
    total: int


# Allows for small differences between the browser's clock and the server's.
CLOCK_SKEW = timedelta(minutes=5)


def not_in_future_time(value: datetime) -> datetime:
    # A time without a zone is taken as UTC, like the stored timestamps.
    value = value if value.tzinfo else value.replace(tzinfo=UTC)
    if value > datetime.now(UTC) + CLOCK_SKEW:
        raise ValueError("Note time cannot be in the future")
    return value


class NoteIn(BaseModel):
    # Omitted means now.
    timestamp: Annotated[datetime, AfterValidator(not_in_future_time)] | None = None
    content: Annotated[str, text(5000)]


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    content: str


class Summary(BaseModel):
    summary: str


class AuditEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    action: str
    patient_id: int
    note_id: int | None
    description: str
