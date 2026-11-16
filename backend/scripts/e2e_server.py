"""Start a throwaway API for Playwright end-to-end tests.

Wipes the E2E database (refuses unless its name ends in `_e2e`), applies the Alembic migration,
seeds content, creates a super admin and a viewer, then serves the API with uvicorn.
Never point this at a real database.
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

url = os.environ.get("DATABASE_URL", "")
if not url.rstrip("/").endswith("_e2e"):
    sys.exit("Refusing to run: DATABASE_URL must point at a database whose name ends with _e2e")

from datetime import UTC, datetime  # noqa: E402

import uvicorn  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402

from app.core.database import _normalise, new_session  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import Role, User  # noqa: E402
from app.seed import seed_content  # noqa: E402

engine = create_engine(_normalise(url))
with engine.begin() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
engine.dispose()

cfg = Config(str(ROOT / "alembic.ini"))
cfg.set_main_option("script_location", str(ROOT / "alembic"))
command.upgrade(cfg, "head")

with new_session() as db:
    seed_content(db)
    for email, role in [("e2e-admin@example.com", "super_admin"), ("e2e-viewer@example.com", "viewer")]:
        r = db.scalar(select(Role).where(Role.name == role))
        db.add(User(email=email, full_name=role.replace("_", " ").title(), password_hash=hash_password(os.environ["E2E_PASSWORD"]),
                    roles=[r], email_verified_at=datetime.now(UTC)))
    db.commit()

uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.environ.get("E2E_API_PORT", "8001")), log_level="warning")
