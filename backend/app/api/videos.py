from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.listing import Listing
from app.models.video import ListingVideo
from app.services.mux_service import create_direct_upload

router = APIRouter(tags=["videos"])


class VideoUploadResponse(BaseModel):
    video_id: str
    upload_url: str


class VideoResponse(BaseModel):
    id: str
    mux_asset_id: str | None
    mux_playback_id: str | None
    title: str | None
    status: str
    model_config = {"from_attributes": True}


class VideoCreateRequest(BaseModel):
    title: str | None = None


@router.post("/listings/{listing_id}/videos", response_model=VideoUploadResponse, status_code=201)
def create_video_upload(
    listing_id: str,
    req: VideoCreateRequest = VideoCreateRequest(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Max 2 videos per listing
    count = db.query(ListingVideo).filter(ListingVideo.listing_id == listing_id).count()
    if count >= 2:
        raise HTTPException(status_code=400, detail="Maximum 2 videos per listing")

    upload = create_direct_upload()

    video = ListingVideo(
        listing_id=listing_id,
        title=req.title,
        status="waiting",  # waiting for upload
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    return VideoUploadResponse(video_id=video.id, upload_url=upload["upload_url"])


@router.get("/listings/{listing_id}/videos/{video_id}", response_model=VideoResponse)
def get_video_status(
    listing_id: str,
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video = db.query(ListingVideo).filter(
        ListingVideo.id == video_id, ListingVideo.listing_id == listing_id
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.delete("/listings/{listing_id}/videos/{video_id}", status_code=204)
def delete_video(
    listing_id: str,
    video_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    video = db.query(ListingVideo).filter(
        ListingVideo.id == video_id, ListingVideo.listing_id == listing_id
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    db.delete(video)
    db.commit()
