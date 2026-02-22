from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.video import ListingVideo

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/mux")
async def mux_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Mux webhook events"""
    body = await request.json()
    event_type = body.get("type", "")
    data = body.get("data", {})

    if event_type == "video.asset.ready":
        asset_id = data.get("id")
        playback_ids = data.get("playback_ids", [])
        playback_id = playback_ids[0]["id"] if playback_ids else None

        # Find video by mux_asset_id and update
        video = db.query(ListingVideo).filter(
            ListingVideo.mux_asset_id == asset_id
        ).first()
        if video:
            video.status = "ready"
            video.mux_playback_id = playback_id
            db.commit()

    elif event_type == "video.asset.errored":
        asset_id = data.get("id")
        video = db.query(ListingVideo).filter(
            ListingVideo.mux_asset_id == asset_id
        ).first()
        if video:
            video.status = "error"
            db.commit()

    elif event_type == "video.upload.asset_created":
        upload_id = data.get("id")
        asset_id = data.get("asset_id")
        # We need to link the upload to a video record
        # The upload_id was returned to the frontend, which needs to send it back
        # For now, we'll handle this via a separate update mechanism

    return {"status": "ok"}
