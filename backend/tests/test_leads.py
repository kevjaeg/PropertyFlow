from unittest.mock import patch


def _create_listing(client):
    """Helper: create user, agent, listing and return (slug, auth_headers)"""
    client.post("/auth/signup", json={"email": "photo@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "photo@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    agent = client.post("/agents", json={
        "name": "Jane Smith",
        "email": "jane@realty.com",
        "phone": "512-555-1234",
        "brokerage_name": "Keller Williams",
    }, headers=headers)
    agent_id = agent.json()["id"]

    listing = client.post("/listings", json={
        "agent_id": agent_id,
        "address": "123 Main St, Austin TX",
        "price": 45000000,
        "beds": 3,
        "baths": 2,
        "sqft": 1800,
        "description": "Beautiful home",
    }, headers=headers)
    slug = listing.json()["slug"]
    return slug, headers


@patch("app.api.leads.send_lead_notification")
def test_submit_lead(mock_email, client):
    slug, _ = _create_listing(client)
    response = client.post(f"/p/{slug}/leads", json={
        "name": "John Buyer",
        "email": "john@email.com",
        "phone": "555-0123",
        "message": "I'd like to schedule a showing",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Buyer"
    assert data["email"] == "john@email.com"
    assert data["listing_address"] == "123 Main St, Austin TX"
    mock_email.assert_called_once()


@patch("app.api.leads.send_lead_notification")
def test_submit_lead_nonexistent_listing(mock_email, client):
    response = client.post("/p/nonexistent-slug/leads", json={
        "name": "John",
        "email": "john@email.com",
    })
    assert response.status_code == 404
    mock_email.assert_not_called()


@patch("app.api.leads.send_lead_notification")
def test_list_leads_as_photographer(mock_email, client):
    slug, headers = _create_listing(client)

    # Submit 2 leads
    client.post(f"/p/{slug}/leads", json={
        "name": "Lead One", "email": "one@test.com",
    })
    client.post(f"/p/{slug}/leads", json={
        "name": "Lead Two", "email": "two@test.com",
    })

    response = client.get("/leads", headers=headers)
    assert response.status_code == 200
    leads = response.json()
    assert len(leads) == 2
    # Newest first
    assert leads[0]["name"] == "Lead Two"
    assert leads[1]["name"] == "Lead One"


def test_list_leads_requires_auth(client):
    response = client.get("/leads")
    assert response.status_code == 403
