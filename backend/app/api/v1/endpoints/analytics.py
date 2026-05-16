from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.database.session import get_db
from app.models import RoleName
from app.services.dashboard import DashboardService

router = APIRouter()


@router.get("/dashboard")
def dashboard_analytics(
    db: Session = Depends(get_db),
    _=Depends(require_roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.TEAM_LEAD)),
):
    return DashboardService(db).metrics()

