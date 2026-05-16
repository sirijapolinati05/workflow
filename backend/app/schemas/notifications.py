from datetime import datetime
import uuid
from pydantic import BaseModel
from app.schemas.common import ORMModel

class NotificationCreateRequest(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    type: str
    payload: dict = {}

class NotificationResponse(ORMModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: str
    type: str
    is_read: bool
    payload: dict
    created_at: datetime

