# Rooms — the bookable inventory behind the AI receptionist's "book a room".
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, select

from app.database import get_session
from app.model import Room, RoomStatus, Role
from app.auth.authentication import CurrentUser, require_role, scope_to_company

router = APIRouter(prefix="/room", tags=["rooms"])


class RoomCreate(BaseModel):
    number: str
    room_type: Optional[str] = None
    description: Optional[str] = None
    price: float = PField(gt=0)
    image_url: Optional[str] = None


class RoomRead(BaseModel):
    id: str
    company_id: str
    number: str
    room_type: Optional[str]
    description: Optional[str]
    price: float
    status: RoomStatus
    image_url: Optional[str]
    created_at: datetime


@router.post("/", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    room = Room(company_id=company_id, **payload.dict())
    session.add(room)
    session.commit()
    session.refresh(room)
    return room


@router.get("/", response_model=List[RoomRead])
def list_rooms(
    only_available: bool = False,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(Room)
    if company_id:
        stmt = stmt.where(Room.company_id == company_id)
    if only_available:
        stmt = stmt.where(Room.status == RoomStatus.AVAILABLE)
    return session.exec(stmt.order_by(Room.number)).all()
