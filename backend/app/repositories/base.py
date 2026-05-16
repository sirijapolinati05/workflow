from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session


class BaseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def paginate(self, query: Select[Any], page: int, page_size: int) -> tuple[Sequence[Any], int]:
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        items = self.db.execute(query.offset((page - 1) * page_size).limit(page_size)).scalars().all()
        return items, total

