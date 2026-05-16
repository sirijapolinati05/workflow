import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class MessageCreateRequest(BaseModel):
    recipient_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    thread_id: str | None = None
    body: str | None = None
    type: str = "text"
    metadata: dict | None = None
    attachment_url: str | None = None
    reply_to_id: uuid.UUID | None = None


class MessageResponse(ORMModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID | None = None
    group_id: uuid.UUID | None = None
    thread_id: str | None = None
    body: str | None = None
    type: str = "text"
    metadata: dict | None = Field(default=None, validation_alias="content_metadata")
    attachment_url: str | None = None
    sender_name: str | None = None
    sender_avatar: str | None = None
    reply_to_id: uuid.UUID | None = None
    reply_to: 'MessageResponse | None' = None
    reactions: dict | None = Field(default_factory=dict)
    created_at: datetime

    @classmethod
    def model_validate(cls, obj, **kwargs):
        return super().model_validate(obj, **kwargs)

