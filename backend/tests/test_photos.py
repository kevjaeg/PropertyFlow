from unittest.mock import patch, AsyncMock


def _setup_user_and_listing(client):
    """Helper: create user, login, create agent, create listing, return (headers, listing_id)"""
    client.post("/auth/signup", json={"email": "photo@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "photo@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    agent = client.post("/agents", json={"name": "Jane Smith"}, headers=headers)
    agent_id = agent.json()["id"]
    listing = client.post("/listings", json={
        "agent_id": agent_id,
        "address": "123 Photo St",
        "price": 50000000,
        "beds": 3, "baths": 2, "sqft": 2000,
    }, headers=headers)
    return headers, listing.json()["id"]


MOCK_UPLOAD_RESULT = {
    "id": "cf-image-123",
    "url": "https://imagedelivery.net/acct/cf-image-123/public",
    "thumbnail_url": "https://imagedelivery.net/acct/cf-image-123/thumbnail",
}


@patch("app.api.photos.upload_image", new_callable=AsyncMock, return_value=MOCK_UPLOAD_RESULT)
def test_upload_photo(mock_upload, client):
    headers, listing_id = _setup_user_and_listing(client)
    response = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("test.jpg", b"fake-image-data", "image/jpeg")},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["url"] == MOCK_UPLOAD_RESULT["url"]
    assert data["thumbnail_url"] == MOCK_UPLOAD_RESULT["thumbnail_url"]
    assert data["position"] == 0
    mock_upload.assert_called_once()


@patch("app.api.photos.upload_image", new_callable=AsyncMock, return_value=MOCK_UPLOAD_RESULT)
def test_upload_photo_increments_position(mock_upload, client):
    headers, listing_id = _setup_user_and_listing(client)
    # Upload two photos
    r1 = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("a.jpg", b"data1", "image/jpeg")},
        headers=headers,
    )
    r2 = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("b.jpg", b"data2", "image/jpeg")},
        headers=headers,
    )
    assert r1.json()["position"] == 0
    assert r2.json()["position"] == 1


@patch("app.api.photos.upload_image", new_callable=AsyncMock, return_value=MOCK_UPLOAD_RESULT)
def test_reorder_photos(mock_upload, client):
    headers, listing_id = _setup_user_and_listing(client)
    # Upload two photos
    r1 = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("a.jpg", b"data1", "image/jpeg")},
        headers=headers,
    )
    r2 = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("b.jpg", b"data2", "image/jpeg")},
        headers=headers,
    )
    photo1_id = r1.json()["id"]
    photo2_id = r2.json()["id"]

    # Reorder: swap positions
    response = client.put(
        f"/listings/{listing_id}/photos/order",
        json={"photo_ids": [photo2_id, photo1_id]},
        headers=headers,
    )
    assert response.status_code == 200
    photos = response.json()
    assert photos[0]["id"] == photo2_id
    assert photos[0]["position"] == 0
    assert photos[1]["id"] == photo1_id
    assert photos[1]["position"] == 1


@patch("app.api.photos.delete_image", new_callable=AsyncMock)
@patch("app.api.photos.upload_image", new_callable=AsyncMock, return_value=MOCK_UPLOAD_RESULT)
def test_delete_photo(mock_upload, mock_delete, client):
    headers, listing_id = _setup_user_and_listing(client)
    r1 = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("a.jpg", b"data1", "image/jpeg")},
        headers=headers,
    )
    photo_id = r1.json()["id"]

    response = client.delete(
        f"/listings/{listing_id}/photos/{photo_id}",
        headers=headers,
    )
    assert response.status_code == 204
    mock_delete.assert_called_once_with("cf-image-123")


def test_delete_photo_not_found(client):
    headers, listing_id = _setup_user_and_listing(client)
    response = client.delete(
        f"/listings/{listing_id}/photos/nonexistent",
        headers=headers,
    )
    assert response.status_code == 404


@patch("app.api.photos.upload_image", new_callable=AsyncMock, return_value=MOCK_UPLOAD_RESULT)
def test_photo_limit_50(mock_upload, client, db):
    headers, listing_id = _setup_user_and_listing(client)

    # Directly insert 50 photos into the database to avoid 50 HTTP calls
    from app.models.photo import ListingPhoto
    for i in range(50):
        photo = ListingPhoto(
            listing_id=listing_id,
            cloudflare_image_id=f"cf-{i}",
            url=f"https://example.com/{i}/public",
            thumbnail_url=f"https://example.com/{i}/thumbnail",
            position=i,
        )
        db.add(photo)
    db.commit()

    # 51st should fail
    response = client.post(
        f"/listings/{listing_id}/photos",
        files={"file": ("overflow.jpg", b"data", "image/jpeg")},
        headers=headers,
    )
    assert response.status_code == 400
    assert "Maximum 50 photos" in response.json()["detail"]
    mock_upload.assert_not_called()


def test_upload_photo_listing_not_found(client):
    # Create user but use a bad listing ID
    client.post("/auth/signup", json={"email": "nolisting@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "nolisting@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = client.post(
        "/listings/nonexistent-id/photos",
        files={"file": ("test.jpg", b"data", "image/jpeg")},
        headers=headers,
    )
    assert response.status_code == 404
