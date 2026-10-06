from datetime import UTC, datetime


def as_utc(value: datetime) -> datetime:
    """A time without a zone taken as UTC: stored times are UTC, and SQLite drops it."""
    return value if value.tzinfo else value.replace(tzinfo=UTC)
