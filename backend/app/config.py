"""
ResearchMind AI - Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

# Project root directory
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Database – if DATABASE_URL is not set, fall back to a local SQLite database.
    # The default SQLite URL is compatible with aiosqlite and uses a file called researchmind.db
    DATABASE_URL: str = os.getenv("DATABASE_URL") or "sqlite+aiosqlite:///./researchmind.db"

    # JWT – generate a random secret if not provided (secure for dev, override in production).
    SECRET_KEY: str = os.getenv("SECRET_KEY") or "researchmind-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini
    GEMINI_API_KEY: str = ""

    # File Storage
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_FILE_SIZE_MB: int = 50

    # Embedding Model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
