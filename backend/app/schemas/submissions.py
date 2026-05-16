from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, HttpUrl, computed_field

from app.schemas.common import ORMModel


class SubmissionCreateRequest(BaseModel):
    task_id: UUID | str | None = None
    title: str
    description: str
    category: str
    priority: str = "MEDIUM"
    deployment_link: str | None = None
    github_pr_link: str | None = None
    duration: str | None = None
    deadline: datetime | None = None
    links: list[dict] | None = None


class SubmissionResponse(ORMModel):
    id: UUID | str
    task_id: UUID | str | None = None
    submitted_by_id: UUID | str
    title: str
    description: str
    category: str
    priority: str
    deployment_link: str | None = None
    github_pr_link: str | None = None
    duration: str | None = None
    deadline: datetime | None = None
    status: str
    feedback: str | None = None
    links: list[dict] | None = None
    files: list["SubmissionFileResponse"] = []
    created_at: datetime


class SubmissionFileResponse(ORMModel):
    id: UUID | str
    submission_id: UUID | str
    file_name: str
    content_type: str
    size_bytes: int
    is_feedback: bool
    created_at: datetime
    
    @computed_field
    @property
    def file_url(self) -> str:
        return f"http://localhost:8000/api/v1/submissions/files/{self.id}"

