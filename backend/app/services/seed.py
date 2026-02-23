"""
Demo data seeder for PropertyFlow.

Usage:
    cd backend
    python -m app.services.seed

Creates demo photographer, agents, listings with stock photos for showcasing the product.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.core.auth import hash_password
from app.models.user import User
from app.models.agent import Agent
from app.models.listing import Listing
from app.models.photo import ListingPhoto


def unsplash(photo_id: str, width: int = 1200) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w={width}&fit=crop&q=80"


LISTING_PHOTOS = {
    "modern-house": [
        "1580587771525-78b9dba3b914",  # Exterior
        "1583608205776-bfd35f0d9f83",  # Living room
        "1556909114-f6e7ad7d3136",     # Kitchen
        "1615873968403-89e068629265",  # Bedroom
        "1552321554-5fefe8c9ef14",     # Bathroom
        "1600566753190-17f0baa2a6c3",  # Patio
    ],
    "ranch-estate": [
        "1568605114967-8130f3a36994",  # Exterior
        "1555041469-a586c61ea9bc",     # Living room
        "1565538810643-b5bdb714032a",  # Kitchen
        "1505693314120-0d443867891c",  # Bedroom
        "1600566752355-35792bedcfea",  # Bathroom
        "1571896349842-33c89424de2d",  # Pool
    ],
    "luxury-condo": [
        "1486325212027-8081e485255e",  # Building exterior
        "1600210492493-0946911123ea",  # Living room
        "1567538096621-38d2284b23ff",  # Kitchen
        "1560448204-e02f11c3d0e2",     # Bedroom
        "1584622650111-993a426fbf0a",  # Bathroom
        "1460317442991-0ec209397118",  # View/Balcony
    ],
}


def add_photos(db, listing_id: str, photo_ids: list[str]):
    for position, photo_id in enumerate(photo_ids):
        photo = ListingPhoto(
            listing_id=listing_id,
            cloudflare_image_id=f"demo-{photo_id}",
            url=unsplash(photo_id, 1200),
            thumbnail_url=unsplash(photo_id, 400),
            position=position,
        )
        db.add(photo)


def seed(reset: bool = False):
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == "demo@propertyflow.app").first()
        if existing:
            if reset:
                print("Resetting demo data...")
                db.delete(existing)  # Cascades to agents, listings, photos, leads
                db.commit()
            else:
                print("Demo data already exists. Skipping. (Use --reset to recreate)")
                return

        # --- Photographer ---
        user = User(
            email="demo@propertyflow.app",
            password_hash=hash_password("demo1234"),
            business_name="Demo Photography Co",
            subscription_tier="free",
        )
        db.add(user)
        db.flush()

        # --- Agents ---
        sarah = Agent(
            photographer_id=user.id,
            name="Sarah Johnson",
            email="sarah@demorealty.com",
            phone="512-555-0100",
            brokerage_name="Demo Realty Group",
        )
        db.add(sarah)
        db.flush()

        michael = Agent(
            photographer_id=user.id,
            name="Michael Chen",
            email="michael@skylineproperties.com",
            phone="512-555-0200",
            brokerage_name="Skyline Properties",
        )
        db.add(michael)
        db.flush()

        # --- Listing 1: Modern House ---
        listing1 = Listing(
            photographer_id=user.id,
            agent_id=sarah.id,
            slug="123-demo-street-austin-tx",
            address="123 Demo Street, Austin TX 78701",
            price=52500000,
            beds=4,
            baths=3,
            sqft=2400,
            description=(
                "Welcome to this stunning 4-bedroom home in the heart of Austin. "
                "Featuring an open floor plan with natural light throughout, modern "
                "kitchen with quartz countertops, and a spacious backyard perfect for "
                "entertaining. Minutes from downtown, parks, and top-rated schools."
            ),
            mls_number="TX-2026-0001",
            status="active",
        )
        db.add(listing1)
        db.flush()
        add_photos(db, listing1.id, LISTING_PHOTOS["modern-house"])

        # --- Listing 2: Ranch Estate ---
        listing2 = Listing(
            photographer_id=user.id,
            agent_id=michael.id,
            slug="456-oak-ridge-lane-austin-tx",
            address="456 Oak Ridge Lane, Austin TX 78746",
            price=87500000,
            beds=5,
            baths=4,
            sqft=3800,
            description=(
                "Sprawling 5-bedroom estate on a tree-lined lot in Westlake Hills. "
                "This home offers a chef's kitchen with a large island, formal dining, "
                "a resort-style pool, and a 3-car garage. Hardwood floors, vaulted "
                "ceilings, and abundant natural light throughout."
            ),
            mls_number="TX-2026-0002",
            status="active",
        )
        db.add(listing2)
        db.flush()
        add_photos(db, listing2.id, LISTING_PHOTOS["ranch-estate"])

        # --- Listing 3: Luxury Condo ---
        listing3 = Listing(
            photographer_id=user.id,
            agent_id=sarah.id,
            slug="789-skyline-drive-12-austin-tx",
            address="789 Skyline Drive #12, Austin TX 78703",
            price=125000000,
            beds=3,
            baths=3,
            sqft=2100,
            description=(
                "Luxury penthouse condo with panoramic views of downtown Austin and "
                "Lady Bird Lake. Floor-to-ceiling windows, designer finishes, a gourmet "
                "kitchen with Miele appliances, and a private terrace. Building amenities "
                "include concierge, rooftop pool, and fitness center."
            ),
            mls_number="TX-2026-0003",
            status="active",
        )
        db.add(listing3)
        db.flush()
        add_photos(db, listing3.id, LISTING_PHOTOS["luxury-condo"])

        db.commit()
        print("Demo data created successfully!")
        print(f"  Email: demo@propertyflow.app")
        print(f"  Password: demo1234")
        print(f"  Listings:")
        print(f"    - 123-demo-street-austin-tx (Modern House, $525k)")
        print(f"    - 456-oak-ridge-lane-austin-tx (Ranch Estate, $875k)")
        print(f"    - 789-skyline-drive-12-austin-tx (Luxury Condo, $1.25M)")

    except Exception as e:
        db.rollback()
        print(f"Error creating demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
