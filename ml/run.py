"""Production entry point: python /absolute/path/to/ml/run.py."""

import logging
import os
from pathlib import Path

import uvicorn


def main():
    port = int(os.environ.get("ML_PORT", "8002"))
    if not 1 <= port <= 65535:
        raise ValueError("ML_PORT must be between 1 and 65535")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    for variable in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
        os.environ.setdefault(variable, "1")
    uvicorn.run(
        "app.main:app", app_dir=str(Path(__file__).resolve().parent),
        host="127.0.0.1", port=port, workers=1, reload=False,
        limit_concurrency=16, timeout_keep_alive=5,
    )


if __name__ == "__main__":
    main()
