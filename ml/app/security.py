"""Management authentication and a closed callback destination allowlist."""

import hmac
import os
from urllib.parse import urlsplit

from fastapi import Header, HTTPException


def require_admin(x_ml_admin_token: str | None = Header(default=None)):
    expected = os.environ.get("ML_ADMIN_TOKEN", "")
    if not expected:
        raise HTTPException(503, "Management API is not configured")
    if not x_ml_admin_token or not hmac.compare_digest(x_ml_admin_token.encode(), expected.encode()):
        raise HTTPException(401, "Invalid management token")


def validate_callback(callback_url: str, supplied_token: str | None):
    expected = os.environ.get("ML_CALLBACK_TOKEN", "")
    if not expected:
        raise HTTPException(503, "Callbacks are not configured")
    if not supplied_token or not hmac.compare_digest(supplied_token.encode(), expected.encode()):
        raise HTTPException(401, "Invalid callback token")
    allowed = {value.strip() for value in os.getenv("ML_CALLBACK_ALLOWED_URLS", "").split(",") if value.strip()}
    try:
        parsed = urlsplit(callback_url)
        valid = (parsed.scheme in {"http", "https"} and parsed.hostname
                 and not parsed.username and not parsed.password
                 and not parsed.query and not parsed.fragment and parsed.port != 0
                 and not any(character.isspace() for character in callback_url))
    except ValueError:
        valid = False
    if not valid or callback_url not in allowed:
        raise HTTPException(400, "Callback URL is not allowed")
