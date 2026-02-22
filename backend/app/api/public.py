from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.listing import Listing
from app.schemas.public import PublicListingResponse, PublicListingMLSResponse

router = APIRouter(prefix="/p", tags=["public"])


def _get_active_listing(slug: str, db: Session) -> Listing:
    """Get active listing by slug with all relationships loaded"""
    listing = db.query(Listing).options(
        joinedload(Listing.agent),
        joinedload(Listing.photos),
        joinedload(Listing.videos),
    ).filter(Listing.slug == slug, Listing.status == "active").first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


@router.get("/{slug}", response_model=PublicListingResponse)
def get_branded_listing(slug: str, db: Session = Depends(get_db)):
    """Public branded listing page data — includes agent info"""
    listing = _get_active_listing(slug, db)
    return PublicListingResponse(
        slug=listing.slug,
        address=listing.address,
        price=listing.price,
        beds=listing.beds,
        baths=listing.baths,
        sqft=listing.sqft,
        description=listing.description,
        mls_number=listing.mls_number,
        photos=sorted(listing.photos, key=lambda p: p.position),
        videos=[v for v in listing.videos if v.status == "ready"],
        agent=listing.agent,
    )


@router.get("/{slug}/mls", response_model=PublicListingMLSResponse)
def get_unbranded_listing(slug: str, db: Session = Depends(get_db)):
    """Public unbranded/MLS listing page data — NO agent info"""
    listing = _get_active_listing(slug, db)
    return PublicListingMLSResponse(
        slug=listing.slug,
        address=listing.address,
        price=listing.price,
        beds=listing.beds,
        baths=listing.baths,
        sqft=listing.sqft,
        description=listing.description,
        mls_number=listing.mls_number,
        photos=sorted(listing.photos, key=lambda p: p.position),
        videos=[v for v in listing.videos if v.status == "ready"],
    )
