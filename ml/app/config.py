"""Inference configuration; paths are anchored to the ML project, never the cwd."""

import os
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
DATASETS_DIR = BASE_DIR / "datasets"


def allowed_origins() -> list[str]:
    origins = [value.strip() for value in os.getenv("ML_ALLOWED_ORIGINS", "").split(",") if value.strip()]
    for origin in origins:
        parsed = urlsplit(origin)
        if ("*" in origin or parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username or parsed.password or parsed.path not in {"", "/"}
                or parsed.query or parsed.fragment):
            raise ValueError("ML_ALLOWED_ORIGINS must contain explicit HTTP(S) origins")
    return [origin.rstrip("/") for origin in origins]
