# AI receptionist. One WebSocket per company (the hotel's own website embeds
# it) — it answers only from that company's data and can book a room via an
# OpenAI tool call, which lands in the same RoomBooking table the staff
# booking API writes to (see app/api/booking.py:book_room).
import json
import os
from datetime import date, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from openai import AsyncOpenAI
from redis.asyncio import Redis
from sqlmodel import Session, select

from app.database import engine
from app.model import Room, Product, HotelProfile, Dataset, RoomStatus
from app.utils.toon import toon_encode
from app.api.booking import book_room

api_key = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=api_key)
redis = Redis(host="localhost", port=int(os.getenv("REDIS_PORT", 6379)), decode_responses=True)

router = APIRouter(prefix="/chat", tags=["ai_receptionist"])
CACHE_TTL = 3600  # 1 hour

BOOK_ROOM_TOOL = {
    "type": "function",
    "function": {
        "name": "book_room",
        "description": "Book an available room for a guest. Only call this after the guest has confirmed the room, dates, and given their name.",
        "parameters": {
            "type": "object",
            "properties": {
                "room_id": {"type": "string"},
                "customer_name": {"type": "string"},
                "customer_email": {"type": "string"},
                "customer_phone": {"type": "string"},
                "check_in": {"type": "string", "description": "YYYY-MM-DD"},
                "check_out": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": ["room_id", "customer_name", "check_in", "check_out"],
        },
    },
}


def _dump(rows) -> list[dict]:
    return [r.model_dump(mode="json") for r in rows]


def _fetch_dataset_sync(session: Session, company_id: str) -> str:
    rooms = session.exec(
        select(Room).where(Room.company_id == company_id, Room.status == RoomStatus.AVAILABLE)
    ).all()
    products = session.exec(select(Product).where(Product.company_id == company_id)).all()
    intents = session.exec(select(Dataset).where(Dataset.company_id == company_id)).all()
    hotel_profile = session.exec(select(HotelProfile).where(HotelProfile.company_id == company_id)).first()

    payload = {
        "hotel_profile": hotel_profile.model_dump(mode="json") if hotel_profile else {},
        "available_rooms": _dump(rooms),
        "products": _dump(products),
        "dataset": _dump(intents),
    }
    return toon_encode(payload)


async def get_dataset(company_id: str) -> str:
    cache_key = f"chat_dataset:{company_id}"
    cached = await redis.get(cache_key)
    if cached is not None:
        return cached

    def _fetch():
        with Session(engine) as session:
            return _fetch_dataset_sync(session, company_id)

    result = await run_in_threadpool(_fetch)
    await redis.set(cache_key, result, ex=CACHE_TTL)
    return result


async def invalidate_dataset_cache(company_id: str):
    await redis.delete(f"chat_dataset:{company_id}")


def _run_book_room(company_id: str, args: dict) -> dict:
    with Session(engine) as session:
        try:
            booking = book_room(
                session,
                company_id=company_id,
                room_id=args["room_id"],
                customer_name=args["customer_name"],
                customer_email=args.get("customer_email"),
                customer_phone=args.get("customer_phone"),
                check_in=date.fromisoformat(args["check_in"]),
                check_out=date.fromisoformat(args["check_out"]),
                booked_via="ai_receptionist",
            )
            return {"success": True, "reserve_id": booking.reserve_id, "status": booking.status}
        except Exception as exc:  # HTTPException or validation error
            detail = getattr(exc, "detail", str(exc))
            return {"success": False, "error": detail}


@router.websocket("/ws/{company_id}")
async def chat_ws(websocket: WebSocket, company_id: str):
    await websocket.accept()
    try:
        dataset = await get_dataset(company_id)
        history = [
            {
                "role": "system",
                "content": (
                    "You are the hotel's AI receptionist. Answer only from the data below. "
                    "When a guest wants to book, confirm room, dates and name, then call book_room. "
                    f"\n{dataset}"
                ),
            }
        ]

        while True:
            user_prompt = await websocket.receive_text()
            history.append({"role": "user", "content": user_prompt})

            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=history,
                tools=[BOOK_ROOM_TOOL],
            )
            message = response.choices[0].message

            if message.tool_calls:
                history.append(message.model_dump(exclude_none=True))
                for tool_call in message.tool_calls:
                    args = json.loads(tool_call.function.arguments)
                    result = await run_in_threadpool(_run_book_room, company_id, args)
                    if result.get("success"):
                        await invalidate_dataset_cache(company_id)
                    history.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result),
                        }
                    )
                followup = await client.chat.completions.create(model="gpt-4o", messages=history)
                reply = followup.choices[0].message.content or ""
                history.append({"role": "assistant", "content": reply})
                await websocket.send_json({"type": "message", "content": reply})
            else:
                reply = message.content or ""
                history.append({"role": "assistant", "content": reply})
                await websocket.send_json({"type": "message", "content": reply})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        print(f"Error in AI receptionist WebSocket: {exc}")
        await websocket.close(code=1011)
