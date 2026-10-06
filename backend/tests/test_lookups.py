from app.models import Allergy, Condition


def test_lists_allergy_and_condition_names_alphabetically_ignoring_case(client, db):
    db.add_all([Allergy(name="Pollen"), Allergy(name="Latex"), Condition(name="COPD")])
    db.add(Condition(name="Chronic kidney disease"))
    db.commit()
    assert client.get("/allergies").json() == ["Latex", "Pollen"]
    # Capitalization doesn't affect the order: "Chronic" comes before "COPD".
    assert client.get("/conditions").json() == ["Chronic kidney disease", "COPD"]
