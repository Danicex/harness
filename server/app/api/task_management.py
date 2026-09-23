# CRUD task  ->  app/routers/task.py
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.auth.authentication import isAuthorized
from app.crud import create_data, delete_data, get_admin_data, get_single_data, update_data
from app.database import SessionDep
from app.model import TaskCreate, TaskUpdate

router = APIRouter(prefix="/task", tags=["tasks"])


# ---------- shared helpers (replaces the auth block repeated in every blog endpoint) ----------
def require_admin(authorization: str = Header(...)) -> dict:
    try:
        token = authorization.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=401, detail="Not authorized")

    auth = isAuthorized(token)
    if not auth or auth.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Not authorized")
    return auth


AdminDep = Annotated[dict, Depends(require_admin)]


def get_owned_task(task_id: int, admin_id: int, session):
    task = get_single_data(task_id, "task", session)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.admin_id != admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this task")
    return task


# ---------- endpoints ----------
@router.post("/create_task", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, session: SessionDep, auth: AdminDep):
    task_dict = payload.model_dump()
    task_dict["admin_id"] = auth.get("admin_id")
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()

    success, task = create_data("task", task_dict, session)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create task")

    return {"message": "Task created successfully", "task": task}


@router.get("/get_task")
def read_tasks(session: SessionDep, auth: AdminDep):
    # Always return a list: the React calendar calls .map() on this response
    return get_admin_data(auth["admin_id"], "task", session) or []


@router.get("/{task_id}")
def get_single_task(task_id: int, session: SessionDep, auth: AdminDep):
    task = get_owned_task(task_id, auth.get("admin_id"), session)
    return {"message": "Task retrieved successfully", "task": task}


@router.put("/update_task/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, session: SessionDep, auth: AdminDep):
    get_owned_task(task_id, auth.get("admin_id"), session)

    # partial update: only fields the client actually sent
    task_dict = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not task_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    task_dict["updated_at"] = datetime.utcnow()

    success, updated_task = update_data("task", task_id, task_dict, session)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update task")

    return {"message": "Task updated successfully", "task": updated_task}


@router.delete("/delete_task/{task_id}")
def delete_task(task_id: int, session: SessionDep, auth: AdminDep):
    get_owned_task(task_id, auth.get("admin_id"), session)

    if not delete_data("task", task_id, session):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete task")

    return {"message": "Task deleted successfully"}