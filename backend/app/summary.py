from datetime import UTC, datetime, tzinfo

from .models import Patient


def as_sentence(text: str) -> str:
    return text if text.endswith((".", "!", "?")) else f"{text}."


def local_date(timestamp: datetime, zone: tzinfo) -> str:
    # SQLite returns stored times without a zone; they were saved in UTC.
    aware = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=UTC)
    day = aware.astimezone(zone)
    return f"{day.month}/{day.day}/{day.year}"


def summarize(patient: Patient, zone: tzinfo = UTC) -> str:
    """Describe the patient's profile and narrate their notes in chronological order.

    A deterministic template rather than an LLM: the result is reproducible and patient
    data never leaves the system. Dates use m/d/YYYY in the given time zone, like the
    rest of the app.
    """
    conditions = ", ".join(condition.name for condition in patient.conditions)
    allergies = ", ".join(allergy.name for allergy in patient.allergies)
    sentences = [
        f"{patient.first_name} {patient.last_name} is a {patient.age}-year-old "
        f"{patient.status} patient with blood type {patient.blood_type}.",
        f"Conditions: {conditions or 'none recorded'}.",
        f"Allergies: {allergies or 'none recorded'}.",
    ]
    notes = reversed(patient.active_notes)  # The relationship is ordered newest first.
    history = [
        as_sentence(f"On {local_date(note.timestamp, zone)}, {note.content}")
        for note in notes
    ]
    return " ".join(sentences + (history or ["No clinical notes have been recorded."]))
