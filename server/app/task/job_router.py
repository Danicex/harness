import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.auth.authentication import AuthUser, get_current_user
from job_progress import get_job, TERMINAL

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _get_owned_job(job_id: str, auth: AuthUser) -> dict:
    job = await get_job(job_id)
    # 404 (not 403) when it belongs to another tenant, so job ids can't be probed
    if not job or job["admin_id"] != str(auth.admin_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/{job_id}")
async def job_status(job_id: str, auth: AuthUser = Depends(get_current_user)):
    """Poll this from React every 1-2s until status is completed / completed_with_errors / failed."""
    return await _get_owned_job(job_id, auth)


@router.get("/{job_id}/stream")
async def job_stream(job_id: str, auth: AuthUser = Depends(get_current_user)):
    """Server-Sent Events: pushes the job state every second until it finishes."""
    await _get_owned_job(job_id, auth)

    async def events():
        while True:
            job = await get_job(job_id)
            if not job:
                break
            yield f"data: {json.dumps(job)}\n\n"
            if job["status"] in TERMINAL:
                break
            await asyncio.sleep(1)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})