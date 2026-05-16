import uuid
from sqlalchemy.orm import Session
from app.models import Notification
from app.services.crud import CRUDService
from app.services.realtime import connection_manager

class NotificationService:
    @staticmethod
    async def create_notification(
        db: Session,
        user_id: str | uuid.UUID,
        title: str,
        message: str,
        notification_type: str = "INFO",
        payload: dict = None
    ):
        service = CRUDService(db, Notification)
        # Ensure user_id is a UUID object
        uid = uuid.UUID(str(user_id)) if isinstance(user_id, (str, uuid.UUID)) else user_id
        
        data = {
            "user_id": uid,
            "title": title,
            "message": message,
            "type": notification_type,
            "payload": payload or {}
        }
        notification = service.create(data)
        
        # Broadcast real-time
        await connection_manager.send_personal(
            str(user_id),
            {
                "type": "notification",
                "notification": {
                    "id": str(notification.id),
                    "title": title,
                    "message": message,
                    "type": notification_type,
                    "created_at": notification.created_at.isoformat() if notification.created_at else None
                }
            }
        )
        return notification
