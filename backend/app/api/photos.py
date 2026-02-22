from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.listing import Listing
from app.models.photo import ListingPhoto
from app.services.cloudflare import upload_image, delete_image

router = APIRouter(tags=["photos"])


class PhotoResponse(BaseModel):
    id: str
    url: str
    thumbnail_url: str
    position: int
    model_config = {"from_attributes": True}


class PhotoOrderRequest(BaseModel):
    photo_ids: list[str]


def _get_listing(listing_id: str, user: User, db: Session) -> Listing:
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.post("/listings/{listing_id}/photos", response_model=PhotoResponse, status_code=201)
async def upload_photo(
    listing_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = _get_listing(listing_id, user, db)

    # Check max 50 photos
    count = db.query(ListingPhoto).filter(ListingPhoto.listing_id == listing_id).count()
    if count >= 50:
        raise HTTPException(status_code=400, detail="Maximum 50 photos per listing")

    file_bytes = await file.read()
    result = await upload_image(file_bytes, file.filename or "photo.jpg")

    photo = ListingPhoto(
        listing_id=listing_id,
        cloudflare_image_id=result["id"],
        url=result["url"],
        thumbnail_url=result["thumbnail_url"],
        position=count,  # append to end
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.put("/listings/{listing_id}/photos/order", response_model=list[PhotoResponse])
def reorder_photos(
    listing_id: str,
    req: PhotoOrderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_listing(listing_id, user, db)
    for position, photo_id in enumerate(req.photo_ids):
        photo = db.query(ListingPhoto).filter(
            ListingPhoto.id == photo_id, ListingPhoto.listing_id == listing_id
        ).first()
        if photo:
            photo.position = position
    db.commit()
    return db.query(ListingPhoto).filter(
        ListingPhoto.listing_id == listing_id
    ).order_by(ListingPhoto.position).all()


@router.delete("/listings/{listing_id}/photos/{photo_id}", status_code=204)
async def delete_photo(
    listing_id: str,
    photo_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_listing(listing_id, user, db)
    photo = db.query(ListingPhoto).filter(
        ListingPhoto.id == photo_id, ListingPhoto.listing_id == listing_id
    ).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    await delete_image(photo.cloudflare_image_id)
    db.delete(photo)
    db.commit()
