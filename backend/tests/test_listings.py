def _setup_user_and_agent(client):
    """Helper: create user, login, create agent, return (headers, agent_id)"""
    client.post("/auth/signup", json={"email": "photo@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "photo@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    agent = client.post("/agents", json={"name": "Jane Smith"}, headers=headers)
    return headers, agent.json()["id"]


def test_create_listing(client):
    headers, agent_id = _setup_user_and_agent(client)
    response = client.post("/listings", json={
        "agent_id": agent_id,
        "address": "123 Main Street, Austin TX",
        "price": 45000000,
        "beds": 3, "baths": 2, "sqft": 1800,
        "description": "Beautiful home",
        "mls_number": "MLS123"
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "123-main-street-austin-tx"
    assert data["address"] == "123 Main Street, Austin TX"
    assert "branded_url" in data
    assert "unbranded_url" in data


def test_list_listings(client):
    headers, agent_id = _setup_user_and_agent(client)
    client.post("/listings", json={"agent_id": agent_id, "address": "1 A St", "price": 100, "beds": 1, "baths": 1, "sqft": 500}, headers=headers)
    client.post("/listings", json={"agent_id": agent_id, "address": "2 B St", "price": 200, "beds": 2, "baths": 1, "sqft": 600}, headers=headers)
    response = client.get("/listings", headers=headers)
    assert len(response.json()) == 2


def test_archive_and_activate_listing(client):
    headers, agent_id = _setup_user_and_agent(client)
    created = client.post("/listings", json={"agent_id": agent_id, "address": "1 Test", "price": 100, "beds": 1, "baths": 1, "sqft": 500}, headers=headers)
    lid = created.json()["id"]
    # Archive
    response = client.patch(f"/listings/{lid}/status", json={"status": "archived"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "archived"
    # Re-activate
    response = client.patch(f"/listings/{lid}/status", json={"status": "active"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "active"


def test_free_tier_limit(client):
    headers, agent_id = _setup_user_and_agent(client)
    # Create 5 active listings
    for i in range(5):
        r = client.post("/listings", json={"agent_id": agent_id, "address": f"{i} Limit St", "price": 100, "beds": 1, "baths": 1, "sqft": 500}, headers=headers)
        assert r.status_code == 201
    # 6th should be rejected
    r = client.post("/listings", json={"agent_id": agent_id, "address": "6 Limit St", "price": 100, "beds": 1, "baths": 1, "sqft": 500}, headers=headers)
    assert r.status_code == 403


def test_delete_listing(client):
    headers, agent_id = _setup_user_and_agent(client)
    created = client.post("/listings", json={"agent_id": agent_id, "address": "Del St", "price": 100, "beds": 1, "baths": 1, "sqft": 500}, headers=headers)
    lid = created.json()["id"]
    response = client.delete(f"/listings/{lid}", headers=headers)
    assert response.status_code == 204
