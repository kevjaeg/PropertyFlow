def _auth_headers(client):
    """Helper: create user and return auth headers"""
    client.post("/auth/signup", json={"email": "photo@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "photo@test.com", "password": "pass123"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}

def test_create_agent(client):
    headers = _auth_headers(client)
    response = client.post("/agents", json={
        "name": "Jane Smith",
        "email": "jane@realty.com",
        "phone": "512-555-1234",
        "brokerage_name": "Keller Williams"
    }, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Jane Smith"
    assert data["email"] == "jane@realty.com"
    assert data["brokerage_name"] == "Keller Williams"
    assert "id" in data

def test_list_agents(client):
    headers = _auth_headers(client)
    client.post("/agents", json={"name": "Agent 1"}, headers=headers)
    client.post("/agents", json={"name": "Agent 2"}, headers=headers)
    response = client.get("/agents", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2

def test_get_agent(client):
    headers = _auth_headers(client)
    created = client.post("/agents", json={"name": "Jane"}, headers=headers)
    agent_id = created.json()["id"]
    response = client.get(f"/agents/{agent_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Jane"

def test_update_agent(client):
    headers = _auth_headers(client)
    created = client.post("/agents", json={"name": "Old Name"}, headers=headers)
    agent_id = created.json()["id"]
    response = client.put(f"/agents/{agent_id}", json={"name": "New Name"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"

def test_delete_agent(client):
    headers = _auth_headers(client)
    created = client.post("/agents", json={"name": "To Delete"}, headers=headers)
    agent_id = created.json()["id"]
    response = client.delete(f"/agents/{agent_id}", headers=headers)
    assert response.status_code == 204

def test_agent_not_found_returns_404(client):
    headers = _auth_headers(client)
    response = client.get("/agents/nonexistent-id", headers=headers)
    assert response.status_code == 404

def test_agent_not_visible_to_other_user(client):
    # Create agent as user 1
    headers1 = _auth_headers(client)
    created = client.post("/agents", json={"name": "Secret Agent"}, headers=headers1)
    agent_id = created.json()["id"]

    # Create user 2
    client.post("/auth/signup", json={"email": "other@test.com", "password": "pass123"})
    login2 = client.post("/auth/login", json={"email": "other@test.com", "password": "pass123"})
    headers2 = {"Authorization": f"Bearer {login2.json()['access_token']}"}

    # User 2 should not see user 1's agents
    response = client.get("/agents", headers=headers2)
    assert len(response.json()) == 0

    # User 2 should get 404 for user 1's agent
    response = client.get(f"/agents/{agent_id}", headers=headers2)
    assert response.status_code == 404
