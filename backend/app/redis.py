import redis.asyncio as redis
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_PORT = os.getenv("REDIS_PORT")

async def get_redis_client():
    """Dependency that returns a Redis client instance."""
    client = redis.Redis(
        host='localhost',
        port=REDIS_PORT,
        db=0,
        decode_responses=True
    )
    try:
        yield client
    finally:
        await client.close()