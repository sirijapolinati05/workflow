import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class TaskCreateRequest(BaseModel):
    title: str
    description: str | None = None
    assigned_to_id: str | None = None
    created_by_id: str
    group_id: str | None = None
    priority: str = "MEDIUM"
    status: str = "PENDING"
    due_date: datetime | None = None
    start_date: datetime | None = None
    estimated_hours: int | None = Field(default=None, ge=0)
    tags: list[str] = []


class TaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    assigned_to_id: str | None = None
    group_id: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: datetime | None = None
    completed_at: datetime | None = None
    estimated_hours: int | None = Field(default=None, ge=0)
    tags: list[str] | None = None


class TaskResponse(ORMModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    status: str
    priority: str
    assigned_to_id: uuid.UUID | None = None
    created_by_id: uuid.UUID
    group_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    due_date: datetime | None = None
    start_date: datetime | None = None
    completed_at: datetime | None = None
    estimated_hours: int | None = None
    tags: list[str]


class TaskUpdateCreateRequest(BaseModel):
    message: str
    status: str | None = None


class TaskUpdateResponse(ORMModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    message: str
    status: str | None = None
    created_at: datetime

