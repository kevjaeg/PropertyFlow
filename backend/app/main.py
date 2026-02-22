from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.agents import router as agents_router
from app.api.listings import router as listings_router
from app.api.photos import router as photos_router
from app.api.videos import router as videos_router
from app.api.webhooks import router as webhooks_router
from app.api.public import router as public_router

app = FastAPI(title="PropertyFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(agents_router)
app.include_router(listings_router)
app.include_router(photos_router)
app.include_router(videos_router)
app.include_router(webhooks_router)
app.include_router(public_router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
