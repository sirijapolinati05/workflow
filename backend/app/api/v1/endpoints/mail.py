from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database.session import get_db
from app.api.deps import get_current_user
from app.models.entities import InternalMail, User
from app.schemas.mail import MailResponse, MailCreate, MailListResponse
from app.services.crud import CRUDService

router = APIRouter()

@router.post("/send", response_model=MailResponse)
def send_mail(
    mail_in: MailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify recipient exists
    recipient = db.query(User).filter(User.id == mail_in.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
        
    mail = InternalMail(
        sender_id=current_user.id,
        recipient_id=mail_in.recipient_id,
        subject=mail_in.subject,
        body=mail_in.body
    )
    db.add(mail)
    db.commit()
    db.refresh(mail)
    return mail

@router.get("/inbox", response_model=MailListResponse)
def get_inbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mails = db.query(InternalMail).filter(
        InternalMail.recipient_id == current_user.id
    ).order_by(InternalMail.created_at.desc()).all()
    
    return {"items": mails, "total": len(mails)}

@router.get("/sent", response_model=MailListResponse)
def get_sent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mails = db.query(InternalMail).filter(
        InternalMail.sender_id == current_user.id
    ).order_by(InternalMail.created_at.desc()).all()
    
    return {"items": mails, "total": len(mails)}

@router.patch("/{mail_id}/read", response_model=MailResponse)
def mark_as_read(
    mail_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    mail = db.query(InternalMail).filter(InternalMail.id == mail_id).first()
    if not mail:
        raise HTTPException(status_code=404, detail="Mail not found")
        
    if mail.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    mail.is_read = True
    db.commit()
    db.refresh(mail)
    return mail
