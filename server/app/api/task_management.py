# CRUD task  ->  app/routers/task.py
from datetime import datetime, timezone
from typing import Annotated
from sqlmodel import select
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.authentication import AuthUser, require_admin, require_staff
from app.crud import create_data, delete_data, get_admin_data, get_single_data, update_data, get_staff_data
from app.database import SessionDep
from app.model import TaskCreate, TaskUpdate, Task

router = APIRouter(prefix="/task", tags=["tasks"])


# ---------- shared helpers ----------
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
    task_dict["created_at"] = datetime.now(timezone.utc)
    task_dict["updated_at"] = datetime.now(timezone.utc)
    
    success, task = create_data("task", task_dict, session)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create task")

    return {"message": "Task created successfully", "task": task}


@router.get("/get_task")
def read_tasks(session: SessionDep, auth: AdminDep):
    # Always return a list: the React calendar calls .map() on this response
    return get_admin_data(auth["admin_id"], "task", session) or []


@router.get("/get_staff_task")
def get_staff_task(session: SessionDep, user: AuthUser = Depends(require_staff)):
    staff_id = user["staff_id"] # AuthUser is an object, not a dict (see note below)

    statement = select(Task).where(
        Task.admin_id == user["admin_id"],                      # tenant scoping
        Task.assigned_staff.contains({"id": staff_id}),      # jsonb @> '{"id": 1}'
    )
    return session.exec(statement).all()



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
    task_dict["updated_at"] = datetime.now(timezone.utc)

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
