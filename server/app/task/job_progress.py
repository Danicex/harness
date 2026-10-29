"""
Redis-backed job progress.

Key layout:
  job:{job_id}         HASH  type, admin_id, status, total, sent, failed, created_at, started_at, finished_at, campaign_id
  job:{job_id}:errors  LIST  last 50 error strings

Sync functions are used by Celery workers; the async get_job is used by FastAPI.
"""
import os
import time
import uuid
from typing import Optional

import redis
import redis.asyncio as aioredis

PROGRESS_REDIS_URL = os.getenv("PROGRESS_REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
JOB_TTL = 60 * 60 * 24  # keep progress for 24h
MAX_ERRORS = 50

TERMINAL = {"completed", "completed_with_errors", "failed"}

_sync = redis.Redis.from_url(PROGRESS_REDIS_URL, decode_responses=True)
_async = aioredis.Redis.from_url(PROGRESS_REDIS_URL, decode_responses=True)


def _key(job_id: str) -> str:
    return f"job:{job_id}"


def create_job(job_type: str, admin_id: int, total: int, campaign_id: Optional[int] = None) -> str:
    """job_type: 'email' | 'sms' | 'bulk_sms'. Call from the API before .delay()."""
    job_id = uuid.uuid4().hex
    pipe = _sync.pipeline()
    pipe.hset(_key(job_id), mapping={
        "type": job_type,
        "admin_id": str(admin_id),
        "campaign_id": str(campaign_id or ""),
        "status": "queued",
        "total": total,
        "sent": 0,
        "failed": 0,
        "created_at": time.time(),
    })
    pipe.expire(_key(job_id), JOB_TTL)
    pipe.execute()
    return job_id


def mark_running(job_id: str) -> None:
    _sync.hset(_key(job_id), mapping={"status": "running", "started_at": time.time()})


def incr(job_id: str, sent: int = 0, failed: int = 0, errors: Optional[list] = None) -> None:
    pipe = _sync.pipeline()
    if sent:
        pipe.hincrby(_key(job_id), "sent", sent)
    if failed:
        pipe.hincrby(_key(job_id), "failed", failed)
    if errors:
        ekey = f"{_key(job_id)}:errors"
        pipe.rpush(ekey, *[str(e) for e in errors])
        pipe.ltrim(ekey, -MAX_ERRORS, -1)
        pipe.expire(ekey, JOB_TTL)
    pipe.expire(_key(job_id), JOB_TTL)
    pipe.execute()


def finish(job_id: str) -> str:
    data = _sync.hgetall(_key(job_id))
    sent, failed = int(data.get("sent", 0)), int(data.get("failed", 0))
    if failed == 0:
        status = "completed"
    elif sent > 0:
        status = "completed_with_errors"
    else:
        status = "failed"
    _sync.hset(_key(job_id), mapping={"status": status, "finished_at": time.time()})
    return status


def fail(job_id: str, error: str) -> None:
    incr(job_id, errors=[error])
    _sync.hset(_key(job_id), mapping={"status": "failed", "finished_at": time.time()})


async def get_job(job_id: str) -> Optional[dict]:
    data = await _async.hgetall(_key(job_id))
    if not data:
        return None
    errors = await _async.lrange(f"{_key(job_id)}:errors", 0, -1)
    total, sent, failed = int(data["total"]), int(data["sent"]), int(data["failed"])
    done = sent + failed
    return {
        "job_id": job_id,
        "type": data["type"],
        "admin_id": data["admin_id"],
        "campaign_id": data.get("campaign_id") or None,
        "status": data["status"],
        "total": total,
        "sent": sent,
        "failed": failed,
        "percent": round(done / total * 100, 1) if total else 100.0,
        "errors": errors,
        "created_at": float(data["created_at"]),
        "started_at": float(data["started_at"]) if data.get("started_at") else None,
        "finished_at": float(data["finished_at"]) if data.get("finished_at") else None,
    }