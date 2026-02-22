def test_signup_creates_user(client):
    response = client.post("/auth/signup", json={
        "email": "photographer@test.com",
        "password": "securepass123",
        "business_name": "Jane Photo Co"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "photographer@test.com"
    assert data["business_name"] == "Jane Photo Co"
    assert "id" in data
    assert "password_hash" not in data

def test_signup_duplicate_email_fails(client):
    client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass123"})
    response = client.post("/auth/signup", json={"email": "dup@test.com", "password": "pass456"})
    assert response.status_code == 400

def test_login_returns_token(client):
    client.post("/auth/signup", json={"email": "login@test.com", "password": "pass123"})
    response = client.post("/auth/login", json={"email": "login@test.com", "password": "pass123"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password_fails(client):
    client.post("/auth/signup", json={"email": "wrong@test.com", "password": "pass123"})
    response = client.post("/auth/login", json={"email": "wrong@test.com", "password": "wrongpass"})
    assert response.status_code == 401

def test_me_returns_current_user(client):
    client.post("/auth/signup", json={"email": "me@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "me@test.com", "password": "pass123"})
    token = login.json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@test.com"
