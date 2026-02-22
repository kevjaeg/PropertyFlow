"""
Demo data seeder for PropertyFlow.

Usage:
    cd backend
    python -m app.services.seed

Creates a demo photographer, agent, and listing for showcasing the product.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, Base, engine
from app.core.auth import hash_password
from app.models.user import User
from app.models.agent import Agent
from app.models.listing import Listing


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if demo user already exists
        existing = db.query(User).filter(User.email == "demo@propertyflow.app").first()
        if existing:
            print("Demo data already exists. Skipping.")
            return

        # Create demo photographer
        user = User(
            email="demo@propertyflow.app",
            password_hash=hash_password("demo1234"),
            business_name="Demo Photography Co",
            subscription_tier="free",
        )
        db.add(user)
        db.flush()

        # Create demo agent
        agent = Agent(
            photographer_id=user.id,
            name="Sarah Johnson",
            email="sarah@demorealty.com",
            phone="512-555-0100",
            brokerage_name="Demo Realty Group",
        )
        db.add(agent)
        db.flush()

        # Create demo listing
        listing = Listing(
            photographer_id=user.id,
            agent_id=agent.id,
            slug="123-demo-street-austin-tx",
            address="123 Demo Street, Austin TX 78701",
            price=52500000,  # $525,000
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
        db.add(listing)

        db.commit()
        print("Demo data created successfully!")
        print(f"  Email: demo@propertyflow.app")
        print(f"  Password: demo1234")
        print(f"  Listing slug: 123-demo-street-austin-tx")

    except Exception as e:
        db.rollback()
        print(f"Error creating demo data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
