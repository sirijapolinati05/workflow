from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models import AttendanceLog, LeaveRequest, RoleName
from app.schemas.attendance import AttendanceCheckInRequest, AttendanceCheckOutRequest, AttendanceResponse, LeaveRequestCreateRequest
from app.services.crud import CRUDService

router = APIRouter()


@router.get("/", response_model=list[AttendanceResponse])
def list_attendance(
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    return CRUDService(db, AttendanceLog).list(1, 200).items


@router.post("/check-in", response_model=AttendanceResponse)
def check_in(payload: AttendanceCheckInRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return CRUDService(db, AttendanceLog).create(
        {"user_id": user.id, "check_in_at": datetime.now(timezone.utc), "notes": payload.notes}
    )


@router.post("/check-out", response_model=AttendanceResponse)
def check_out(payload: AttendanceCheckOutRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    active = db.scalar(
        select(AttendanceLog).where(AttendanceLog.user_id == user.id, AttendanceLog.check_out_at.is_(None)).order_by(AttendanceLog.created_at.desc())
    )
    if not active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active check-in not found")
    active.check_out_at = datetime.now(timezone.utc)
    active.notes = payload.notes or active.notes
    db.add(active)
    db.commit()
    db.refresh(active)
    return active


@router.post("/leave-requests")
def create_leave_request(payload: LeaveRequestCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return CRUDService(db, LeaveRequest).create({**payload.model_dump(), "user_id": user.id})

