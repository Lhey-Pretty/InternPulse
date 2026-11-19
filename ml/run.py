import uvicorn
import os
from pathlib import Path


def load_local_callback_token():
    """Load the local Laravel callback secret when no environment value is set."""
    if os.environ.get("ML_CALLBACK_TOKEN"):
        return

    backend_env = Path(__file__).resolve().parents[1] / "backend" / ".env"
    if not backend_env.is_file():
        return

    for line in backend_env.read_text(encoding="utf-8-sig").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() == "ML_CALLBACK_TOKEN":
            os.environ["ML_CALLBACK_TOKEN"] = value.strip().strip("\"'")
            return

if __name__ == "__main__":
    load_local_callback_token()
    port = int(os.environ.get("ML_PORT", 8001))
    print(f"Starting InternPulse ML Microservice on port {port}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True)
