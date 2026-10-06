from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import Allergy, Condition

TOMORROW = (date.today() + timedelta(days=1)).isoformat()


@pytest.fixture()
def payload():
    return {
        "first_name": "Avery",
        "last_name": "Kim",
        "date_of_birth": "1990-05-01",
        "email": "avery@example.com",
        "phone": "(503) 555-0199",
        "address": "9 Oak Road",
        "blood_type": "AB+",
        "status": "active",
        "allergies": [],
        "conditions": [],
        "last_visit": None,
    }


def last_names(client, query=""):
    response = client.get(f"/patients?{query}")
    assert response.status_code == 200
    return [patient["last_name"] for patient in response.json()["items"]]


def test_list_sorts_by_last_name_by_default(client, patients):
    assert last_names(client) == ["Chen", "Rodriguez"]


def test_list_searches_full_name_and_email_case_insensitively(client, patients):
    assert last_names(client, "search=maria rod") == ["Rodriguez"]
    assert last_names(client, "search=DANIEL@EXAMPLE") == ["Chen"]
    assert client.get("/patients?search=nobody").json() == {"items": [], "total": 0}


def test_list_search_treats_wildcards_literally(client, patients):
    assert last_names(client, "search=_") == []
    assert last_names(client, "search=%25") == []


def test_list_filters_by_status(client, patients):
    assert last_names(client, "status=inactive") == ["Chen"]


def test_list_sorts_by_age(client, patients):
    assert last_names(client, "sort=age&order=asc") == ["Chen", "Rodriguez"]
    assert last_names(client, "sort=age&order=desc") == ["Rodriguez", "Chen"]


def test_list_puts_missing_last_visit_last_in_both_directions(client, patients):
    assert last_names(client, "sort=last_visit&order=asc") == ["Rodriguez", "Chen"]
    assert last_names(client, "sort=last_visit&order=desc") == ["Rodriguez", "Chen"]


def test_list_paginates_and_reports_total(client, patients):
    response = client.get("/patients?page=2&page_size=1").json()
    assert response["total"] == 2
    assert [patient["last_name"] for patient in response["items"]] == ["Rodriguez"]


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page_size=0",
        "page_size=101",
        "sort=email",
        "order=up",
        "status=unknown",
        f"search={'x' * 101}",
    ],
)
def test_list_rejects_invalid_query_parameters(client, query):
    assert client.get(f"/patients?{query}").status_code == 422


def test_get_patient_includes_derived_age(client, patients):
    today = date.today()
    expected_age = today.year - 1980 - ((today.month, today.day) < (4, 12))
    response = client.get(f"/patients/{patients[0].id}")
    assert response.status_code == 200
    assert response.json()["age"] == expected_age


def test_create_patient_normalizes_input(client, payload):
    response = client.post(
        "/patients",
        json={
            **payload,
            "first_name": "  Avery ",
            "email": " Avery@Example.com ",
            "allergies": [" Latex "],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert (body["first_name"], body["email"], body["allergies"]) == (
        "Avery",
        "avery@example.com",
        ["Latex"],
    )


def assert_duplicate_email_error(response):
    assert response.status_code == 422
    [error] = response.json()["detail"]
    assert error["loc"] == ["body", "email"]
    assert error["msg"] == "A patient with this email already exists"


def test_create_rejects_duplicate_email_regardless_of_case(client, patients, payload):
    response = client.post("/patients", json={**payload, "email": "MARIA@example.com"})
    assert_duplicate_email_error(response)


def test_update_replaces_patient(client, patients, payload):
    response = client.put(
        f"/patients/{patients[0].id}", json={**payload, "email": "maria@example.com"}
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Avery"


def test_update_rejects_email_belonging_to_another_patient(client, patients, payload):
    response = client.put(
        f"/patients/{patients[1].id}", json={**payload, "email": "maria@example.com"}
    )
    assert_duplicate_email_error(response)
    assert (
        client.get(f"/patients/{patients[1].id}").json()["email"]
        == "daniel@example.com"
    )


def test_delete_patient(client, patients):
    assert client.delete(f"/patients/{patients[0].id}").status_code == 204
    assert client.get(f"/patients/{patients[0].id}").status_code == 404


def test_missing_patient_returns_404(client, payload):
    assert client.get("/patients/999").status_code == 404
    assert client.put("/patients/999", json=payload).status_code == 404
    assert client.delete("/patients/999").status_code == 404


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"first_name": "   "}, "at least 1 character"),
        ({"email": "not-an-email"}, "Enter a valid email address"),
        ({"phone": "123"}, "at least 5 characters"),
        ({"date_of_birth": TOMORROW}, "Date cannot be in the future"),
        ({"last_visit": TOMORROW}, "Date cannot be in the future"),
        ({"blood_type": "C+"}, "Input should be"),
        ({"status": "deceased"}, "Input should be"),
        ({"conditions": [""]}, "at least 1 character"),
        ({"conditions": ["x" * 101]}, "at most 100 characters"),
    ],
)
def test_create_rejects_invalid_fields(client, payload, changes, message):
    response = client.post("/patients", json={**payload, **changes})
    assert response.status_code == 422
    assert message in str(response.json()["detail"])


def test_create_reports_every_missing_field(client):
    response = client.post("/patients", json={})
    assert response.status_code == 422
    missing = {error["loc"][-1] for error in response.json()["detail"]}
    assert missing == {
        "first_name",
        "last_name",
        "date_of_birth",
        "email",
        "phone",
        "address",
        "blood_type",
        "status",
    }


def test_create_links_existing_allergies_and_conditions_case_insensitively(
    client, patients, payload, db
):
    response = client.post(
        "/patients",
        json={
            **payload,
            "allergies": ["penicillin", "Latex", "LATEX"],
            "conditions": ["Asthma"],
        },
    )
    assert response.status_code == 201
    assert response.json()["allergies"] == ["Latex", "Penicillin"]
    assert sorted(db.scalars(select(Allergy.name))) == ["Latex", "Penicillin"]
    assert db.scalars(select(Condition.name)).all() == ["Asthma"]


def test_update_replaces_allergies_and_conditions(client, patients, payload):
    response = client.put(
        f"/patients/{patients[0].id}",
        json={
            **payload,
            "email": "maria@example.com",
            "allergies": [],
            "conditions": ["Migraine"],
        },
    )
    assert response.status_code == 200
    assert (response.json()["allergies"], response.json()["conditions"]) == (
        [],
        ["Migraine"],
    )


def test_delete_keeps_shared_allergies_and_conditions(client, patients, db):
    assert client.delete(f"/patients/{patients[0].id}").status_code == 204
    assert db.scalars(select(Allergy.name)).all() == ["Penicillin"]
