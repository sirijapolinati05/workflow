from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import List, Optional

class UserMailInfo(BaseModel):
    id: UUID
    full_name: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)

class MailBase(BaseModel):
    subject: str
    body: str

class MailCreate(MailBase):
    recipient_id: UUID

class MailResponse(MailBase):
    id: UUID
    sender_id: UUID
    recipient_id: UUID
    is_read: bool
    is_starred: bool
    has_attachments: bool
    folder: str
    created_at: datetime
    sender: UserMailInfo
    recipient: UserMailInfo

    model_config = ConfigDict(from_attributes=True)

class MailListResponse(BaseModel):
    items: List[MailResponse]
    total: int
