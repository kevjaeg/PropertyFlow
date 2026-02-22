from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.listing import Listing
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadResponse
from app.services.email import send_lead_notification

router = APIRouter(tags=["leads"])


@router.post("/p/{slug}/leads", response_model=LeadResponse, status_code=201)
def submit_lead(slug: str, req: LeadCreate, db: Session = Depends(get_db)):
    """Public endpoint — submit a lead for a branded listing"""
    listing = (
        db.query(Listing)
        .options(joinedload(Listing.agent))
        .filter(Listing.slug == slug, Listing.status == "active")
        .first()
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    lead = Lead(
        listing_id=listing.id,
        name=req.name,
        email=req.email,
        phone=req.phone,
        message=req.message,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Send email notification (fire-and-forget)
    if listing.agent and listing.agent.email:
        send_lead_notification(
            agent_email=listing.agent.email,
            agent_name=listing.agent.name,
            lead_name=req.name,
            lead_email=req.email,
            lead_phone=req.phone,
            message=req.message,
            listing_address=listing.address,
        )
        lead.notified = True
        db.commit()

    return LeadResponse(
        id=lead.id,
        listing_id=lead.listing_id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        message=lead.message,
        notified=lead.notified,
        created_at=lead.created_at,
        listing_address=listing.address,
    )


@router.get("/leads", response_model=list[LeadResponse])
def list_leads(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all leads across all of the photographer's listings"""
    leads = (
        db.query(Lead)
        .join(Listing)
        .filter(Listing.photographer_id == user.id)
        .order_by(Lead.created_at.desc())
        .all()
    )
    result = []
    for lead in leads:
        listing = db.query(Listing).filter(Listing.id == lead.listing_id).first()
        result.append(
            LeadResponse(
                id=lead.id,
                listing_id=lead.listing_id,
                name=lead.name,
                email=lead.email,
                phone=lead.phone,
                message=lead.message,
                notified=lead.notified,
                created_at=lead.created_at,
                listing_address=listing.address if listing else None,
            )
        )
    return result
