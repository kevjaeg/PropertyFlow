import re
from sqlalchemy.orm import Session
from app.models.listing import Listing


def generate_slug(address: str) -> str:
    slug = address.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug)
    slug = slug.strip("-")
    return slug


def get_unique_slug(address: str, db: Session) -> str:
    base = generate_slug(address)
    slug = base
    counter = 2
    while db.query(Listing).filter(Listing.slug == slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug
