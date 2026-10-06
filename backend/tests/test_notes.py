from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.models import AuditEntry, Note


@pytest.fixture()
def maria(patients):
    return patients[0]


def add_note(client, patient_id, content, timestamp=None):
    body = (
        {"content": content}
        if timestamp is None
        else {"content": content, "timestamp": timestamp}
    )
    response = client.post(f"/patients/{patient_id}/notes", json=body)
    assert response.status_code == 201
    return response.json()


def test_notes_are_listed_newest_first(client, maria):
    add_note(client, maria.id, "Older", "2026-01-01T09:00:00Z")
    add_note(client, maria.id, "Newer", "2026-03-01T09:00:00Z")
    assert [
        note["content"] for note in client.get(f"/patients/{maria.id}/notes").json()
    ] == [
        "Newer",
        "Older",
    ]


def test_note_accepts_timestamp_and_trims_content(client, maria):
    note = add_note(client, maria.id, "  BP 120/80.  ", "2026-02-03T10:15:00Z")
    assert note["content"] == "BP 120/80."
    assert note["timestamp"].startswith("2026-02-03T10:15:00")


def test_note_timestamp_defaults_to_now(client, maria):
    assert add_note(client, maria.id, "Walk-in visit.")["timestamp"]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"content": "   "},
        {"content": "x" * 5001},
        {"content": "Hi", "timestamp": "yesterday"},
    ],
)
def test_note_rejects_invalid_input(client, maria, body):
    assert client.post(f"/patients/{maria.id}/notes", json=body).status_code == 422


def test_notes_for_missing_patient_return_404(client):
    assert client.get("/patients/999/notes").status_code == 404
    assert client.post("/patients/999/notes", json={"content": "Hi"}).status_code == 404
    assert client.delete("/patients/999/notes/1").status_code == 404


def test_deleting_a_note_hides_it_but_keeps_the_record(client, db, maria):
    note = add_note(client, maria.id, "Remove me")
    url = f"/patients/{maria.id}/notes/{note['id']}"
    assert client.delete(url).status_code == 204
    assert client.get(f"/patients/{maria.id}/notes").json() == []
    assert "Remove me" not in client.get(f"/patients/{maria.id}/summary").text
    assert db.get(Note, note["id"]).deleted_at is not None
    # Already deleted, so it can't be deleted again.
    assert client.delete(url).status_code == 404


def test_deleting_a_note_is_logged(client, maria):
    note = add_note(client, maria.id, "Remove me")
    client.delete(f"/patients/{maria.id}/notes/{note['id']}")
    [entry] = client.get("/audit-log", params={"patient_id": maria.id}).json()
    assert (entry["action"], entry["note_id"], entry["description"]) == (
        "note.deleted",
        note["id"],
        f"Deleted note {note['id']}",
    )


def test_cannot_delete_another_patients_note(client, patients):
    maria, daniel = patients
    note = add_note(client, maria.id, "Belongs to Maria")
    assert client.delete(f"/patients/{daniel.id}/notes/{note['id']}").status_code == 404


def test_deleting_patient_deletes_all_their_notes_and_is_logged(client, db, maria):
    add_note(client, maria.id, "First")
    hidden = add_note(client, maria.id, "Second")
    client.delete(f"/patients/{maria.id}/notes/{hidden['id']}")
    assert client.delete(f"/patients/{maria.id}").status_code == 204
    # Soft-deleted notes go with the patient too.
    assert db.scalar(select(func.count(Note.id))) == 0
    # The log outlives the patient.
    entries = client.get("/audit-log", params={"patient_id": maria.id}).json()
    assert [entry["action"] for entry in entries] == ["patient.deleted", "note.deleted"]
    # IDs only: the log must not keep the personal details the deletion removed.
    assert entries[0]["description"] == f"Deleted patient {maria.id} and their 2 notes"
    assert db.scalar(select(func.count(AuditEntry.id))) == 2


def test_note_rejects_a_future_time(client, maria):
    future = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
    response = client.post(
        f"/patients/{maria.id}/notes", json={"content": "Hi", "timestamp": future}
    )
    assert response.status_code == 422
    assert "Note time cannot be in the future" in str(response.json()["detail"])
