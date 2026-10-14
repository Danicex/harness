import logging
import os
from typing import Any, Dict, List, Optional

import redis
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.encoders import jsonable_encoder
from openai import OpenAI
from pydantic import BaseModel
from sqlmodel import select

from app.crud import get_admin_data
from app.database import SessionDep
from app.model import Dataset
from app.auth.authentication import isAuthorized  # adjust to wherever isAuthorized lives
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
        "rooms": get_admin_data("room_data", admin_id, session),
        "hotel_info": get_admin_data("hotel_information", admin_id, session),
        "custom_dataset": get_admin_data("dataset", admin_id, session),
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
def require_admin(authorization: str = Header(...)) -> int:
    try:
        token = authorization.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=401, detail="Not authorized")
    auth = isAuthorized(token)
    if not auth or auth.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Not authorized")
    return auth["admin_id"]


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
class Intent(BaseModel):
    question: str
    answer: str


class DatasetIn(BaseModel):
    title: str
    description: Optional[str] = None
    intent: List[Intent] = []


def _get_or_404(session: SessionDep, admin_id: int) -> Dataset:
    ds = session.exec(select(Dataset).where(Dataset.admin_id == admin_id)).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


@router.get("/dataset")
def read_dataset(session: SessionDep, admin_id: int = Depends(require_admin)):
    return _get_or_404(session, admin_id)


@router.post("/dataset", status_code=status.HTTP_201_CREATED)
def create_dataset(payload: DatasetIn, session: SessionDep, admin_id: int = Depends(require_admin)):
    exists = session.exec(select(Dataset).where(Dataset.admin_id == admin_id)).first()
    if exists:
        raise HTTPException(status_code=409, detail="Dataset already exists, update it instead")
    ds = Dataset(
        admin_id=admin_id,
        title=payload.title,
        description=payload.description,
        intent=[i.model_dump() for i in payload.intent],
    )
    session.add(ds)
    session.commit()
    session.refresh(ds)
    invalidate_context(admin_id)
    return ds


@router.put("/dataset")
def update_dataset(payload: DatasetIn, session: SessionDep, admin_id: int = Depends(require_admin)):
    ds = _get_or_404(session, admin_id)
    ds.title = payload.title
    ds.description = payload.description
    ds.intent = [i.model_dump() for i in payload.intent]  # reassign so JSON change is detected
    session.add(ds)
    session.commit()
    session.refresh(ds)
    invalidate_context(admin_id)
    return ds


@router.delete("/dataset")
def delete_dataset(session: SessionDep, admin_id: int = Depends(require_admin)):
    ds = _get_or_404(session, admin_id)
    session.delete(ds)
    session.commit()
    invalidate_context(admin_id)
    return {"message": "Dataset deleted"}