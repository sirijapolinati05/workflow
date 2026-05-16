from fastapi import APIRouter

from app.api.v1.endpoints import analytics, attendance, auth, chat, groups, notifications, reports, submissions, tasks, uploads, users, mail

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(mail.router, prefix="/mail", tags=["mail"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

