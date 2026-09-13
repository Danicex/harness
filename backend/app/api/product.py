# Inventory: products
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PField
from sqlmodel import Session, select

from app.database import get_session
from app.model import Product, ProductStatus, Role
from app.auth.authentication import CurrentUser, require_role, scope_to_company

router = APIRouter(prefix="/product", tags=["inventory"])


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = PField(gt=0)
    category: Optional[str] = None
    quantity: int = PField(default=0, ge=0)
    image_url: Optional[str] = None


class ProductRead(BaseModel):
    id: str
    company_id: str
    name: str
    description: Optional[str]
    price: float
    category: Optional[str]
    quantity: int
    image_url: Optional[str]
    status: ProductStatus
    created_at: datetime
    updated_at: datetime


def _status_for(quantity: int) -> ProductStatus:
    return ProductStatus.AVAILABLE if quantity > 0 else ProductStatus.OUT_OF_STOCK


# Company owners and staff can both stock/manage inventory.
@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF)),
    session: Session = Depends(get_session),
):
    product = Product(
        company_id=company_id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
        category=payload.category,
        quantity=payload.quantity,
        image_url=payload.image_url,
        status=_status_for(payload.quantity),
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


# Convenience read endpoint — sales/campaigns/the AI receptionist all need a
# way to look products up, so this ships alongside create rather than as a
# separate CRUD surface.
@router.get("/", response_model=List[ProductRead])
def list_products(
    company_id: Optional[str] = Depends(scope_to_company),
    current_user: CurrentUser = Depends(require_role(Role.COMPANY, Role.STAFF, Role.ADMIN)),
    session: Session = Depends(get_session),
):
    stmt = select(Product)
    if company_id:  # admin (None) sees everything
        stmt = stmt.where(Product.company_id == company_id)
    return session.exec(stmt.order_by(Product.created_at.desc())).all()
