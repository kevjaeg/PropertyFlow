from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.agent import Agent
from app.models.listing import Listing
from app.schemas.listing import (
    ListingCreate,
    ListingUpdate,
    ListingStatusUpdate,
    ListingResponse,
    ListingDetailResponse,
)
from app.services.slug import get_unique_slug

router = APIRouter(prefix="/listings", tags=["listings"])

FREE_TIER_LIMIT = 5


def _listing_to_response(listing: Listing) -> dict:
    """Convert a Listing ORM object to a response dict with computed URLs."""
    # Get first photo by position for the card thumbnail
    first_photo = None
    if listing.photos:
        sorted_photos = sorted(listing.photos, key=lambda p: p.position)
        first_photo = sorted_photos[0].thumbnail_url if sorted_photos else None

    return {
        "id": listing.id,
        "agent_id": listing.agent_id,
        "slug": listing.slug,
        "address": listing.address,
        "price": listing.price,
        "beds": listing.beds,
        "baths": listing.baths,
        "sqft": listing.sqft,
        "description": listing.description,
        "mls_number": listing.mls_number,
        "status": listing.status,
        "branded_url": f"/p/{listing.slug}",
        "unbranded_url": f"/p/{listing.slug}/mls",
        "agent_name": listing.agent.name if listing.agent else None,
        "first_photo_url": first_photo,
    }


def _listing_to_detail_response(listing: Listing) -> dict:
    """Convert a Listing ORM object to a detail response dict including photos, videos, and agent name."""
    data = _listing_to_response(listing)
    data["photos"] = [
        {
            "id": p.id,
            "url": p.url,
            "thumbnail_url": p.thumbnail_url,
            "position": p.position,
        }
        for p in sorted(listing.photos, key=lambda p: p.position)
    ]
    data["videos"] = [
        {
            "id": v.id,
            "mux_asset_id": v.mux_asset_id,
            "mux_playback_id": v.mux_playback_id,
            "title": v.title,
            "status": v.status,
        }
        for v in listing.videos
    ]
    data["agent_name"] = listing.agent.name if listing.agent else None
    return data


def _check_free_tier_limit(user: User, db: Session) -> None:
    """Raise 403 if user is on free tier and has reached the active listing limit."""
    if user.subscription_tier == "free":
        active_count = (
            db.query(Listing)
            .filter(Listing.photographer_id == user.id, Listing.status == "active")
            .count()
        )
        if active_count >= FREE_TIER_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Free tier limited to {FREE_TIER_LIMIT} active listings. Upgrade to add more.",
            )


@router.get("", response_model=list[ListingResponse])
def list_listings(
    status: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Listing).filter(Listing.photographer_id == user.id)
    if status:
        query = query.filter(Listing.status == status)
    listings = query.all()
    return [_listing_to_response(l) for l in listings]


@router.post("", response_model=ListingResponse, status_code=201)
def create_listing(
    req: ListingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate agent belongs to user
    agent = db.query(Agent).filter(
        Agent.id == req.agent_id, Agent.photographer_id == user.id
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Enforce free tier limit
    _check_free_tier_limit(user, db)

    # Generate unique slug
    slug = get_unique_slug(req.address, db)

    listing = Listing(
        photographer_id=user.id,
        agent_id=req.agent_id,
        slug=slug,
        address=req.address,
        price=req.price,
        beds=req.beds,
        baths=req.baths,
        sqft=req.sqft,
        description=req.description,
        mls_number=req.mls_number,
        status="active",
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return _listing_to_response(listing)


@router.get("/{listing_id}", response_model=ListingDetailResponse)
def get_listing(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _listing_to_detail_response(listing)


@router.put("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: str,
    req: ListingUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_data = req.model_dump(exclude_unset=True)

    # Re-generate slug if address changed
    if "address" in update_data:
        listing.slug = get_unique_slug(update_data["address"], db)

    for key, value in update_data.items():
        setattr(listing, key, value)

    db.commit()
    db.refresh(listing)
    return _listing_to_response(listing)


@router.delete("/{listing_id}", status_code=204)
def delete_listing(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    db.delete(listing)
    db.commit()


@router.patch("/{listing_id}/status", response_model=ListingResponse)
def update_listing_status(
    listing_id: str,
    req: ListingStatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.query(Listing).filter(
        Listing.id == listing_id, Listing.photographer_id == user.id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if req.status not in ("active", "archived"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'archived'")

    # Enforce free tier limit on activate
    if req.status == "active" and listing.status != "active":
        _check_free_tier_limit(user, db)

    listing.status = req.status
    db.commit()
    db.refresh(listing)
    return _listing_to_response(listing)
