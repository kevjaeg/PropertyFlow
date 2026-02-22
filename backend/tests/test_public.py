def _create_listing_with_data(client, db):
    """Helper: create a user, agent, listing with photo — returns slug"""
    from app.models.user import User
    from app.models.agent import Agent
    from app.models.listing import Listing
    from app.models.photo import ListingPhoto
    from app.core.auth import hash_password
    import uuid

    user = User(id=str(uuid.uuid4()), email="test@test.com", password_hash=hash_password("pass"))
    db.add(user)
    db.flush()

    agent = Agent(id=str(uuid.uuid4()), photographer_id=user.id, name="Jane Agent",
                  email="jane@realty.com", phone="555-1234", brokerage_name="Keller Williams")
    db.add(agent)
    db.flush()

    listing = Listing(id=str(uuid.uuid4()), photographer_id=user.id, agent_id=agent.id,
                      slug="123-main-st", address="123 Main St", price=45000000,
                      beds=3, baths=2, sqft=1800, description="Nice house",
                      mls_number="MLS123", status="active")
    db.add(listing)
    db.flush()

    photo = ListingPhoto(id=str(uuid.uuid4()), listing_id=listing.id,
                         cloudflare_image_id="cf123", url="https://img.example.com/photo.jpg",
                         thumbnail_url="https://img.example.com/thumb.jpg", position=0)
    db.add(photo)
    db.commit()

    return "123-main-st"


def test_branded_listing_includes_agent(client, db):
    slug = _create_listing_with_data(client, db)
    response = client.get(f"/p/{slug}")
    assert response.status_code == 200
    data = response.json()
    assert data["address"] == "123 Main St"
    assert "agent" in data
    assert data["agent"]["name"] == "Jane Agent"
    assert data["agent"]["email"] == "jane@realty.com"
    assert len(data["photos"]) == 1


def test_unbranded_listing_excludes_agent(client, db):
    slug = _create_listing_with_data(client, db)
    response = client.get(f"/p/{slug}/mls")
    assert response.status_code == 200
    data = response.json()
    assert data["address"] == "123 Main St"
    assert "agent" not in data
    assert len(data["photos"]) == 1


def test_nonexistent_slug_returns_404(client):
    response = client.get("/p/nonexistent-listing")
    assert response.status_code == 404


def test_archived_listing_returns_404(client, db):
    slug = _create_listing_with_data(client, db)
    # Archive the listing
    from app.models.listing import Listing
    listing = db.query(Listing).filter(Listing.slug == slug).first()
    listing.status = "archived"
    db.commit()

    response = client.get(f"/p/{slug}")
    assert response.status_code == 404
