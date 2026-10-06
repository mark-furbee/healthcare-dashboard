import os
from datetime import date, timedelta

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, orm, pool

from app.database import Base, get_db
from app.main import app
from app.models import Allergy, Condition, Patient

# StaticPool keeps every session on one connection, so they all see the same in-memory
# database.
engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=pool.StaticPool
)
TestingSession = orm.sessionmaker(engine)


@pytest.fixture()
def db():
    Base.metadata.create_all(engine)
    with TestingSession() as session:
        yield session
    Base.metadata.drop_all(engine)


def get_test_db():
    with TestingSession() as session:
        yield session


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def patients(db):
    maria = Patient(
        first_name="Maria",
        last_name="Rodriguez",
        date_of_birth=date(1980, 4, 12),
        email="maria@example.com",
        phone="(503) 555-0100",
        address="1 Main Street",
        blood_type="A+",
        status="active",
        allergies=[Allergy(name="Penicillin")],
        conditions=[Condition(name="Asthma")],
        last_visit=date.today() - timedelta(days=30),
    )
    daniel = Patient(
        first_name="Daniel",
        last_name="Chen",
        date_of_birth=date(1992, 8, 3),
        email="daniel@example.com",
        phone="(503) 555-0101",
        address="2 Main Street",
        blood_type="O+",
        status="inactive",
        last_visit=None,
    )
    db.add_all([maria, daniel])
    db.commit()
    return maria, daniel
