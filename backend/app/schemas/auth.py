from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class CurrentUserResponse(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    job_title: str | None = None
    avatar_url: str | None = None
    role: str
    status: str | None = None

