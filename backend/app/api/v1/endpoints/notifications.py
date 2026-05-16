from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import Notification
from app.schemas.common import PaginatedResponse
from app.schemas.notifications import NotificationCreateRequest, NotificationResponse
from app.services.crud import CRUDService
from app.services.realtime import connection_manager

router = APIRouter()


@router.get("", response_model=PaginatedResponse[NotificationResponse])
def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return CRUDService(db, Notification).list(page, page_size, {"user_id": user.id})


@router.post("", response_model=NotificationResponse)
async def create_notification(payload: NotificationCreateRequest, db: Session = Depends(get_db)):
    notification = CRUDService(db, Notification).create(payload.model_dump())
    await connection_manager.send_personal(payload.user_id, {"type": "notification", "notification": payload.model_dump()})
    return notification


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return CRUDService(db, Notification).update(notification_id, {"is_read": True})


@router.post("/mark-read-by-type")
def mark_read_by_type(
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    ntype = payload.get("type")
    query = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == False)
    if ntype:
        query = query.filter(Notification.type == ntype)
    
    notifications = query.all()
    for n in notifications:
        n.is_read = True
    db.commit()
    return {"message": f"Marked {len(notifications)} notifications as read"}

