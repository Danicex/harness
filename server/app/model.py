from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from datetime import date, datetime, time
from typing import Optional, List, Dict, Any
from sqlalchemy.dialects.postgresql import JSONB
from decimal import Decimal, InvalidOperation
from enum import Enum

class Admin(SQLModel, table=True):
    __tablename__ = "admin"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password: str
    role: str
    jwt_token: Optional[str] = None
    reset_password_token: Optional[str] = None
    reset_password_expiry: Optional[datetime] = None
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    products: List["Product"] = Relationship(back_populates="admin")
    customers: List["Customer"] = Relationship(back_populates="admin")
    staff: List["Staff"] = Relationship(back_populates="admin")
    rooms: List["Room"] = Relationship(back_populates="admin")
    sales: List["Sales"] = Relationship(back_populates="admin")
    bookings: List["Booking"] = Relationship(back_populates="admin")
    hotel_profile: Optional["HotelProfile"] = Relationship(back_populates="admin", sa_relationship_kwargs={"uselist": False})
    inboxes: List["Inbox"] = Relationship(back_populates="admin")
    blogs: List["Blog"] = Relationship(back_populates="admin")
    # Dataset.admin_id is unique -> this is 1:1, not 1:many
    dataset: Optional["Dataset"] = Relationship(back_populates="admin", sa_relationship_kwargs={"uselist": False})
    call_logs: List["CallLog"] = Relationship(back_populates="admin")
    tasks: List["Task"] = Relationship(
        back_populates="admin",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    credentials: Optional["AdminCredentials"] = Relationship(
        back_populates="admin", 
        sa_relationship_kwargs={"uselist": False}
    )
    
class AdminCredentials(SQLModel, table=True):
    __tablename__ = "admin_credentials"

    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: int = Field(foreign_key="admin.id", unique=True)  # <- was missing entirely
    agent_phone: Optional[str] = None
    african_talking_api_key: Optional[str] = None
    domain_name: Optional[str] = None
    resend_api_key: Optional[str] = None
    verified_domain: bool = Field(default=False)

    admin: Optional["Admin"] = Relationship(
        back_populates="credentials",
        sa_relationship_kwargs={"uselist": False},
    )

class Product(SQLModel, table=True):
    __tablename__ = "products"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    name: str
    description: Optional[str] = None
    price: str
    category: Optional[str] = None
    quantity: Optional[str] = None
    image_url: Optional[str] = None
    status: str = Field(default="available")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional["Admin"] = Relationship(back_populates="products")


class Sales(SQLModel, table=True):
    __tablename__ = "sales"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    total_amount: str
    payment_method: str
    # products_data is the source of truth for line items -> no singular
    # product_id/relationship; a sale is a cart of N products, not 1.
    products_data: List[Any] = Field(
        default_factory=list, sa_type=JSONB, nullable=False
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional["Admin"] = Relationship(back_populates="sales")


class Room(SQLModel, table=True):
    __tablename__ = "rooms"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    number: str
    room_type: Optional[str] = None
    description: Optional[str] = None
    price: str
    status: Optional[str] = None
    image_url: Optional[str] = None
    pictures: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional[Admin] = Relationship(back_populates="rooms")
    bookings: List["Booking"] = Relationship(back_populates="room")


class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    admin_id: int = Field(foreign_key="admin.id")
    admin: Optional[Admin] = Relationship(back_populates="customers")


class Staff(SQLModel, table=True):
    __tablename__ = "staff"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    name: str
    bio: Optional[str] = None
    role: Optional[str] = None
    cv_url: Optional[str] = None
    image_url: Optional[str] = None
    email: str = Field(index=True, unique=True)
    password: str
    prev_password: str
    jwt_token: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional[Admin] = Relationship(back_populates="staff")
    bookings: List["Booking"] = Relationship(back_populates="staff")


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    room_id: Optional[int] = Field(default=None, foreign_key="rooms.id")
    staff_id: Optional[int] = Field(default=None, foreign_key="staff.id")
    room_number: Optional[str] = None
    price: Optional[str] = None
    status: Optional[str] = None
    reserve_id: Optional[str] = None
    duration: Optional[str] = None
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional[Admin] = Relationship(back_populates="bookings")
    room: Optional[Room] = Relationship(back_populates="bookings")
    staff: Optional[Staff] = Relationship(back_populates="bookings")


class HotelProfile(SQLModel, table=True):
    __tablename__ = "hotel_profile"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id", unique=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    hotel_name: Optional[str] = None
    website_url: Optional[str] = None
    agent_phone: Optional[str] = None
    social_links: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    image_url: Optional[str] = None

    admin: Optional["Admin"] = Relationship(back_populates="hotel_profile")


class Inbox(SQLModel, table=True):
    __tablename__ = "inbox"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    email: Optional[str] = None
    body: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional[Admin] = Relationship(back_populates="inboxes")


class Blog(SQLModel, table=True):
    __tablename__ = "blogs"
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id")
    title: str
    category: str = Field(default="public")
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Optional[Admin] = Relationship(back_populates="blogs")


class Dataset(SQLModel, table=True):
    __tablename__ = "dataset"

    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: Optional[int] = Field(default=None, foreign_key="admin.id", unique=True)
    title: str
    description: Optional[str] = None
    intent: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        sa_type=JSON
    )
    admin: Optional["Admin"] = Relationship(back_populates="dataset")


class CallLog(SQLModel, table=True):
    __tablename__ = "call_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    status: str = Field(default="active")
    duration: str
    sentiment: str
    admin_id: int = Field(foreign_key="admin.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    admin: Admin = Relationship(back_populates="call_logs")


class AttendanceStatus(str, Enum):
    check_in = "check_in"
    check_out = "check_out"


class Attendance(SQLModel, table=True):
    __tablename__ = "attendance"

    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", index=True)
    name: str
    admin_id: int = Field(foreign_key="admin.id", index=True)
    status: AttendanceStatus
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AttendanceRead(SQLModel):
    id: int
    staff_id: int
    status: AttendanceStatus
    created_at: datetime


# ---------- Task enums ----------
class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in progress"  # value matches what the React UI sends/expects
    completed = "completed"


# ---------- Task DB table ----------
class Task(SQLModel, table=True):
    __tablename__ = "task"

    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: int = Field(foreign_key="admin.id", index=True)

    task_title: str = Field(max_length=200)
    description: Optional[str] = None
    department: str = Field(index=True)
    assigned_staff: dict = Field(
        default_factory=dict, 
        sa_column=Column(JSONB, nullable=False, default={})
    )

    # stored as plain strings (validated by the enums in the request schemas below)
    # so you avoid native Postgres ENUM types and painful migrations
    priority: str = Field(default="medium", index=True)
    status: str = Field(default="pending", index=True)

    due_date: date = Field(index=True)
    due_time: Optional[time] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Must match Admin.tasks (back_populates="admin" <-> back_populates="tasks")
    admin: Optional["Admin"] = Relationship(back_populates="tasks")


# ---------- Task request schemas (not tables) ----------
class TaskCreate(SQLModel):
    model_config = {"use_enum_values": True}  # model_dump() returns plain strings, safe for the DB

    task_title: str
    description: Optional[str] = None
    department: str
    assigned_staff: str
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.pending
    due_date: date
    due_time: Optional[time] = None


class TaskUpdate(SQLModel):
    model_config = {"use_enum_values": True}

    task_title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    assigned_staff: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None
    due_time: Optional[time] = None