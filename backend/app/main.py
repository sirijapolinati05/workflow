from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.v1.router import api_router
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine
# from app.middleware.audit import AuditMiddleware
from app.websocket.routes import websocket_router

# Create tables on startup
Base.metadata.create_all(bind=engine)

print(f"DEBUG: Allowed CORS origins: {settings.cors_origins}")

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# app.add_middleware(AuditMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(websocket_router)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health", tags=["health"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
