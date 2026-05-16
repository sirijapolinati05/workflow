from datetime import datetime, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.models import EmployeeProfile, RoleName, User
from app.repositories.users import UserRepository
from app.schemas.auth import TokenResponse

QUICK_ACCESS_PASSWORD = "1234"

QUICK_ACCESS_USERS = {
    "krishna@workflowpro.com": {
        "full_name": "Krishna",
        "role": RoleName.ADMIN,
        "job_title": "Operations Admin",
        "employee_code": "WF-0001",
        "department": "Operations",
        "location": "HQ",
        "bio": "Platform administrator",
    },
    "aarav@workflowpro.com": {
        "full_name": "Aarav",
        "role": RoleName.EMPLOYEE,
        "job_title": "Product Analyst",
        "employee_code": "WF-0002",
        "department": "Product",
        "location": "Hyderabad",
        "bio": "Employee workspace user",
    },
    "diyaa@workflowpro.com": {
        "full_name": "Diyaa",
        "role": RoleName.EMPLOYEE,
        "job_title": "UI Designer",
        "employee_code": "WF-0003",
        "department": "Design",
        "location": "Bengaluru",
        "bio": "Employee workspace user",
    },
    "isha@workflowpro.com": {
        "full_name": "Isha",
        "role": RoleName.EMPLOYEE,
        "job_title": "QA Engineer",
        "employee_code": "WF-0004",
        "department": "Quality",
        "location": "Chennai",
        "bio": "Employee workspace user",
    },
    "rithvik@workflowpro.com": {
        "full_name": "Rithvik",
        "role": RoleName.EMPLOYEE,
        "job_title": "Backend Developer",
        "employee_code": "WF-0005",
        "department": "Engineering",
        "location": "Pune",
        "bio": "Employee workspace user",
    },
    "saanvi@workflowpro.com": {
        "full_name": "Saanvi",
        "role": RoleName.EMPLOYEE,
        "job_title": "HR Coordinator",
        "employee_code": "WF-0006",
        "department": "Human Resources",
        "location": "Mumbai",
        "bio": "Employee workspace user",
    },
}


class AuthService:
    def __init__(self, user_repository: UserRepository) -> None:
        self.user_repository = user_repository

    def login(self, email: str, password: str) -> tuple[object, TokenResponse]:
        user = self._sync_quick_access_user(email, password)
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            self.user_repository.update(user)
            tokens = TokenResponse(
                access_token=create_access_token(str(user.id)),
                refresh_token=create_refresh_token(str(user.id)),
            )
            return user, tokens

        user = self.user_repository.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        user.last_login_at = datetime.now(timezone.utc)
        self.user_repository.update(user)
        tokens = TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
        )
        return user, tokens

    def _sync_quick_access_user(self, email: str, password: str) -> User | None:
        quick_access = QUICK_ACCESS_USERS.get(email)
        if quick_access is None or password != QUICK_ACCESS_PASSWORD:
            return None

        role = self.user_repository.get_role(quick_access["role"].value)
        if role is None:
            return None

        user = self.user_repository.get_by_email(email)
        if user is None:
            # Reuse an existing seeded/imported employee record before creating a new one.
            user = self.user_repository.get_by_employee_code(quick_access["employee_code"])

        if user is None:
            new_user = User(
                role_id=role.id,
                email=email,
                password_hash=get_password_hash(QUICK_ACCESS_PASSWORD),
                full_name=quick_access["full_name"],
                job_title=quick_access["job_title"],
            )
            profile = EmployeeProfile(
                user_id=new_user.id,
                employee_code=quick_access["employee_code"],
                department=quick_access["department"],
                timezone="Asia/Kolkata",
                location=quick_access["location"],
                bio=quick_access["bio"],
            )
            return self.user_repository.create(new_user, profile)

        user.role_id = role.id
        user.email = email
        user.full_name = quick_access["full_name"]
        user.job_title = quick_access["job_title"]
        user.password_hash = get_password_hash(QUICK_ACCESS_PASSWORD)

        if user.profile is not None:
            user.profile.department = quick_access["department"]
            user.profile.timezone = "Asia/Kolkata"
            user.profile.location = quick_access["location"]
            user.profile.bio = quick_access["bio"]

        return self.user_repository.update(user)

    def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = jwt.decode(refresh_token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        subject = payload.get("sub")
        user = self.user_repository.get_by_id(subject)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return TokenResponse(access_token=create_access_token(subject), refresh_token=create_refresh_token(subject))
