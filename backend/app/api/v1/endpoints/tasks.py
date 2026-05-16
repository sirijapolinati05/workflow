from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models import RoleName, Task, TaskUpdate, User
from app.schemas.common import PaginatedResponse
from app.schemas.tasks import TaskCreateRequest, TaskResponse, TaskUpdateCreateRequest, TaskUpdateResponse, TaskUpdateRequest
from app.services.crud import CRUDService
from app.services.realtime import connection_manager
from app.services.notifications import NotificationService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[TaskResponse])
def list_tasks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    status: str | None = None,
    assigned_to_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name == RoleName.EMPLOYEE:
        assigned_to_id = str(current_user.id)

    return CRUDService(db, Task).list(page, page_size, {"status": status, "assigned_to_id": assigned_to_id})


@router.post("", response_model=TaskResponse)
def create_task(
    payload: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    task = CRUDService(db, Task).create(payload.model_dump())
    if payload.assigned_to_id:
        background_tasks.add_task(
            NotificationService.create_notification,
            db,
            payload.assigned_to_id,
            "New Task Assigned",
            f"You have been assigned a new task: {task.title}",
            "TASK_ASSIGNED",
            {
                "task_id": str(task.id),
                "start_date": task.start_date.isoformat() if task.start_date else None,
                "deadline": task.due_date.isoformat() if task.due_date else None
            }
        )
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = CRUDService(db, Task)
    task = service.get(task_id)
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")

    # Only admins or the assignee can update the task
    is_admin = current_user.role.name in [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD]
    is_assignee = str(task.assigned_to_id) == str(current_user.id)

    if not (is_admin or is_assignee):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Permission denied")

    # If employee, they can ONLY update the status
    update_data = payload.model_dump(exclude_unset=True)
    if not is_admin:
        # Restriction: Employees can only change status
        status_only = {k: v for k, v in update_data.items() if k == "status"}
        update_data = status_only

    task = service.update(task_id, update_data)
    
    if task.assigned_to_id:
        background_tasks.add_task(
            NotificationService.create_notification,
            db,
            str(task.assigned_to_id),
            "Task Updated",
            f"Task '{task.title}' status has been updated to {task.status.value}",
            "TASK_UPDATED",
            {
                "task_id": str(task.id), 
                "status": task.status.value,
                "start_date": task.start_date.isoformat() if task.start_date else None,
                "deadline": task.due_date.isoformat() if task.due_date else None
            }
        )
    
    # Notify creator (Admin) if status changed by someone else
    if "status" in update_data and str(task.created_by_id) != str(current_user.id):
        background_tasks.add_task(
            NotificationService.create_notification,
            db,
            str(task.created_by_id),
            "Task Progress Update",
            f"Employee {current_user.full_name} updated task '{task.title}' to {task.status.value}",
            "TASK_UPDATED",
            {
                "task_id": str(task.id), 
                "status": task.status.value, 
                "updated_by": current_user.full_name,
                "deadline": task.due_date.isoformat() if task.due_date else None
            }
        )
    return task


@router.post("/{task_id}/updates", response_model=TaskUpdateResponse)
async def add_task_update(
    task_id: str,
    payload: TaskUpdateCreateRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    task_update = CRUDService(db, TaskUpdate).create(
        {"task_id": task_id, "user_id": user.id, "message": payload.message, "status": payload.status}
    )
    await connection_manager.broadcast(
        {"type": "task_feed_update", "task_id": task_id, "message": payload.message, "user_id": str(user.id)}
    )
    return task_update

@router.delete("/{task_id}")
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    CRUDService(db, Task).delete(task_id)
    return {"message": "Task deleted successfully"}
