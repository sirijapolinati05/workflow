from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import EmployeeProfile, Role, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email).options(joinedload(User.role), joinedload(User.profile)))

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.scalar(select(User).where(User.id == user_id).options(joinedload(User.role), joinedload(User.profile)))

    def get_by_employee_code(self, employee_code: str) -> User | None:
        return self.db.scalar(
            select(User)
            .join(EmployeeProfile, EmployeeProfile.user_id == User.id)
            .where(EmployeeProfile.employee_code == employee_code)
            .options(joinedload(User.role), joinedload(User.profile))
        )

    def list(self, page: int, page_size: int) -> tuple[list[User], int]:
        query = select(User).options(joinedload(User.role), joinedload(User.profile)).order_by(User.created_at.desc())
        items, total = self.paginate(query, page, page_size)
        return list(items), total

    def create(self, user: User, profile: EmployeeProfile) -> User:
        self.db.add(user)
        self.db.flush()
        profile.user_id = user.id
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(user)
        return self.get_by_id(str(user.id)) or user

    def update(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return self.get_by_id(str(user.id)) or user

    def get_role(self, role_name: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.name == role_name))
