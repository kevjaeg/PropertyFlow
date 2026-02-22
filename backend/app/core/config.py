from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/propertyflow"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_API_TOKEN: str = ""

    MUX_TOKEN_ID: str = ""
    MUX_TOKEN_SECRET: str = ""

    RESEND_API_KEY: str = ""

    FRONTEND_URL: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}

settings = Settings()
