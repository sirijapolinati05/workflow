from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import AttendanceLog, Notification, Submission, Task, TaskStatus, User


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def metrics(self) -> dict:
        last_week = datetime.now(timezone.utc) - timedelta(days=7)
        total_employees = self.db.scalar(select(func.count()).select_from(User)) or 0
        open_tasks = self.db.scalar(select(func.count()).select_from(Task).where(Task.status != TaskStatus.COMPLETED)) or 0
        submissions = self.db.scalar(select(func.count()).select_from(Submission).where(Submission.created_at >= last_week)) or 0
        attendance_today = self.db.scalar(
            select(func.count()).select_from(AttendanceLog).where(func.date(AttendanceLog.check_in_at) == datetime.now().date())
        ) or 0
        unread_notifications = self.db.scalar(
            select(func.count()).select_from(Notification).where(Notification.is_read.is_(False))
        ) or 0

        return {
            "metrics": [
                {"label": "Employees", "value": total_employees, "delta": 12},
                {"label": "Open Tasks", "value": open_tasks, "delta": -5},
                {"label": "Weekly Submissions", "value": submissions, "delta": 18},
                {"label": "Checked In Today", "value": attendance_today, "delta": 6},
            ],
            "unread_notifications": unread_notifications,
        }

