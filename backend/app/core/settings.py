from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ai-smart-agriculture"
    environment: str = "dev"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173,https://kisancore-ai.vercel.app"
    groq_api_key: str = ""
    
    database_url: str = "sqlite:///./kisancore.db"

    @property
    def sqlalchemy_database_url(self) -> str:
        return self.database_url


settings = Settings()

