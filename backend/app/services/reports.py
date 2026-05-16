from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AttendanceLog, Report, Submission, Task, TaskStatus


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def generate(self, created_by_id: str, name: str, report_type: str, filters: dict) -> Report:
        data = {
            "tasks_by_status": {
                row[0].value if hasattr(row[0], "value") else str(row[0]): row[1]
                for row in self.db.execute(select(Task.status, func.count()).group_by(Task.status)).all()
            },
            "completed_tasks": self.db.scalar(select(func.count()).select_from(Task).where(Task.status == TaskStatus.COMPLETED)) or 0,
            "submissions_total": self.db.scalar(select(func.count()).select_from(Submission)) or 0,
            "attendance_total": self.db.scalar(select(func.count()).select_from(AttendanceLog)) or 0,
            "filters": filters,
        }
        report = Report(created_by_id=created_by_id, name=name, report_type=report_type, filters=filters, data=data)
        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)
        return report

