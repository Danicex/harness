import enum
import uuid
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
from enum import Enum
from sqlalchemy import Column, Enum as SqlEnum, JSON, String
from sqlmodel import SQLModel, Field, Relationship


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    STAFF = "staff"
    COMPANY = "company"


class StaffRole(str, enum.Enum):
    MEMBER = "member"
    MANAGER = "manager"
    
class SubStatus(str, enum.Enum):
    PENDING = "pending"      # company signed up, never completed a charge
    ACTIVE = "active"
    PAST_DUE = "past_due"    # a renewal charge failed
    CANCELLED = "cancelled"


class AuthIdentity(SQLModel, table=True):
    """One row per login-capable account, regardless of role.
    Splitting login from profile keeps a single /auth/login for everyone,
    while role-specific data lives in its own table below."""
    __tablename__ = "auth_identities"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    password_hash: str
    role: Role = Field(sa_column=Column(SqlEnum(Role), nullable=False))
    is_active: bool = Field(default=True, nullable=False)
    email_verified: bool = Field(default=False, nullable=False)
    mfa_enabled: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    company_profile: Optional["Company"] = Relationship(back_populates="identity")
    staff_profile: Optional["StaffProfile"] = Relationship(
        back_populates="identity",
        sa_relationship_kwargs={"foreign_keys": "StaffProfile.auth_identity_id"},
    )
    user_profile: Optional["UserProfile"] = Relationship(back_populates="identity")
    admin_profile: Optional["AdminProfile"] = Relationship(back_populates="identity")


class Company(SQLModel, table=True):
    """A company IS a tenant. Its auth_identity is the tenant-owner login."""
    __tablename__ = "companies"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    auth_identity_id: str = Field(foreign_key="auth_identities.id", unique=True, nullable=False)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    identity: Optional[AuthIdentity] = Relationship(back_populates="company_profile")
    staff: list["StaffProfile"] = Relationship(back_populates="company")
    subscription: Optional["CompanySubscription"] = Relationship(
        back_populates="company",
        sa_relationship_kwargs={"uselist": False},
    )
 

class CompanySubscription(SQLModel, table=True):
    """One row per company. This table is the single source of truth for
    what a company can access — always check this, never trust the
    frontend's idea of the user's plan."""
    __tablename__ = "company_subscriptions"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", unique=True, nullable=False, index=True)
    plan_id: Optional[str] = Field(default=None)  # 'basic' | 'professional' | 'enterprise'
    status: SubStatus = Field(default=SubStatus.PENDING, sa_column=Column(SqlEnum(SubStatus), nullable=False))
    customer_email: Optional[str] = None
    subscription_code: Optional[str] = None  # needed to cancel later
    email_token: Optional[str] = None        # needed to cancel later
    current_period_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    company: Optional[Company] = Relationship(back_populates="subscription")


class StaffProfile(SQLModel, table=True):
    """Staff always belong to exactly one company and are never self-serve —
    they only ever come from an invite created by a company."""
    __tablename__ = "staff_profiles"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    auth_identity_id: str = Field(foreign_key="auth_identities.id", unique=True, nullable=False)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    staff_role: StaffRole = Field(
        default=StaffRole.MEMBER,
        sa_column=Column(SqlEnum(StaffRole), nullable=False),
    )
    invited_by: Optional[str] = Field(default=None, foreign_key="auth_identities.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    identity: Optional[AuthIdentity] = Relationship(
        back_populates="staff_profile",
        sa_relationship_kwargs={"foreign_keys": "StaffProfile.auth_identity_id"},
    )
    company: Optional[Company] = Relationship(back_populates="staff")


class UserProfile(SQLModel, table=True):
    """Independent end-user. Not tied to any company."""
    __tablename__ = "user_profiles"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    auth_identity_id: str = Field(foreign_key="auth_identities.id", unique=True, nullable=False)
    display_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    identity: Optional[AuthIdentity] = Relationship(back_populates="user_profile")


class AdminProfile(SQLModel, table=True):
    """Internal, independent role. Never created via public signup —
    seeded manually or provisioned by another admin."""
    __tablename__ = "admin_profiles"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    auth_identity_id: str = Field(foreign_key="auth_identities.id", unique=True, nullable=False)
    permissions: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    identity: Optional[AuthIdentity] = Relationship(back_populates="admin_profile")


# ---------------------------------------------------------------------------
# Domain models. Everything below is scoped by company_id — every query in
# every router MUST filter on it (use auth.authentication.scope_to_company).
# Admins bypass the filter (scope_to_company returns None for them).
# ---------------------------------------------------------------------------

class ProductStatus(str, enum.Enum):
    AVAILABLE = "available"
    OUT_OF_STOCK = "out_of_stock"


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    name: str
    description: Optional[str] = None
    price: float
    category: Optional[str] = None
    quantity: int = Field(default=0)
    image_url: Optional[str] = None
    status: ProductStatus = Field(
        default=ProductStatus.AVAILABLE,
        sa_column=Column(SqlEnum(ProductStatus), nullable=False),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Sale(SQLModel, table=True):
    """A sale always deducts from Product.quantity — see api/sales.py."""
    __tablename__ = "sales"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    product_id: str = Field(foreign_key="products.id", nullable=False, index=True)
    staff_id: Optional[str] = Field(default=None, foreign_key="staff_profiles.id")
    quantity_sold: int
    unit_price: float          # snapshot of product.price at time of sale
    total_amount: float        # unit_price * quantity_sold
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class RoomStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


class Room(SQLModel, table=True):
    __tablename__ = "rooms"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    number: str
    room_type: Optional[str] = None
    description: Optional[str] = None
    price: float
    status: RoomStatus = Field(
        default=RoomStatus.AVAILABLE,
        sa_column=Column(SqlEnum(RoomStatus), nullable=False),
    )
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookingStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"


class RoomBooking(SQLModel, table=True):
    __tablename__ = "room_bookings"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    room_id: str = Field(foreign_key="rooms.id", nullable=False, index=True)
    reserve_id: str = Field(index=True, unique=True)
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    check_in: date
    check_out: date
    status: BookingStatus = Field(
        default=BookingStatus.CONFIRMED,
        sa_column=Column(SqlEnum(BookingStatus), nullable=False),
    )
    booked_via: str = Field(default="staff")  # "staff" | "ai_receptionist"
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class HotelProfile(SQLModel, table=True):
    """One row per company. Feeds the AI receptionist's context."""
    __tablename__ = "hotel_profile"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", unique=True, nullable=False)
    hotel_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    image_url: Optional[str] = None
    social_links: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class Customer(SQLModel, table=True):
    """Campaign audience + booking history lookup."""
    __tablename__ = "customers"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    name: Optional[str] = None
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class CampaignChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    BOTH = "both"


class CampaignAudience(str, enum.Enum):
    ALL_CUSTOMERS = "all_customers"
    SPECIFIC = "specific"   # explicit list of customer_ids on CampaignRecipient


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"


class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    name: str
    channel: CampaignChannel = Field(sa_column=Column(SqlEnum(CampaignChannel), nullable=False))
    audience: CampaignAudience = Field(
        default=CampaignAudience.ALL_CUSTOMERS,
        sa_column=Column(SqlEnum(CampaignAudience), nullable=False),
    )
    subject: Optional[str] = None      # used for email
    message: str                       # body for email(text/html) or sms
    status: CampaignStatus = Field(
        default=CampaignStatus.DRAFT,
        sa_column=Column(SqlEnum(CampaignStatus), nullable=False),
    )
    scheduled_at: Optional[datetime] = None  # null => send immediately on create
    created_by: str = Field(foreign_key="auth_identities.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class CampaignRecipient(SQLModel, table=True):
    """The 'campaign history' — one row per message actually dispatched."""
    __tablename__ = "campaign_recipients"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    campaign_id: str = Field(foreign_key="campaigns.id", nullable=False, index=True)
    customer_id: Optional[str] = Field(default=None, foreign_key="customers.id")
    channel: CampaignChannel = Field(sa_column=Column(SqlEnum(CampaignChannel), nullable=False))
    destination: str = Field(nullable=False)   # email address or phone number
    status: DeliveryStatus = Field(
        default=DeliveryStatus.PENDING,
        sa_column=Column(SqlEnum(DeliveryStatus), nullable=False),
    )
    provider_message_id: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class StaffShift(SQLModel, table=True):
    __tablename__ = "staff_shifts"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    staff_id: str = Field(foreign_key="staff_profiles.id", nullable=False, index=True)
    label: Optional[str] = None            # "Morning", "Night" ...
    starts_at: datetime
    ends_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class StaffCheckIn(SQLModel, table=True):
    """A staff member's own attendance record for a shift/workday."""
    __tablename__ = "staff_check_ins"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    staff_id: str = Field(foreign_key="staff_profiles.id", nullable=False, index=True)
    shift_id: Optional[str] = Field(default=None, foreign_key="staff_shifts.id")
    check_in_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    check_out_at: Optional[datetime] = None
    note: Optional[str] = None


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class StaffTask(SQLModel, table=True):
    __tablename__ = "staff_tasks"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    staff_id: str = Field(foreign_key="staff_profiles.id", nullable=False, index=True)
    assigned_by: str = Field(foreign_key="auth_identities.id")
    title: str
    description: Optional[str] = None
    status: TaskStatus = Field(
        default=TaskStatus.PENDING,
        sa_column=Column(SqlEnum(TaskStatus), nullable=False),
    )
    due_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class StaffNotification(SQLModel, table=True):
    """staff_id = null means broadcast to the whole company's staff."""
    __tablename__ = "staff_notifications"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    staff_id: Optional[str] = Field(default=None, foreign_key="staff_profiles.id", index=True)
    title: str
    body: str
    is_read: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Dataset(SQLModel, table=True):
    """Extra Q&A/intent pairs the AI receptionist should answer from,
    on top of live rooms/products/hotel_profile data."""
    __tablename__ = "dataset"

    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="companies.id", nullable=False, index=True)
    title: str
    description: Optional[str] = None
    intent: Optional[List[Dict[str, Any]]] = Field(default_factory=list, sa_column=Column(JSON))
