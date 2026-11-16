"""Generic, permission-checked CRUD router for simple CMS resources."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import Select, String, cast, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ....core import audit
from ....core.database import get_db
from ....core.deps import Auth, require
from ....core.errors import AppError, Conflict, NotFound
from ....schemas.common import Page, slugify

Apply = Callable[[Session, Any, dict[str, Any], Auth], None]
Validate = Callable[[Session, Any, dict[str, Any]], None]  # (db, merged object, fields sent in this request)


@dataclass
class Resource:
    path: str
    perm: str
    entity: str
    model: Any
    create: type
    patch: type
    out: type
    search: list[str] = field(default_factory=list)
    filters: dict[str, type] = field(default_factory=dict)  # query param == column name
    sorts: list[str] = field(default_factory=lambda: ["position", "created_at", "updated_at"])
    default_sort: str = "position"
    slug_source: str | None = None
    apply: Apply | None = None
    validate: Validate | None = None
    relation_keys: tuple[str, ...] = ()


def integrity_to_app_error(exc: IntegrityError) -> AppError:
    code = getattr(getattr(exc, "orig", None), "sqlstate", None)
    if code == "23505":
        return Conflict("A record with the same unique value (for example the slug) already exists.", code="duplicate")
    if code == "23503":
        return Conflict(
            "This change refers to an item that does not exist, or the item is still in use elsewhere.",
            code="reference_error",
        )
    if code == "23514":
        return AppError("The values break a data rule (for example an invalid status).", code="constraint", status_code=422)
    return AppError("The change could not be saved.", code="integrity_error", status_code=409)


def commit(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise integrity_to_app_error(exc) from None


def _parse(value: str, typ: type) -> Any:
    try:
        if typ is bool:
            if value.lower() in {"true", "1", "yes"}:
                return True
            if value.lower() in {"false", "0", "no"}:
                return False
            raise ValueError
        if typ is uuid.UUID:
            return uuid.UUID(value)
        return typ(value)
    except ValueError:
        raise AppError("Invalid filter value.", code="invalid_filter", status_code=422) from None


def apply_listing(
    stmt: Select,
    model: Any,
    *,
    q: str | None,
    search: list[str],
    sort: str | None,
    sorts: list[str],
    default_sort: str,
) -> Select:
    if q:
        term = f"%{q.strip()[:100].replace('%', r'\%').replace('_', r'\_')}%"
        stmt = stmt.where(or_(*[cast(getattr(model, c), String).ilike(term, escape="\\") for c in search]))
    key = (sort or default_sort).strip()
    desc = key.startswith("-")
    name = key.lstrip("-")
    if name not in sorts:
        raise AppError("Unsupported sort field.", code="invalid_sort", status_code=422)
    col = getattr(model, name)
    stmt = stmt.order_by(col.desc() if desc else col.asc(), model.id)
    return stmt


def paginate(db: Session, stmt: Select, page: int, page_size: int) -> tuple[list[Any], int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = list(db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).unique())
    return rows, total


def build_router(res: Resource) -> APIRouter:
    router = APIRouter(prefix=f"/{res.path}", tags=[f"admin:{res.path}"])
    model = res.model
    soft = hasattr(model, "deleted_at")

    def _get(db: Session, item_id: uuid.UUID, include_deleted: bool = False):
        obj = db.get(model, item_id)
        if obj is None or (soft and obj.deleted_at is not None and not include_deleted):
            raise NotFound()
        return obj

    def _write(db: Session, obj: Any, data: dict[str, Any], auth: Auth) -> None:
        requested = dict(data)
        if res.apply:
            res.apply(db, obj, data, auth)
        for key in res.relation_keys:
            data.pop(key, None)
        table_cols = model.__table__.c
        for key, value in data.items():
            col = table_cols.get(key)
            if value is None and col is not None and not col.nullable:
                raise AppError(f"'{key}' cannot be empty.", code="validation_error", status_code=422)
            setattr(obj, key, value)
        if res.slug_source and hasattr(obj, "slug") and not obj.slug:
            obj.slug = slugify(getattr(obj, res.slug_source))
        if getattr(obj, "status", None) == "published" and hasattr(obj, "published_at") and obj.published_at is None:
            obj.published_at = datetime.now(UTC)
        if res.validate:
            res.validate(db, obj, requested)

    @router.get("", response_model=Page[res.out])  # type: ignore[valid-type]
    def list_items(
        request: Request,
        db: Session = Depends(get_db),
        auth: Auth = Depends(require(f"{res.perm}:read")),
        page: int = Query(1, ge=1, le=10_000),
        page_size: int = Query(20, ge=1, le=100),
        q: str | None = Query(None, max_length=100),
        sort: str | None = Query(None, max_length=40),
        include_deleted: bool = False,
    ):
        stmt = select(model)
        if soft and not include_deleted:
            stmt = stmt.where(model.deleted_at.is_(None))
        for name, typ in res.filters.items():
            raw = request.query_params.get(name)
            if raw not in (None, ""):
                stmt = stmt.where(getattr(model, name) == _parse(raw, typ))
        stmt = apply_listing(
            stmt, model, q=q, search=res.search, sort=sort, sorts=res.sorts, default_sort=res.default_sort
        )
        rows, total = paginate(db, stmt, page, page_size)
        return {"items": rows, "total": total, "page": page, "page_size": page_size}

    @router.get("/{item_id}", response_model=res.out)
    def get_item(
        item_id: uuid.UUID,
        db: Session = Depends(get_db),
        auth: Auth = Depends(require(f"{res.perm}:read")),
    ):
        return _get(db, item_id, include_deleted=True)

    @router.post("", response_model=res.out, status_code=201)
    def create_item(
        payload: res.create,  # type: ignore[valid-type]
        request: Request,
        db: Session = Depends(get_db),
        auth: Auth = Depends(require(f"{res.perm}:write")),
    ):
        obj = model()
        data = payload.model_dump()
        _write(db, obj, data, auth)
        db.add(obj)
        try:
            db.flush()
        except IntegrityError as exc:
            db.rollback()
            raise integrity_to_app_error(exc) from None
        audit.record(db, request, auth.user, f"{res.entity}.create", res.entity, obj.id)
        commit(db)
        db.refresh(obj)
        return obj

    @router.patch("/{item_id}", response_model=res.out)
    def update_item(
        item_id: uuid.UUID,
        payload: res.patch,  # type: ignore[valid-type]
        request: Request,
        db: Session = Depends(get_db),
        auth: Auth = Depends(require(f"{res.perm}:write")),
    ):
        obj = _get(db, item_id)
        data = payload.model_dump(exclude_unset=True)
        _write(db, obj, data, auth)
        audit.record(db, request, auth.user, f"{res.entity}.update", res.entity, obj.id, {"fields": sorted(data)})
        commit(db)
        db.refresh(obj)
        return obj

    @router.delete("/{item_id}", status_code=204)
    def delete_item(
        item_id: uuid.UUID,
        request: Request,
        db: Session = Depends(get_db),
        auth: Auth = Depends(require(f"{res.perm}:delete")),
    ):
        obj = _get(db, item_id)
        if soft:
            obj.deleted_at = datetime.now(UTC)
        else:
            db.delete(obj)
        audit.record(db, request, auth.user, f"{res.entity}.delete", res.entity, item_id, {"soft": soft})
        commit(db)
        return Response(status_code=204)

    if soft:

        @router.post("/{item_id}/restore", response_model=res.out)
        def restore_item(
            item_id: uuid.UUID,
            request: Request,
            db: Session = Depends(get_db),
            auth: Auth = Depends(require(f"{res.perm}:delete")),
        ):
            obj = _get(db, item_id, include_deleted=True)
            obj.deleted_at = None
            audit.record(db, request, auth.user, f"{res.entity}.restore", res.entity, item_id)
            commit(db)
            db.refresh(obj)
            return obj

    return router
