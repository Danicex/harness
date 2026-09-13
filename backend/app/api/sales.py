# Inventory: sales. Every sale deducts Product.quantity and recomputes
# Product.status ("available" / "out_of_stock") in the same transaction.
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, select

from app.database import get_session
from app.model import Sale, Product, Role, StaffProfile
from app.auth.authentication import CurrentUser, require_role, scope_to_company
from app.api.product import _status_for

router = APIRouter(prefix="/sales", tags=["inventory"])


class SaleCreate(BaseModel):
    product_id: str
    quantity_sold: int = PField(gt=0)


class SaleRead(BaseModel):
    id: str
    company_id: str
    product_id: str
    staff_id: Optional[str]
    quantity_sold: int
    unit_price: float
    total_amount: float
    created_at: datetime


@router.post("/", response_model=SaleRead, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    product = session.get(Product, payload.product_id)
    if not product or (company_id and product.company_id != company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    if product.quantity < payload.quantity_sold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Only {product.quantity} left",
        )

    total_amount = product.price * payload.quantity_sold

    product.quantity -= payload.quantity_sold
    product.status = _status_for(product.quantity)
    product.updated_at = datetime.utcnow()

    staff_id = None
    if current_user.role == Role.STAFF:
        staff_profile = session.exec(
            select(StaffProfile).where(StaffProfile.auth_identity_id == current_user.id)
        ).first()
        staff_id = staff_profile.id if staff_profile else None

    sale = Sale(
        company_id=product.company_id,
        product_id=product.id,
        staff_id=staff_id,
        quantity_sold=payload.quantity_sold,
        unit_price=product.price,
        total_amount=total_amount,
    )

    session.add(product)
    session.add(sale)
    session.commit()
    session.refresh(sale)
    return sale


@router.get("/", response_model=List[SaleRead])
def list_sales(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(Sale)
    if company_id:
        stmt = stmt.where(Sale.company_id == company_id)
    return session.exec(stmt.order_by(Sale.created_at.desc())).all()
