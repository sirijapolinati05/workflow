from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.database.session import get_db
from app.models import Report, RoleName
from app.schemas.reports import ReportCreateRequest, ReportResponse
from app.services.crud import CRUDService
from app.services.reports import ReportService

router = APIRouter()


@router.get("/", response_model=list[ReportResponse])
def list_reports(db: Session = Depends(get_db), _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD))):
    response = CRUDService(db, Report).list(1, 100)
    return response.items


@router.post("/", response_model=ReportResponse)
def create_report(payload: ReportCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return ReportService(db).generate(str(user.id), payload.name, payload.report_type, payload.filters)

