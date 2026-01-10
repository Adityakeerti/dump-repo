# config/settings.py

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from pathlib import Path
import yaml


class Settings(BaseSettings):
    # -------------------------
    # Application
    # -------------------------
    app_name: str = Field(...)
    app_env: str = Field(default="development")
    debug: bool = Field(default=False)

    # -------------------------
    # API
    # -------------------------
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)

    # -------------------------
    # LLM
    # -------------------------
    llm_provider: str = Field(...)
    hf_model_id: str | None = None
    huggingfacehub_api_token: str | None = None

    gemini_model_id: str | None = None
    google_api_key: str | None = None

    # -------------------------
    # Memory
    # -------------------------
    mongo_uri: str = Field(...)
    mongo_db: str = Field(...)

    # -------------------------
    # Vector
    # -------------------------
    vector_db: str = Field(default="chroma")
    vector_path: str = Field(default="./vector_store")

    # -------------------------
    # Orchestration
    # -------------------------
    orchestration_engine: str = Field(default="langchain")

    # -------------------------
    # Permissions
    # -------------------------
    permissions_file: str = Field(default="config/permissions.yaml")

    # -------------------------
    # JWT Authentication
    # -------------------------
    jwt_secret: str = Field(...)

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "forbid"   # <- this is why the error happened (and it's GOOD)

    # -------------------------
    # Validation
    # -------------------------
    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: str) -> str:
        if v not in {"hf", "gemini"}:
            raise ValueError("llm_provider must be 'hf' or 'gemini'")
        return v


settings = Settings()


def load_permissions() -> dict:
    path = Path(settings.permissions_file)
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# Import permissions module function
def get_permissions():
    """Get permissions config - alias for load_permissions for consistency"""
    return load_permissions()
