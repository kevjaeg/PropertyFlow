from unittest.mock import patch


MOCK_UPLOAD_RESULT = {
    "upload_id": "mux-upload-123",
    "upload_url": "https://storage.googleapis.com/mux-uploads/abc123",
}


def _setup_user_and_listing(client):
    """Helper: create user, login, create agent, create listing, return (headers, listing_id)"""
    client.post("/auth/signup", json={"email": "video@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "video@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    agent = client.post("/agents", json={"name": "Jane Smith"}, headers=headers)
    agent_id = agent.json()["id"]
    listing = client.post("/listings", json={
        "agent_id": agent_id,
        "address": "456 Video Ave",
        "price": 60000000,
        "beds": 4, "baths": 3, "sqft": 3000,
    }, headers=headers)
    return headers, listing.json()["id"]


@patch("app.api.videos.create_direct_upload", return_value=MOCK_UPLOAD_RESULT)
def test_create_video_upload(mock_mux, client):
    headers, listing_id = _setup_user_and_listing(client)
    response = client.post(
        f"/listings/{listing_id}/videos",
        json={"title": "Walkthrough"},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["upload_url"] == MOCK_UPLOAD_RESULT["upload_url"]
    assert "video_id" in data
    mock_mux.assert_called_once()


@patch("app.api.videos.create_direct_upload", return_value=MOCK_UPLOAD_RESULT)
def test_create_video_upload_no_title(mock_mux, client):
    headers, listing_id = _setup_user_and_listing(client)
    response = client.post(
        f"/listings/{listing_id}/videos",
        json={},
        headers=headers,
    )
    assert response.status_code == 201


@patch("app.api.videos.create_direct_upload", return_value=MOCK_UPLOAD_RESULT)
def test_video_limit_2(mock_mux, client):
    headers, listing_id = _setup_user_and_listing(client)
    # Create 2 videos
    r1 = client.post(f"/listings/{listing_id}/videos", json={"title": "Video 1"}, headers=headers)
    r2 = client.post(f"/listings/{listing_id}/videos", json={"title": "Video 2"}, headers=headers)
    assert r1.status_code == 201
    assert r2.status_code == 201

    # 3rd should fail
    r3 = client.post(f"/listings/{listing_id}/videos", json={"title": "Video 3"}, headers=headers)
    assert r3.status_code == 400
    assert "Maximum 2 videos" in r3.json()["detail"]


@patch("app.api.videos.create_direct_upload", return_value=MOCK_UPLOAD_RESULT)
def test_get_video_status(mock_mux, client):
    headers, listing_id = _setup_user_and_listing(client)
    create = client.post(
        f"/listings/{listing_id}/videos",
        json={"title": "Tour"},
        headers=headers,
    )
    video_id = create.json()["video_id"]
    response = client.get(
        f"/listings/{listing_id}/videos/{video_id}",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == video_id
    assert data["status"] == "waiting"
    assert data["title"] == "Tour"


def test_get_video_not_found(client):
    headers, listing_id = _setup_user_and_listing(client)
    response = client.get(
        f"/listings/{listing_id}/videos/nonexistent",
        headers=headers,
    )
    assert response.status_code == 404


def test_create_video_listing_not_found(client):
    client.post("/auth/signup", json={"email": "novid@test.com", "password": "pass123"})
    login = client.post("/auth/login", json={"email": "novid@test.com", "password": "pass123"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = client.post(
        "/listings/nonexistent-id/videos",
        json={"title": "Test"},
        headers=headers,
    )
    assert response.status_code == 404


def test_mux_webhook_asset_ready(client, db):
    """Test Mux webhook for video.asset.ready event"""
    from app.models.video import ListingVideo

    # Create a video record with a known mux_asset_id
    # First, set up a listing
    headers, listing_id = _setup_user_and_listing(client)

    video = ListingVideo(
        listing_id=listing_id,
        mux_asset_id="asset-abc-123",
        title="Test Video",
        status="processing",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    # Send webhook
    response = client.post("/webhooks/mux", json={
        "type": "video.asset.ready",
        "data": {
            "id": "asset-abc-123",
            "playback_ids": [{"id": "playback-xyz", "policy": "public"}],
        },
    })
    assert response.status_code == 200

    # Verify video was updated
    db.refresh(video)
    assert video.status == "ready"
    assert video.mux_playback_id == "playback-xyz"


def test_mux_webhook_asset_errored(client, db):
    """Test Mux webhook for video.asset.errored event"""
    from app.models.video import ListingVideo

    headers, listing_id = _setup_user_and_listing(client)

    video = ListingVideo(
        listing_id=listing_id,
        mux_asset_id="asset-err-456",
        title="Error Video",
        status="processing",
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    response = client.post("/webhooks/mux", json={
        "type": "video.asset.errored",
        "data": {"id": "asset-err-456"},
    })
    assert response.status_code == 200

    db.refresh(video)
    assert video.status == "error"


def test_mux_webhook_unknown_event(client):
    """Test Mux webhook with unknown event type returns ok"""
    response = client.post("/webhooks/mux", json={
        "type": "video.some.other.event",
        "data": {},
    })
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
