from datetime import datetime
from pydantic import BaseModel, EmailStr


class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    message: str | None = None


class LeadResponse(BaseModel):
    id: str
    listing_id: str
    name: str
    email: str
    phone: str | None
    message: str | None
    notified: bool
    created_at: datetime
    listing_address: str | None = None

    model_config = {"from_attributes": True}
