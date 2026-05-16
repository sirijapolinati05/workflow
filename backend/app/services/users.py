from fastapi import HTTPException, status

from app.core.security import get_password_hash
from app.models import EmployeeProfile, User
from app.repositories.users import UserRepository
from app.schemas.users import UserCreateRequest, UserUpdateRequest


class UserService:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository = user_repository

    def list_users(self, page: int, page_size: int):
        return self.user_repository.list(page, page_size)

    def create_user(self, payload: UserCreateRequest) -> User:
        role = self.user_repository.get_role(payload.role)
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

        existing = self.user_repository.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        user = User(
            role_id=role.id,
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            full_name=payload.full_name,
            job_title=payload.job_title,
        )
        profile = EmployeeProfile(
            user_id=user.id,
            employee_code=payload.employee_code,
            department=payload.department,
            manager_id=payload.manager_id,
            timezone=payload.timezone,
            location=payload.location,
            bio=payload.bio,
        )
        return self.user_repository.create(user, profile)

    def update_user(self, user_id: str, payload: UserUpdateRequest) -> User:
        user = self.user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        for field in ["full_name", "job_title", "phone_number", "avatar_url", "is_active"]:
            value = getattr(payload, field)
            if value is not None:
                setattr(user, field, value)

        if user.profile:
            for field in ["department", "timezone", "location", "bio"]:
                value = getattr(payload, field)
                if value is not None:
                    setattr(user.profile, field, value)

        return self.user_repository.update(user)

