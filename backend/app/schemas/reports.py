from pydantic import BaseModel

from app.schemas.common import ORMModel


class ReportCreateRequest(BaseModel):
    name: str
    report_type: str
    filters: dict = {}


class ReportResponse(ORMModel):
    id: str
    created_by_id: str
    name: str
    report_type: str
    filters: dict
    data: dict

