import httpx
from app.core.config import settings

CLOUDFLARE_BASE = f"https://api.cloudflare.com/client/v4/accounts/{settings.CLOUDFLARE_ACCOUNT_ID}/images/v1"


async def upload_image(file_bytes: bytes, filename: str) -> dict:
    """Upload image to Cloudflare Images. Returns {id, url, thumbnail_url}"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            CLOUDFLARE_BASE,
            headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"},
            files={"file": (filename, file_bytes)},
        )
        response.raise_for_status()
        result = response.json()["result"]
        image_id = result["id"]
        # Cloudflare Images variant URLs
        base_url = result["variants"][0].rsplit("/", 1)[0]
        return {
            "id": image_id,
            "url": f"{base_url}/public",
            "thumbnail_url": f"{base_url}/thumbnail",
        }


async def delete_image(image_id: str):
    """Delete image from Cloudflare Images"""
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{CLOUDFLARE_BASE}/{image_id}",
            headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"},
        )
