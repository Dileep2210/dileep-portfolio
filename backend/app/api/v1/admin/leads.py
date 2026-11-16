import csv
import io
import uuid
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ....core import audit
from ....core.database import get_db
from ....core.deps import Auth, ensure_recent_reauth, require
from ....core.errors import NotFound
from ....models import ContactLead, LeadNote
from ....schemas.common import Page
from ....schemas.leads import LEAD_STATUSES, LeadDetailOut, LeadNoteIn, LeadNoteOut, LeadOut, LeadPatch
from .crud import apply_listing, commit, paginate

router = APIRouter(prefix="/leads", tags=["admin:leads"])

SEARCH = ["name", "email", "company", "message", "service_label"]
SORTS = ["created_at", "updated_at", "name", "status", "follow_up_at"]


def _filtered(status: str | None, follow_up_before: date | None, service_id: uuid.UUID | None, include_deleted: bool):
    stmt = select(ContactLead)
    if not include_deleted:
        stmt = stmt.where(ContactLead.deleted_at.is_(None))
    if status:
        stmt = stmt.where(ContactLead.status == status)
    if follow_up_before:
        stmt = stmt.where(ContactLead.follow_up_at.is_not(None), ContactLead.follow_up_at <= follow_up_before)
    if service_id:
        stmt = stmt.where(ContactLead.service_id == service_id)
    return stmt


StatusQ = Annotated[str | None, Query(pattern="^(" + "|".join(LEAD_STATUSES) + ")$")]


@router.get("", response_model=Page[LeadOut])
def list_leads(
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("leads:read")),
    page: int = Query(1, ge=1, le=10_000),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, max_length=100),
    sort: str | None = Query(None, max_length=40),
    status: StatusQ = None,
    follow_up_before: date | None = None,
    service_id: uuid.UUID | None = None,
    include_deleted: bool = False,
):
    stmt = _filtered(status, follow_up_before, service_id, include_deleted)
    stmt = apply_listing(stmt, ContactLead, q=q, search=SEARCH, sort=sort, sorts=SORTS, default_sort="-created_at")
    rows, total = paginate(db, stmt, page, page_size)
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


def _csv_safe(value: object) -> str:
    """Neutralise spreadsheet formulas (CSV injection)."""
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


@router.get("/export.csv")
def export_leads(
    request: Request,
    db: Session = Depends(get_db),
    auth: Auth = Depends(require("leads:export")),
    status: StatusQ = None,
    q: str | None = Query(None, max_length=100),
):
    ensure_recent_reauth(auth)
    stmt = _filtered(status, None, None, False)
    stmt = apply_listing(stmt, ContactLead, q=q, search=SEARCH, sort="-created_at", sorts=SORTS, default_sort="-created_at")
    rows = list(db.scalars(stmt.limit(10_000)))
    buf = io.StringIO()
    writer = csv.writer(buf)
    cols = ["created_at", "name", "email", "phone", "company", "service_label", "budget", "preferred_contact", "status", "follow_up_at", "message"]
    writer.writerow(cols)
    for r in rows:
        writer.writerow([_csv_safe(getattr(r, c)) for c in cols])
    audit.record(db, request, auth.user, "leads.export", "contact_lead", None, {"rows": len(rows), "status": status})
    db.commit()
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M")
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="enquiries-{stamp}.csv"', "Cache-Control": "no-store"},
    )


def _get(db: Session, lead_id: uuid.UUID, include_deleted: bool = False) -> ContactLead:
    lead = db.get(ContactLead, lead_id)
    if lead is None or (lead.deleted_at is not None and not include_deleted):
        raise NotFound("Enquiry not found.")
    return lead


@router.get("/{lead_id}", response_model=LeadDetailOut)
def get_lead(lead_id: uuid.UUID, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:read"))):
    return _get(db, lead_id, include_deleted=True)


@router.patch("/{lead_id}", response_model=LeadDetailOut)
def update_lead(
    lead_id: uuid.UUID, payload: LeadPatch, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:write"))
):
    lead = _get(db, lead_id)
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is None:
        data.pop("status")
    before = lead.status
    for k, v in data.items():
        setattr(lead, k, v)
    audit.record(db, request, auth.user, "lead.update", "contact_lead", lead.id, {"fields": sorted(data), "from": before, "to": lead.status})
    commit(db)
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/notes", response_model=LeadNoteOut, status_code=201)
def add_note(
    lead_id: uuid.UUID, payload: LeadNoteIn, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:write"))
):
    lead = _get(db, lead_id)
    note = LeadNote(lead_id=lead.id, author_id=auth.user.id, author_email=auth.user.email, body=payload.body)
    db.add(note)
    audit.record(db, request, auth.user, "lead.note_added", "contact_lead", lead.id)
    commit(db)
    return note


@router.delete("/{lead_id}/notes/{note_id}", status_code=204)
def delete_note(
    lead_id: uuid.UUID, note_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:write"))
):
    note = db.scalar(select(LeadNote).where(LeadNote.id == note_id, LeadNote.lead_id == lead_id))
    if note is None:
        raise NotFound("Note not found.")
    db.delete(note)
    audit.record(db, request, auth.user, "lead.note_deleted", "contact_lead", lead_id)
    commit(db)
    return Response(status_code=204)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:delete"))):
    lead = _get(db, lead_id)
    lead.deleted_at = datetime.now(UTC)
    audit.record(db, request, auth.user, "lead.delete", "contact_lead", lead.id)
    commit(db)
    return Response(status_code=204)


@router.post("/{lead_id}/restore", response_model=LeadDetailOut)
def restore_lead(lead_id: uuid.UUID, request: Request, db: Session = Depends(get_db), auth: Auth = Depends(require("leads:delete"))):
    lead = _get(db, lead_id, include_deleted=True)
    lead.deleted_at = None
    audit.record(db, request, auth.user, "lead.restore", "contact_lead", lead.id)
    commit(db)
    db.refresh(lead)
    return lead
