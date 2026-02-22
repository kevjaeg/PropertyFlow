from pydantic import BaseModel


class AgentCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    brokerage_name: str | None = None


class AgentUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    brokerage_name: str | None = None


class AgentResponse(BaseModel):
    id: str
    name: str
    email: str | None
    phone: str | None
    brokerage_name: str | None
    photo_url: str | None
    brokerage_logo_url: str | None

    model_config = {"from_attributes": True}
