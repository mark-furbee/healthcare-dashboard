import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, orm, pool

from app.database import Base, get_db
from app.main import app

# StaticPool keeps every session on one connection, so they all see the same in-memory database.
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
