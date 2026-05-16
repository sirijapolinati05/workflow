from datetime import date

from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel


class EmployeeProfileResponse(ORMModel):
    employee_code: str
    department: str | None = None
    hire_date: date | None = None
    timezone: str | None = None
    location: str | None = None
    status: str
    bio: str | None = None


class UserResponse(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    job_title: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    signature: str | None = None
    is_active: bool
    role: str
    profile: EmployeeProfileResponse | None = None


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    employee_code: str
    department: str | None = None
    job_title: str | None = None
    manager_id: str | None = None
    timezone: str | None = None
    location: str | None = None
    bio: str | None = None
    signature: str | None = None


class UserUpdateRequest(BaseModel):
    full_name: str | None = None
    job_title: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    signature: str | None = None
    department: str | None = None
    timezone: str | None = None
    location: str | None = None
    bio: str | None = None
    is_active: bool | None = None

