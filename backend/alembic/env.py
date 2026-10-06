from alembic import context

from app import models
from app.database import engine

with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=models.Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
