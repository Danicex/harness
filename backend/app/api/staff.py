# Staff attendance, shifts, tasks, and notifications.
# Staff account creation/invite lives in app/auth/authentication.py
# (POST /auth/staff/invite) — this router is everything a staff member
# does day-to-day once their account exists.
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, or_

from app.database import get_session
from app.model import (
    StaffCheckIn, StaffShift, StaffTask, StaffNotification, StaffProfile,
    TaskStatus, Role,
)
from app.auth.authentication import CurrentUser, require_role, scope_to_company

router = APIRouter(prefix="/staff", tags=["staff"])


def _require_staff(current_user: CurrentUser) -> str:
    """StaffProfile.id, not the auth identity id, is the FK used everywhere
    below. The JWT only carries company_id, so callers hitting these routes
    as staff must resolve their own StaffProfile row first."""
    if current_user.role != Role.STAFF:
        raise HTTPException(status_code=403, detail="Only staff accounts use this endpoint")
    return current_user.id


# --- check-in / check-out ---------------------------------------------------

class CheckInRead(BaseModel):
    id: str
    staff_id: str
    shift_id: Optional[str]
    check_in_at: datetime
    check_out_at: Optional[datetime]
    note: Optional[str]


@router.post("/check-in", response_model=CheckInRead, status_code=status.HTTP_201_CREATED)
def check_in(
    shift_id: Optional[str] = None,
    note: Optional[str] = None,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.STAFF)),
    session: Session = Depends(get_session),
):
    staff_profile_id = _resolve_staff_profile_id(session, current_user)
    record = StaffCheckIn(
        company_id=company_id,
        staff_id=staff_profile_id,
        shift_id=shift_id,
        note=note,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.post("/check-out/{check_in_id}", response_model=CheckInRead)
def check_out(
    check_in_id: str,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.STAFF)),
    session: Session = Depends(get_session),
):
    record = session.get(StaffCheckIn, check_in_id)
    staff_profile_id = _resolve_staff_profile_id(session, current_user)
    if not record or record.staff_id != staff_profile_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
    if record.check_out_at:
        raise HTTPException(status_code=400, detail="Already checked out")

    record.check_out_at = datetime.utcnow()
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.get("/check-ins", response_model=List[CheckInRead])
def list_check_ins(
    staff_id: Optional[str] = None,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    """Company/managers see everyone; a staff account only ever sees its own."""
    stmt = select(StaffCheckIn)
    if company_id:
        stmt = stmt.where(StaffCheckIn.company_id == company_id)
    if current_user.role == Role.STAFF:
        stmt = stmt.where(StaffCheckIn.staff_id == _resolve_staff_profile_id(session, current_user))
    elif staff_id:
        stmt = stmt.where(StaffCheckIn.staff_id == staff_id)
    return session.exec(stmt.order_by(StaffCheckIn.check_in_at.desc())).all()


# --- shifts ------------------------------------------------------------------

class ShiftCreate(BaseModel):
    staff_id: str
    label: Optional[str] = None
    starts_at: datetime
    ends_at: datetime


class ShiftRead(BaseModel):
    id: str
    staff_id: str
    label: Optional[str]
    starts_at: datetime
    ends_at: datetime


@router.post("/shifts", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
def create_shift(
    payload: ShiftCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
    session: Session = Depends(get_session),
):
    shift = StaffShift(company_id=company_id, **payload.dict())
    session.add(shift)
    session.commit()
    session.refresh(shift)
    return shift


@router.get("/shifts", response_model=List[ShiftRead])
def list_shifts(
    staff_id: Optional[str] = None,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(StaffShift)
    if company_id:
        stmt = stmt.where(StaffShift.company_id == company_id)
    if current_user.role == Role.STAFF:
        stmt = stmt.where(StaffShift.staff_id == _resolve_staff_profile_id(session, current_user))
    elif staff_id:
        stmt = stmt.where(StaffShift.staff_id == staff_id)
    return session.exec(stmt.order_by(StaffShift.starts_at.desc())).all()


# --- tasks ---------------------------------------------------------------

class TaskCreate(BaseModel):
    staff_id: str
    title: str
    description: Optional[str] = None
    due_at: Optional[datetime] = None


class TaskUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    id: str
    staff_id: str
    title: str
    description: Optional[str]
    status: TaskStatus
    due_at: Optional[datetime]
    created_at: datetime


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
    session: Session = Depends(get_session),
):
    task = StaffTask(company_id=company_id, assigned_by=current_user.id, **payload.dict())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.get("/tasks", response_model=List[TaskRead])
def list_tasks(
    staff_id: Optional[str] = None,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(StaffTask)
    if company_id:
        stmt = stmt.where(StaffTask.company_id == company_id)
    if current_user.role == Role.STAFF:
        stmt = stmt.where(StaffTask.staff_id == _resolve_staff_profile_id(session, current_user))
    elif staff_id:
        stmt = stmt.where(StaffTask.staff_id == staff_id)
    return session.exec(stmt.order_by(StaffTask.created_at.desc())).all()


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task_status(
    task_id: str,
    payload: TaskUpdate,
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    task = session.get(StaffTask, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role == Role.STAFF and task.staff_id != _resolve_staff_profile_id(session, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task")

    task.status = payload.status
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


# --- notifications ---------------------------------------------------------

class NotifyCreate(BaseModel):
    title: str
    body: str
    staff_id: Optional[str] = None  # omit to broadcast to the whole company


class NotificationRead(BaseModel):
    id: str
    staff_id: Optional[str]
    title: str
    body: str
    is_read: bool
    created_at: datetime


@router.post("/notify", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
def notify_staff(
    payload: NotifyCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
    session: Session = Depends(get_session),
):
    notification = StaffNotification(company_id=company_id, **payload.dict())
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.get("/notifications", response_model=List[NotificationRead])
def list_notifications(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.STAFF)),
    session: Session = Depends(get_session),
):
    staff_profile_id = _resolve_staff_profile_id(session, current_user)
    stmt = select(StaffNotification).where(
        StaffNotification.company_id == company_id,
        or_(StaffNotification.staff_id == staff_profile_id, StaffNotification.staff_id == None),  # noqa: E711
    )
    return session.exec(stmt.order_by(StaffNotification.created_at.desc())).all()


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: str,
    current_user: CurrentUser = Depends(require_role(Role.STAFF)),
    session: Session = Depends(get_session),
):
    notification = session.get(StaffNotification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


def _resolve_staff_profile_id(session: Session, current_user: CurrentUser) -> str:
    profile = session.exec(
        select(StaffProfile).where(StaffProfile.auth_identity_id == current_user.id)
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No staff profile for this account")
    return profile.id
