from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel


class AttendanceCheckInRequest(BaseModel):
    notes: str | None = None


class AttendanceCheckOutRequest(BaseModel):
    notes: str | None = None


class AttendanceResponse(ORMModel):
    id: str
    user_id: str
    check_in_at: datetime
    check_out_at: datetime | None = None
    status: str
    notes: str | None = None


class LeaveRequestCreateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str

