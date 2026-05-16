from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.common import PaginatedResponse


class CRUDService:
    def __init__(self, db: Session, model: Any) -> None:
        self.db = db
        self.model = model

    def list(self, page: int, page_size: int, filters: dict[str, Any] | None = None):
        query = select(self.model)
        if filters:
            for key, value in filters.items():
                if value is not None and hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)

        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())

        total = len(self.db.execute(query).scalars().all())
        items = self.db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
        return PaginatedResponse.create(items=items, total=total, page=page, page_size=page_size)

    def get(self, entity_id: str):
        entity = self.db.get(self.model, entity_id)
        if not entity:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{self.model.__name__} not found")
        return entity

    def create(self, payload: dict[str, Any]):
        entity = self.model(**payload)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, entity_id: str, payload: dict[str, Any]):
        entity = self.get(entity_id)
        for key, value in payload.items():
            if value is not None and hasattr(entity, key):
                setattr(entity, key, value)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity_id: str):
        entity = self.get(entity_id)
        self.db.delete(entity)
        self.db.commit()
        return True

