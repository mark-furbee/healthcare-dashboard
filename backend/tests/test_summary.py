from datetime import date


def summary_of(client, patient_id):
    response = client.get(f"/patients/{patient_id}/summary")
    assert response.status_code == 200
    return response.json()["summary"]


def test_summary_describes_profile(client, patients):
    today = date.today()
    age = today.year - 1980 - ((today.month, today.day) < (4, 12))
    summary = summary_of(client, patients[0].id)
    assert summary.startswith(
        f"Maria Rodriguez is a {age}-year-old active patient with blood type A+."
    )
    assert "Conditions: Asthma. Allergies: Penicillin." in summary
    assert summary.endswith("No clinical notes have been recorded.")


def test_summary_handles_empty_lists(client, patients):
    assert "Conditions: none recorded. Allergies: none recorded." in summary_of(
        client, patients[1].id
    )


def test_summary_narrates_notes_oldest_first(client, patients):
    maria = patients[0]
    client.post(
        f"/patients/{maria.id}/notes",
        json={"content": "Asthma well controlled", "timestamp": "2026-03-01T09:00:00Z"},
    )
    client.post(
        f"/patients/{maria.id}/notes",
        json={"content": "Started inhaler.", "timestamp": "2026-01-01T09:00:00Z"},
    )
    assert summary_of(client, maria.id).endswith(
        "On 1/1/2026, Started inhaler. On 3/1/2026, Asthma well controlled."
    )


def test_summary_for_missing_patient_returns_404(client):
    assert client.get("/patients/999/summary").status_code == 404


def test_summary_dates_notes_in_the_requested_time_zone(client, patients):
    maria = patients[0]
    # 3 AM UTC on March 2 is still the evening of March 1 in Los Angeles.
    client.post(
        f"/patients/{maria.id}/notes",
        json={"content": "Evening call", "timestamp": "2026-03-02T03:00:00Z"},
    )
    assert summary_of(client, maria.id).endswith("On 3/2/2026, Evening call.")
    response = client.get(
        f"/patients/{maria.id}/summary", params={"tz": "America/Los_Angeles"}
    )
    assert response.json()["summary"].endswith("On 3/1/2026, Evening call.")


def test_summary_rejects_unknown_time_zone(client, patients):
    response = client.get(f"/patients/{patients[0].id}/summary?tz=Mars/Olympus")
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "tz"]


def test_summary_returns_its_parts(client, patients):
    maria = patients[0]
    client.post(
        f"/patients/{maria.id}/notes",
        json={"content": "Started inhaler.", "timestamp": "2026-01-01T09:00:00Z"},
    )
    body = client.get(f"/patients/{maria.id}/summary").json()
    assert body["overview"].startswith("Maria Rodriguez is a ")
    assert (body["conditions"], body["allergies"]) == (["Asthma"], ["Penicillin"])
    assert body["history"] == [{"date": "1/1/2026", "excerpt": "Started inhaler."}]


def test_summary_quotes_long_notes_as_excerpts(client, patients):
    maria = patients[0]
    long_note = "Patient reports\nimproving symptoms. " + "word " * 100
    client.post(f"/patients/{maria.id}/notes", json={"content": long_note})
    [entry] = client.get(f"/patients/{maria.id}/summary").json()["history"]
    assert entry["excerpt"].startswith("Patient reports improving symptoms. word")
    assert entry["excerpt"].endswith("word…")
    assert len(entry["excerpt"]) <= 201
