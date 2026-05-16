import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_roles, get_current_user
from app.database.session import get_db
from app.models import Group, GroupMember, RoleName, User, Notification
from app.schemas.common import PaginatedResponse
from app.schemas.groups import GroupCreateRequest, GroupResponse
from app.services.crud import CRUDService

router = APIRouter()

@router.get("", response_model=PaginatedResponse[GroupResponse])
def list_groups(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD, RoleName.EMPLOYEE)),
):
    # Eager load members and their users to avoid N+1 and ensure data is present
    query = select(Group).options(selectinload(Group.members).selectinload(GroupMember.user))
    
    # Calculate total for pagination
    total = db.scalar(select(func.count()).select_from(Group))
    
    # Fetch paginated items
    items = db.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    
    # Map to schema
    results = []
    for group in items:
        # Pydantic will handle the mapping if we provide the right structure
        # but we need to ensure the members relationship is converted to GroupMemberInfo
        member_list = [
            {"id": gm.user.id, "full_name": gm.user.full_name}
            for gm in group.members if gm.user
        ]
        
        results.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "owner_id": group.owner_id,
            "is_private": group.is_private,
            "members": member_list
        })
        
    return PaginatedResponse.create(items=results, total=total or 0, page=page, page_size=page_size)


@router.post("", response_model=GroupResponse)
def create_group(
    payload: GroupCreateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    group = CRUDService(db, Group).create(payload.model_dump(exclude={"member_ids"}))
    for member_id in payload.member_ids:
        db.add(GroupMember(group_id=group.id, user_id=member_id, joined_at=datetime.now(timezone.utc)))
        db.add(Notification(
            user_id=member_id,
            title="Added to Group",
            message=f"You have been added to the group '{group.name}'",
            type="GROUP_INVITE",
            payload={"group_id": str(group.id)}
        ))
    db.commit()
    db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD, RoleName.EMPLOYEE)),
):
    group = CRUDService(db, Group).get(group_id)
    if not group:
        return {"error": "Group not found"}
    
    # Get members with user info
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = []
    for m in members:
        user = m.user
        member_list.append({
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "job_title": user.job_title,
            "avatar_url": user.avatar_url,
            "joined_at": m.joined_at
        })
    
    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "owner_id": group.owner_id,
        "is_private": group.is_private,
        "members": member_list
    }


@router.delete("/{group_id}")
def delete_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    # First delete members to avoid foreign key issues (though cascade should handle it)
    db.query(GroupMember).filter(GroupMember.group_id == group_id).delete()
    success = CRUDService(db, Group).delete(group_id)
    db.commit()
    return {"success": success}

@router.post("/{group_id}/members")
def add_members(
    group_id: uuid.UUID,
    payload: dict,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    member_ids = payload.get("member_ids", [])
    group = db.query(Group).filter_by(id=group_id).first()
    for member_id in member_ids:
        exists = db.query(GroupMember).filter_by(group_id=group_id, user_id=member_id).first()
        if not exists:
            db.add(GroupMember(group_id=group_id, user_id=member_id, joined_at=datetime.now(timezone.utc)))
            if group:
                db.add(Notification(
                    user_id=member_id,
                    title="Added to Group",
                    message=f"You have been added to the group '{group.name}'",
                    type="GROUP_INVITE",
                    payload={"group_id": str(group_id)}
                ))
    db.commit()
    return {"success": True}

@router.post("/{group_id}/exit")
def exit_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Delete membership
    db.query(GroupMember).filter_by(group_id=group_id, user_id=current_user.id).delete()
    # Create system message indicating exit
    from app.models import Message
    system_msg = Message(
        group_id=group_id,
        sender_id=current_user.id,
        type='system',
        body=f"{current_user.full_name} left the group.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(system_msg)
    db.commit()
    return {"success": True}

