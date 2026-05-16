from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.repositories.users import UserRepository
from app.schemas.auth import CurrentUserResponse, LoginRequest, RefreshTokenRequest, TokenResponse
from app.services.auth import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    _, tokens = AuthService(UserRepository(db)).login(payload.email, payload.password)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthService(UserRepository(db)).refresh(payload.refresh_token)


@router.get("/me", response_model=CurrentUserResponse)
def me(user=Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        job_title=user.job_title,
        avatar_url=user.avatar_url,
        role=user.role.name.value,
        status=user.profile.status.value if user.profile else None,
    )
