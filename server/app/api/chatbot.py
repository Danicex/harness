import logging
import os
from typing import Any, Dict, List, Optional
import json
import redis
from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.encoders import jsonable_encoder
from openai import OpenAI
from pydantic import BaseModel, Field
from sqlmodel import select

from app.crud import get_admin_data, create_data, read_admin_data
from app.database import SessionDep
from app.model import Dataset
from app.auth.authentication import AuthUser, require_admin as require_admin_user
from app.utils.toon import toon_encode

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chatbot", tags=["chatbot"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
redis_client = redis.Redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True
)
CACHE_TTL = 60 * 60  # 1 hour safety net; we also invalidate explicitly


# ==========================================
# REDIS CONTEXT CACHE
# ==========================================
def _key(admin_id: int) -> str:
    return f"chatbot:context:{admin_id}"


def invalidate_context(admin_id: int) -> None:
    """Call this whenever rooms / hotel_info / dataset change for an admin."""
    try:
        redis_client.delete(_key(admin_id))
    except redis.RedisError:
        logger.warning("Redis unavailable, could not invalidate cache")


def build_context(admin_id: int, session: SessionDep) -> str:
    """Fetch from DB and compress with toon. Only runs on cache miss."""
    data_set: Dict[str, Any] = {
        "rooms": read_admin_data( admin_id,"room", session),
        "hotel_info": read_admin_data( admin_id,"hotel_profile", session),
        "custom_dataset": read_admin_data(admin_id,"dataset",  session),
    }
    return toon_encode(jsonable_encoder(data_set))


def get_context(admin_id: int, session: SessionDep) -> str:
    try:
        cached = redis_client.get(_key(admin_id))
        if cached:
            return cached
    except redis.RedisError:
        logger.warning("Redis unavailable, falling back to DB")

    context = build_context(admin_id, session)
    try:
        redis_client.set(_key(admin_id), context, ex=CACHE_TTL)
    except redis.RedisError:
        pass
    return context


# ==========================================
# AUTH
# ==========================================
def require_admin(user: AuthUser = Depends(require_admin_user)) -> int:
    """Tenant id of the logged-in admin."""
    return user["admin_id"]


# ==========================================
# CHAT
# ==========================================
class ChatPayload(BaseModel):
    admin_id: int
    user_input: str


def ask_llm(user_input: str, context: str) -> str:
    system_prompt = (
        "You are an AI Hotel Receptionist. Be polite, professional, and helpful. "
        "Answer using only the hotel data below (compact TOON format). "
        "If the answer is not in the data, politely say you'll check with human management.\n\n"
        f"Hotel data:\n{context}"
    )
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ],
        temperature=0.5,
    )
    return response.choices[0].message.content


@router.post("/chat")
def chat(payload: ChatPayload, session: SessionDep):
    context = get_context(payload.admin_id, session)
    try:
        reply = ask_llm(payload.user_input, context)
    except Exception:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail="Receptionist is unavailable right now")
    return {"status": "success", "reply": reply}


# ==========================================
# DATASET CRUD (one dataset per admin, admin_id is unique)
# ==========================================

# ---------- schemas ----------
class IntentItem(BaseModel):
    question: str
    answer: str
 
 
class DatasetIn(BaseModel):
    title: str
    description: Optional[str] = None
    intent: List[IntentItem] = []
 
 
class DatasetOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    intent: List[IntentItem] = []
 
 
# ---------- helpers ----------
def get_owned(session, dataset_id: int, auth: AuthUser) -> Dataset:
    ds = session.get(Dataset, dataset_id)
    if not ds or ds.admin_id != auth:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dataset not found")
    return ds
 
 
# ---------- routes ----------
@router.get("/dataset", response_model=List[DatasetOut])
def list_datasets(session: SessionDep, auth: AuthUser = Depends(require_admin)):
    # admin_id = auth
    print(auth)
    stmt = select(Dataset).where(Dataset.admin_id == auth).order_by(Dataset.id.desc())
    return session.exec(stmt).all()
 
 
@router.get("/dataset/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: int, session: SessionDep, auth: AuthUser = Depends(require_admin)):
    return get_owned(session, dataset_id, auth)
 
 
@router.post("/dataset", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
def create_dataset(payload: DatasetIn, session: SessionDep, auth: AuthUser = Depends(require_admin)):
    ds = Dataset(
        admin_id=auth,
        title=payload.title,
        description=payload.description,
        intent=[i.model_dump() for i in payload.intent],  # .dict() on Pydantic v1
    )
    session.add(ds)
    session.commit()
    session.refresh(ds)
    return ds
 
 
@router.put("/dataset/{dataset_id}", response_model=DatasetOut)
def update_dataset(
    dataset_id: int,
    payload: DatasetIn,
    session: SessionDep,
    auth: AuthUser = Depends(require_admin),
):
    ds = get_owned(session, dataset_id, auth)
    ds.title = payload.title
    ds.description = payload.description
    ds.intent = [i.model_dump() for i in payload.intent]  # assign a new list so the JSON change is detected
    session.add(ds)
    session.commit()
    session.refresh(ds)
    return ds
 
 
@router.delete("/dataset/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(dataset_id: int, session: SessionDep, auth: AuthUser = Depends(require_admin)):
    ds = get_owned(session, dataset_id, auth)
    session.delete(ds)
    session.commit()
 