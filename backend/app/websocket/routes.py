from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.realtime import connection_manager

websocket_router = APIRouter()


@websocket_router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str) -> None:
    await connection_manager.connect(user_id, websocket)
    await connection_manager.broadcast({"type": "presence", "user_id": user_id, "status": "ACTIVE"})
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "presence":
                await connection_manager.broadcast(
                    {"type": "presence", "user_id": user_id, "status": data.get("status", "ACTIVE")}
                )
    except WebSocketDisconnect:
        connection_manager.disconnect(user_id, websocket)
        await connection_manager.broadcast({"type": "presence", "user_id": user_id, "status": "OFFLINE"})

