import uuid
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: str | uuid.UUID, websocket: WebSocket) -> None:
        user_id = str(user_id)
        await websocket.accept()
        self.connections[user_id].append(websocket)

    def disconnect(self, user_id: str | uuid.UUID, websocket: WebSocket) -> None:
        user_id = str(user_id)
        if user_id in self.connections and websocket in self.connections[user_id]:
            self.connections[user_id].remove(websocket)
        if user_id in self.connections and not self.connections[user_id]:
            self.connections.pop(user_id, None)

    async def send_personal(self, user_id: str | uuid.UUID, payload: dict) -> None:
        user_id = str(user_id)
        dead_sockets = []
        for socket in self.connections.get(user_id, []):
            try:
                await socket.send_json(payload)
            except Exception:
                dead_sockets.append(socket)
        for ds in dead_sockets:
            self.disconnect(user_id, ds)

    async def broadcast(self, payload: dict) -> None:
        for user_id, sockets in list(self.connections.items()):
            dead_sockets = []
            for socket in sockets:
                try:
                    await socket.send_json(payload)
                except Exception:
                    dead_sockets.append(socket)
            for ds in dead_sockets:
                self.disconnect(user_id, ds)

connection_manager = ConnectionManager()

