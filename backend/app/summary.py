import re
from datetime import UTC, datetime, tzinfo

from .models import Patient

# A summary quotes the start of each note; the full text stays in the notes list.
EXCERPT_LENGTH = 200


def as_sentence(text: str) -> str:
    return text if text.endswith((".", "!", "?", "…")) else f"{text}."


def excerpt(text: str) -> str:
    """The note on one line, cut at a word boundary past EXCERPT_LENGTH."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= EXCERPT_LENGTH:
        return text
    cut = text[: EXCERPT_LENGTH + 1].rsplit(" ", 1)[0] or text[:EXCERPT_LENGTH]
    return f"{cut.rstrip(' ,;:.')}…"


def local_date(timestamp: datetime, zone: tzinfo) -> str:
    # SQLite returns stored times without a zone; they were saved in UTC.
    aware = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=UTC)
    day = aware.astimezone(zone)
    return f"{day.month}/{day.day}/{day.year}"


def summarize(patient: Patient, zone: tzinfo = UTC) -> dict:
    """Describe the patient's profile and narrate their notes in chronological order.

    Returns the summary as text and as its parts (overview, conditions, allergies, and a
    dated history of note excerpts), so a client can lay it out.

    A deterministic template rather than an LLM: the result is reproducible and patient
    data never leaves the system. Dates use m/d/YYYY in the given time zone, like the
    rest of the app.
    """
    overview = (
        f"{patient.first_name} {patient.last_name} is a {patient.age}-year-old "
        f"{patient.status} patient with blood type {patient.blood_type}."
    )
    conditions = [condition.name for condition in patient.conditions]
    allergies = [allergy.name for allergy in patient.allergies]
    # The relationship is ordered newest first; a narrative reads oldest first.
    history = [
        {"date": local_date(note.timestamp, zone), "excerpt": excerpt(note.content)}
        for note in reversed(patient.active_notes)
    ]
    sentences = [
        overview,
        f"Conditions: {', '.join(conditions) or 'none recorded'}.",
        f"Allergies: {', '.join(allergies) or 'none recorded'}.",
        *(as_sentence(f"On {entry['date']}, {entry['excerpt']}") for entry in history),
    ]
    if not history:
        sentences.append("No clinical notes have been recorded.")
    return {
        "summary": " ".join(sentences),
        "overview": overview,
        "conditions": conditions,
        "allergies": allergies,
        "history": history,
    }
