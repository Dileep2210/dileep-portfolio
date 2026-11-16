from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import SiteSetting
from ..schemas.settings import SETTINGS_KEYS, SiteSettings


def load_settings(db: Session) -> SiteSettings:
    stored = {row.key: row.value for row in db.scalars(select(SiteSetting).where(SiteSetting.key.in_(SETTINGS_KEYS)))}
    merged: dict[str, Any] = SiteSettings().model_dump()
    merged.update({k: v for k, v in stored.items() if v is not None})
    try:
        return SiteSettings.model_validate(merged)
    except ValueError:
        # A bad stored value should never take the public site down: fall back key by key.
        good = SiteSettings().model_dump()
        for k, v in stored.items():
            try:
                SiteSettings.model_validate({**good, k: v})
                good[k] = v
            except ValueError:
                continue
        return SiteSettings.model_validate(good)


def save_settings(db: Session, values: dict[str, Any]) -> list[str]:
    changed: list[str] = []
    existing = {row.key: row for row in db.scalars(select(SiteSetting).where(SiteSetting.key.in_(list(values))))}
    for key, value in values.items():
        if key not in SETTINGS_KEYS:
            continue
        row = existing.get(key)
        if row is None:
            db.add(SiteSetting(key=key, value=value))
            changed.append(key)
        elif row.value != value:
            row.value = value
            changed.append(key)
    return changed
