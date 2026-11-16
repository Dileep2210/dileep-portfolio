from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import get_settings


def _normalise(url: str) -> str:
    # Railway/Heroku style URLs -> SQLAlchemy psycopg3 driver.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


@lru_cache
def get_engine() -> Engine:
    url = get_settings().database_url
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    return create_engine(_normalise(url), pool_pre_ping=True, pool_size=5, max_overflow=5)


@lru_cache
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False, autoflush=False)


def new_session() -> Session:
    return _session_factory()()


def get_db() -> Iterator[Session]:
    """One session per request. Handlers commit explicitly; anything uncommitted is rolled back."""
    db = new_session()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def reset_engine_cache() -> None:
    _session_factory.cache_clear()
    get_engine.cache_clear()
