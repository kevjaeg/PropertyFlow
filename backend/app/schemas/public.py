from pydantic import BaseModel


class PublicPhotoResponse(BaseModel):
    id: str
    url: str
    thumbnail_url: str
    position: int
    model_config = {"from_attributes": True}


class PublicVideoResponse(BaseModel):
    id: str
    mux_playback_id: str | None
    title: str | None
    status: str
    model_config = {"from_attributes": True}


class PublicAgentResponse(BaseModel):
    name: str
    email: str | None
    phone: str | None
    brokerage_name: str | None
    photo_url: str | None
    brokerage_logo_url: str | None
    model_config = {"from_attributes": True}


class PublicListingResponse(BaseModel):
    """Full listing data for branded property page"""
    slug: str
    address: str
    price: int
    beds: int
    baths: int
    sqft: int
    description: str | None
    mls_number: str | None
    photos: list[PublicPhotoResponse]
    videos: list[PublicVideoResponse]
    agent: PublicAgentResponse


class PublicListingMLSResponse(BaseModel):
    """Listing data for unbranded/MLS property page — NO agent info"""
    slug: str
    address: str
    price: int
    beds: int
    baths: int
    sqft: int
    description: str | None
    mls_number: str | None
    photos: list[PublicPhotoResponse]
    videos: list[PublicVideoResponse]
    # Note: NO agent field
