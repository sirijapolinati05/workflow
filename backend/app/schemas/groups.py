from uuid import UUID
from pydantic import BaseModel

from app.schemas.common import ORMModel


class GroupCreateRequest(BaseModel):
    name: str
    description: str | None = None
    owner_id: UUID
    is_private: bool = False
    member_ids: list[UUID] = []


class GroupMemberInfo(BaseModel):
    id: UUID
    full_name: str

class GroupResponse(ORMModel):
    id: UUID
    name: str
    description: str | None = None
    owner_id: UUID
    is_private: bool
    members: list[GroupMemberInfo] = []

