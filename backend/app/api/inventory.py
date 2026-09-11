from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal, InvalidOperation

router = APIRouter(prefix="/inventory", tags=["Inventory"])

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: str
    category: Optional[str] = None
    quantity: Optional[str] = None
    image_url: Optional[str] = None

class SaleCreate(BaseModel):
    product_id: int
    quantity_sold: int

class SaleRead(BaseModel):
    id: int
    product_id: int
    quantity_sold: int
    unit_price: str
    total_amount: str
    created_at: datetime
    
def _to_int(value: Optional[str], field_name: str) -> int:
    try:
        return int(value) if value not in (None, "") else 0
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} value")


def _to_decimal(value: str, field_name: str) -> Decimal:
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} value")


@router.post("/products", response_model=Product)
def create_product(
    payload: ProductCreate,
    admin_id: int = Depends(get_current_admin_id),  # already handled in your app
    session: Session = Depends(get_session),
):
    qty = _to_int(payload.quantity, "quantity")
    product = Product(
        **payload.dict(),
        admin_id=admin_id,
        status="available" if qty > 0 else "out_of_stock",
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.post("/sales", response_model=SaleRead)
def create_sale(
    payload: SaleCreate,
    admin_id: int = Depends(get_current_admin_id),
    session: Session = Depends(get_session),
):
    if payload.quantity_sold <= 0:
        raise HTTPException(status_code=400, detail="quantity_sold must be positive")

    product = session.get(Product, payload.product_id)
    if not product or product.admin_id != admin_id:
        raise HTTPException(status_code=404, detail="Product not found")

    current_qty = _to_int(product.quantity, "product quantity")
    if current_qty < payload.quantity_sold:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Only {current_qty} left",
        )

    unit_price = _to_decimal(product.price, "product price")
    total_amount = unit_price * payload.quantity_sold

    new_qty = current_qty - payload.quantity_sold
    product.quantity = str(new_qty)
    product.status = "available" if new_qty > 0 else "out_of_stock"

    sale = Sale(
        product_id=product.id,
        admin_id=admin_id,
        quantity_sold=payload.quantity_sold,
        unit_price=str(unit_price),
        total_amount=str(total_amount),
    )

    session.add(product)
    session.add(sale)
    session.commit()
    session.refresh(sale)
    return sale


@router.get("/sales", response_model=List[SaleRead])
def list_sales(
    admin_id: int = Depends(get_current_admin_id),
    session: Session = Depends(get_session),
):
    statement = (
        select(Sale)
        .where(Sale.admin_id == admin_id)
        .order_by(Sale.created_at.desc())
    )
    return session.exec(statement).all()