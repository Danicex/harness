# Room bookings. book_room() is the core function — it's used both by this
# router (staff creating a booking on a guest's behalf) and directly by the
# AI receptionist (app/api/chatbot.py) when a website visitor books through
# chat, which never carries a staff JWT.
import random
import string
from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from app.database import get_session
from app.model import RoomBooking, Room, RoomStatus, BookingStatus, Customer, Role
from app.auth.authentication import CurrentUser, require_role, scope_to_company
from app.services.mailer import send_mail

router = APIRouter(prefix="/booking", tags=["booking"])


def _generate_reserve_id() -> str:
    return "".join(random.choices(string.ascii_uppercase, k=3)) + "".join(random.choices(string.digits, k=7))


def book_room(
    session: Session,
    company_id: str,
    room_id: str,
    customer_name: str,
    check_in: date,
    check_out: date,
    customer_email: Optional[str] = None,
    customer_phone: Optional[str] = None,
    booked_via: str = "staff",
) -> RoomBooking:
    """Core booking function: validates availability, creates the booking,
    flips the room to occupied, upserts a Customer record, and emails a
    confirmation if we have an address. Raises HTTPException on failure so
    both the REST route and the chatbot tool-call can surface the same
    errors to their caller."""
    room = session.get(Room, room_id)
    if not room or room.company_id != company_id:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.status != RoomStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail=f"Room {room.number} is not available")
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    booking = RoomBooking(
        company_id=company_id,
        room_id=room_id,
        reserve_id=_generate_reserve_id(),
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        check_in=check_in,
        check_out=check_out,
        status=BookingStatus.CONFIRMED,
        booked_via=booked_via,
    )
    room.status = RoomStatus.OCCUPIED
    session.add(room)
    session.add(booking)

    if customer_email:
        existing = session.exec(
            select(Customer).where(Customer.company_id == company_id, Customer.email == customer_email)
        ).first()
        if not existing:
            session.add(Customer(company_id=company_id, name=customer_name, email=customer_email, phone=customer_phone))

    session.commit()
    session.refresh(booking)

    if customer_email:
        html = (
            f"<p>Hi {customer_name},</p>"
            f"<p>Your booking for room {room.number} is confirmed.</p>"
            f"<p>Reservation ID: {booking.reserve_id}<br>"
            f"Check-in: {check_in}<br>Check-out: {check_out}</p>"
        )
        import asyncio
        try:
            asyncio.run(send_mail(to=customer_email, subject="Booking Confirmation", html=html))
        except Exception:
            pass  # booking already succeeded — don't fail the request over email

    return booking


class BookingCreate(BaseModel):
    room_id: str
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    check_in: date
    check_out: date


class BookingRead(BaseModel):
    id: str
    company_id: str
    room_id: str
    reserve_id: str
    customer_name: str
    customer_email: Optional[str]
    customer_phone: Optional[str]
    check_in: date
    check_out: date
    status: BookingStatus
    booked_via: str


@router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    return book_room(session, company_id, booked_via="staff", **payload.dict())


@router.get("/", response_model=List[BookingRead])
def list_bookings(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(RoomBooking)
    if company_id:
        stmt = stmt.where(RoomBooking.company_id == company_id)
    return session.exec(stmt.order_by(RoomBooking.created_at.desc())).all()
