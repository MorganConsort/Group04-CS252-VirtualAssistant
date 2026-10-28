"""Environment settings; no credentials or external calls are needed locally."""

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    database_url: str = "sqlite:///./pathly.db"
    cors_origins: tuple[str, ...] = ("http://127.0.0.1:5173", "http://localhost:5173")
    session_hours: int = 24
    llm_base_url: str = "https://api.openai.com/v1"
    llm_api_key: str = field(default="", repr=False)
    llm_model: str = ""
    llm_timeout_seconds: float = 20

    def __post_init__(self):
        if not 1 <= self.session_hours <= 720:
            raise ValueError("SESSION_HOURS must be between 1 and 720")
        if not 1 <= self.llm_timeout_seconds <= 60:
            raise ValueError("COMPANION_LLM_TIMEOUT_SECONDS must be between 1 and 60")
        if bool(self.llm_api_key) != bool(self.llm_model):
            raise ValueError(
                "Set both COMPANION_LLM_API_KEY and COMPANION_LLM_MODEL, or leave both empty"
            )

    @classmethod
    def from_env(cls):
        load_dotenv()
        return cls(
            database_url=os.getenv("PATHLY_DATABASE_URL", "sqlite:///./pathly.db"),
            cors_origins=tuple(
                value.strip()
                for value in os.getenv(
                    "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
                ).split(",")
                if value.strip()
            ),
            session_hours=int(os.getenv("SESSION_HOURS", "24")),
            llm_base_url=os.getenv(
                "COMPANION_LLM_BASE_URL", "https://api.openai.com/v1"
            ).rstrip("/"),
            llm_api_key=os.getenv("COMPANION_LLM_API_KEY", ""),
            llm_model=os.getenv("COMPANION_LLM_MODEL", ""),
            llm_timeout_seconds=float(os.getenv("COMPANION_LLM_TIMEOUT_SECONDS", "20")),
        )
