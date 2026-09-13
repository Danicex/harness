# One profile per company — feeds the AI receptionist's system context and
# outbound booking/campaign emails. Upsert rather than plain create since a
# company only ever has one.
from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from sqlmodel import Session, select

from app.database import get_session
from app.model import HotelProfile, Role
from app.auth.authentication import CurrentUser, require_role, scope_to_company

router = APIRouter(prefix="/hotel_profile", tags=["hotel_profile"])


class HotelProfileUpsert(BaseModel):
    hotel_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    image_url: Optional[str] = None
    social_links: Optional[dict] = None


class HotelProfileRead(HotelProfileUpsert):
    id: str
    company_id: str


@router.put("/", response_model=HotelProfileRead, status_code=status.HTTP_200_OK)
def upsert_hotel_profile(
    payload: HotelProfileUpsert,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY)),
    session: Session = Depends(get_session),
):
    profile = session.exec(select(HotelProfile).where(HotelProfile.company_id == company_id)).first()
    if not profile:
        profile = HotelProfile(company_id=company_id)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(profile, field, value)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


@router.get("/", response_model=HotelProfileRead)
def get_hotel_profile(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    profile = session.exec(select(HotelProfile).where(HotelProfile.company_id == company_id)).first()
    if not profile:
        profile = HotelProfile(company_id=company_id)  # empty default, not persisted
    return profile
