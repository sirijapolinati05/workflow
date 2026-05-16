import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models import Message, GroupMember
from app.services.notifications import NotificationService
from app.schemas.common import PaginatedResponse
from app.schemas.messages import MessageCreateRequest, MessageResponse
from app.services.crud import CRUDService
from app.services.realtime import connection_manager

router = APIRouter()


@router.get("/messages", response_model=PaginatedResponse[MessageResponse])
def list_messages(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=100),
    recipient_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(Message).options(
        joinedload(Message.sender),
        joinedload(Message.reply_to).joinedload(Message.sender)
    )
    if group_id:
        query = query.where(Message.group_id == group_id)
    else:
        query = query.where(Message.recipient_id == (recipient_id or user.id))
    
    query = query.order_by(Message.created_at.desc())
    
    total = len(db.execute(query).unique().scalars().all())
    items = db.execute(query.offset((page - 1) * page_size).limit(page_size)).unique().scalars().all()
    return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)


@router.post("/messages", response_model=MessageResponse)
async def send_message(payload: MessageCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = {**payload.model_dump(), "sender_id": user.id}
    if "metadata" in data:
        data["content_metadata"] = data.pop("metadata")
    message = CRUDService(db, Message).create(data)
    db.refresh(message)
    # Load sender for the response
    message = db.execute(
        select(Message)
        .where(Message.id == message.id)
        .options(
            joinedload(Message.sender),
            joinedload(Message.reply_to).joinedload(Message.sender)
        )
    ).scalar_one()
    if payload.recipient_id:
        await connection_manager.send_personal(
            payload.recipient_id,
            {
                "id": str(uuid.uuid4()),
                "type": "chat_message", 
                "message": MessageResponse.model_validate(message).model_dump(mode="json")
            },
        )
        # Persistent notification for 1-on-1 chat
        await NotificationService.create_notification(
            db,
            payload.recipient_id,
            "New Message",
            f"{user.full_name}: {payload.body[:30]}...",
            "CHAT_MESSAGE",
            {"sender_id": str(user.id), "message_id": str(message.id)}
        )
    else:
        await connection_manager.broadcast(
            {
                "id": str(uuid.uuid4()),
                "type": "group_message", 
                "message": MessageResponse.model_validate(message).model_dump(mode="json")
            }
        )
        # Persistent notification for group members
        if payload.group_id:
            members = db.query(GroupMember).filter_by(group_id=payload.group_id).all()
            for member in members:
                if str(member.user_id) != str(user.id):
                    await NotificationService.create_notification(
                        db,
                        member.user_id,
                        "Group Message",
                        f"{user.full_name}: {payload.body[:30]}...",
                        "GROUP_MESSAGE",
                        {"group_id": str(payload.group_id), "message_id": str(message.id)}
                    )
    return message
    
@router.post("/messages/{message_id}/vote")
async def vote_poll(message_id: uuid.UUID, option_index: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    message = db.execute(
        select(Message)
        .where(Message.id == message_id)
        .options(joinedload(Message.sender))
    ).unique().scalar_one_or_none()
    if not message or message.type != "poll":
        return {"error": "Poll not found"}
    
    metadata = dict(message.content_metadata or {})
    voted_users = dict(metadata.get("voted_users", {}))
    user_id_str = str(user.id)
    votes = list(metadata.get("votes", []))
    
    # Ensure votes array is long enough
    while len(votes) < len(metadata.get("options", [])):
        votes.append(0)
        
    # Check if user already voted and is changing their vote
    if user_id_str in voted_users:
        old_index = voted_users[user_id_str]
        if old_index == option_index:
            return {"error": "You already voted for this option"}
            
        # Decrement old vote
        if 0 <= old_index < len(votes):
            votes[old_index] = max(0, votes[old_index] - 1)
    
    # Increment new vote
    if 0 <= option_index < len(votes):
        votes[option_index] += 1
        voted_users[user_id_str] = option_index
        
        metadata["votes"] = votes
        metadata["voted_users"] = voted_users
        message.content_metadata = metadata
        db.commit()
        db.refresh(message)
        
        # Broadcast the update
        await connection_manager.broadcast({
            "id": str(uuid.uuid4()),
            "type": "message_update",
            "message": MessageResponse.model_validate(message).model_dump(mode="json")
        })
        
    return message

@router.delete("/messages/{message_id}")
async def delete_message(message_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    message = CRUDService(db, Message).get(message_id)
    if not message:
        return {"error": "Message not found"}
    if str(message.sender_id) != str(user.id):
        return {"error": "Unauthorized"}
    
    CRUDService(db, Message).delete(message_id)
    await connection_manager.broadcast({
        "id": str(uuid.uuid4()),
        "type": "message_delete",
        "message_id": str(message_id)
    })
    return {"status": "success"}


@router.post("/messages/{message_id}/react")
async def react_to_message(message_id: uuid.UUID, emoji: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    message = db.execute(select(Message).where(Message.id == message_id)).scalar_one_or_none()
    if not message:
        return {"error": "Message not found"}
    
    reactions = dict(message.reactions or {})
    user_id_str = str(user.id)
    already_had_this_emoji = False
    
    # Remove previous reaction by same user (WhatsApp style), treating stars independently
    for e, users in list(reactions.items()):
        if user_id_str in users:
            is_star_action = (emoji == '⭐')
            is_star_existing = (e == '⭐')
            
            # Don't let a star toggle remove a reaction, and don't let a reaction toggle remove a star
            if is_star_action != is_star_existing:
                continue
                
            if e == emoji:
                already_had_this_emoji = True
                
            users.remove(user_id_str)
            if not users:
                del reactions[e]
            else:
                reactions[e] = users
    
    # Add new reaction if it's a different emoji (or if toggle was off)
    if not already_had_this_emoji:
        reactions[emoji] = reactions.get(emoji, []) + [user_id_str]
    
    from sqlalchemy.orm.attributes import flag_modified
    message.reactions = reactions
    flag_modified(message, "reactions")
    db.commit()
    db.refresh(message)
    
    # Broadcast
    await connection_manager.broadcast({
        "id": str(uuid.uuid4()),
        "type": "message_reaction",
        "message_id": str(message_id),
        "reactions": reactions
    })
    return reactions

