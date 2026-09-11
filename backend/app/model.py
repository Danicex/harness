import enum
import uuid
from datetime import datetime, timezone
from typing import Optional, List
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
  