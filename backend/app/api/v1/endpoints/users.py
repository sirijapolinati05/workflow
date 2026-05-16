from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles, get_current_user
from app.database.session import get_db
from app.models import RoleName, User, Notification
from app.repositories.users import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.users import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.users import UserService

router = APIRouter()

@router.patch("/me", response_model=UserResponse)
def update_user_me(
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = UserService(UserRepository(db)).update_user(str(current_user.id), payload)
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        job_title=user.job_title,
        phone_number=user.phone_number,
        avatar_url=user.avatar_url,
        signature=user.signature,
        is_active=user.is_active,
        role=user.role.name.value,
        profile=user.profile,
    )


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD, RoleName.EMPLOYEE)),
):
    items, total = UserService(UserRepository(db)).list_users(page, page_size)
    users = [
        UserResponse(
            id=str(item.id),
            email=item.email,
            full_name=item.full_name,
            job_title=item.job_title,
            phone_number=item.phone_number,
            avatar_url=item.avatar_url,
            signature=item.signature,
            is_active=item.is_active,
            role=item.role.name.value,
            profile=item.profile,
        )
        for item in items
    ]
    return PaginatedResponse.create(users, total=total, page=page, page_size=page_size)


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)),
):
    user = UserService(UserRepository(db)).create_user(payload)
    
    # Notify everyone about the new user
    all_users = db.query(User).filter(User.id != user.id).all()
    for other_user in all_users:
        db.add(Notification(
            user_id=other_user.id,
            title="New Team Member",
            message=f"{user.full_name} has joined the workspace!",
            type="NEW_USER",
            payload={"user_id": str(user.id)}
        ))
    db.commit()
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        job_title=user.job_title,
        phone_number=user.phone_number,
        avatar_url=user.avatar_url,
        signature=user.signature,
        is_active=user.is_active,
        role=user.role.name.value,
        profile=user.profile,
    )


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    user = UserService(UserRepository(db)).update_user(user_id, payload)
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        job_title=user.job_title,
        phone_number=user.phone_number,
        avatar_url=user.avatar_url,
        signature=user.signature,
        is_active=user.is_active,
        role=user.role.name.value,
        profile=user.profile,
    )
