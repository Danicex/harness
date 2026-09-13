# Minimal customer record — mainly exists so campaigns have an audience to
# resolve against and so bookings can be tied back to a repeat guest.
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from app.database import get_session
from app.model import Customer, Role
from app.auth.authentication import CurrentUser, require_role, scope_to_company

router = APIRouter(prefix="/customer", tags=["customers"])


class CustomerCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class CustomerRead(BaseModel):
    id: str
    company_id: str
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    created_at: datetime


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    customer = Customer(company_id=company_id, **payload.dict())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.get("/", response_model=List[CustomerRead])
def list_customers(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(Customer)
    if company_id:
        stmt = stmt.where(Customer.company_id == company_id)
    return session.exec(stmt.order_by(Customer.created_at.desc())).all()
