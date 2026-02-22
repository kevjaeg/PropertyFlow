from pydantic import BaseModel


class ListingCreate(BaseModel):
    agent_id: str
    address: str
    price: int  # in cents
    beds: int
    baths: int
    sqft: int
    description: str | None = None
    mls_number: str | None = None


class ListingUpdate(BaseModel):
    address: str | None = None
    price: int | None = None
    beds: int | None = None
    baths: int | None = None
    sqft: int | None = None
    description: str | None = None
    mls_number: str | None = None


class ListingStatusUpdate(BaseModel):
    status: str  # "active" or "archived"


class ListingResponse(BaseModel):
    id: str
    agent_id: str
    slug: str
    address: str
    price: int
    beds: int
    baths: int
    sqft: int
    description: str | None
    mls_number: str | None
    status: str
    branded_url: str
    unbranded_url: str

    model_config = {"from_attributes": True}
