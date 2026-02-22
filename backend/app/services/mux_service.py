import mux_python
from app.core.config import settings


def _get_config():
    configuration = mux_python.Configuration()
    configuration.username = settings.MUX_TOKEN_ID
    configuration.password = settings.MUX_TOKEN_SECRET
    return configuration


def create_direct_upload(cors_origin: str | None = None) -> dict:
    """Create Mux direct upload URL. Returns {upload_id, upload_url}"""
    config = _get_config()
    uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(config))
    request = mux_python.CreateUploadRequest(
        new_asset_settings=mux_python.CreateAssetRequest(
            playback_policy=[mux_python.PlaybackPolicy.PUBLIC],
        ),
        cors_origin=cors_origin or settings.FRONTEND_URL,
    )
    upload = uploads_api.create_direct_upload(request)
    return {
        "upload_id": upload.data.id,
        "upload_url": upload.data.url,
    }


def get_asset(asset_id: str) -> dict:
    """Get Mux asset details"""
    config = _get_config()
    assets_api = mux_python.AssetsApi(mux_python.ApiClient(config))
    asset = assets_api.get_asset(asset_id)
    playback_id = asset.data.playback_ids[0].id if asset.data.playback_ids else None
    return {
        "asset_id": asset.data.id,
        "playback_id": playback_id,
        "status": asset.data.status,
    }
