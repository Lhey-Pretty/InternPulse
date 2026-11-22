# InternPulse ML production handoff

This repository's `ml/` directory runs an **inference-only** FastAPI service on
**127.0.0.1:8002**, separate from PestWatch AI. Another deployment assistant will
configure the VPS. These files are templates and instructions; no service has
been deployed and no VPS settings have been changed.

**Never run training scripts, training queues or hyperparameter optimization on
the live service.** Train and evaluate models offline, review the artifacts,
then deploy them with a release and restart. Optimization and model activation
HTTP routes are deliberately disabled with 403; there is no switch to enable
training in this inference server.

## Runtime and installation

Use **CPython 3.11**, a supported Python release. The bundled joblib artifacts
were serialized with **scikit-learn 1.7.2**; changing that version requires
offline artifact conversion/retraining and validation. Python 3.14 is not the
target for these artifacts. Python 3.10 compatibility was also checked, but it
has reached end of support and should not be selected for a new deployment.

On Linux, the deployment assistant needs the OS packages providing Python 3.11,
its `venv` module, CA certificates, and the C/C++ runtime libraries used by
NumPy/SciPy wheels (commonly `libstdc++6` and `libgcc-s1`). Names vary by distro.
Use a platform with compatible binary wheels; no compiler, CUDA/GPU toolkit,
PyTorch, transformers, pandas, O*NET spreadsheets or raw training CSVs are
required for inference.

Run these commands in the selected release's `ml/` directory:

```sh
python3.11 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m pip check
.venv/bin/python run.py
```

`run.py` resolves the app from its own absolute location, binds loopback, reads
`ML_PORT` (default 8002), uses **one worker**, disables reload, limits Uvicorn
concurrency to 16, and uses a five-second keepalive. Invoke it with an absolute
path if starting outside `ml/`. It reads configuration exclusively from the
process environment; it never opens Laravel's `.env`.

An equivalent direct launch, from `ml/`, is:

```sh
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 \
  .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port "${ML_PORT:-8002}" \
  --workers 1 --limit-concurrency 16 --timeout-keep-alive 5
```

## Environment configuration

Keep configuration in the deployment assistant's private environment file or
service environment. Do not put secrets, generated credentials or `.env` files
in Git. No application environment variable is mandatory for local inference
with bundled artifacts. These are the configuration names:

| Name | Purpose |
| --- | --- |
| `ML_PORT` | Dedicated loopback listener port. |
| `ML_ALLOWED_ORIGINS` | Comma-separated explicit HTTP(S) browser origins; empty disables cross-origin browser access. Wildcards are rejected and CORS credentials are disabled. Server-to-server Laravel calls do not require CORS. |
| `ML_CALLBACK_TOKEN` | Shared Laravel callback secret, required only when callbacks are used. |
| `ML_CALLBACK_ALLOWED_URLS` | Comma-separated exact, trusted Laravel callback URLs, required when callbacks are used. No query strings, fragments, userinfo or redirects. Prefer the backend's loopback URL; use HTTPS for remote callbacks. |
| `ML_ADMIN_TOKEN` | Secret for reading `/api/ml/models`; leave unset to close that API. |
| `OMP_NUM_THREADS`, `OPENBLAS_NUM_THREADS`, `MKL_NUM_THREADS` | Numerical-library thread limits; the launcher defaults each to one. |
| `PYTHONUNBUFFERED`, `PYTHONDONTWRITEBYTECODE` | Immediate logs and read-only runtime operation, set by the service template. |

## Inference resources and readiness

Paths are anchored to `ml/`, independent of the current working directory.
Required resources are:

- `datasets/curated_skills.json` and `datasets/processed/onet_taxonomy.json`.
- Eleven trusted fitted sklearn pipelines named `<program>_classifier.joblib`
  in `models/`: `beed`, `bscpe`, `bscrim`, `bsed_english`, `bsed_math`,
  `bsed_science`, `bshm`, `bsit`, `bstm`, `fisheries`, `polsci`.
- `<program>_metrics.json` for programs whose metrics endpoint is needed.
- `models/model_registry.json` for version metadata and active artifact paths.
  Paths in this release are relative to `models/`. An active registered path
  must resolve inside that directory. Without a registry, canonical filenames
  are used. A malformed existing registry makes health degraded.

Only supported-course sklearn pipelines are loaded. The legacy generic journal
classifier and PyTorch directories are ignored. Startup checks each pipeline's
labels, prediction and finite probability output, and rejects sklearn version
mismatches. Joblib deserialization executes Python: only deploy reviewed,
trusted artifacts and give the runtime user read-only access to them.

Startup never registers models or writes model files. Artifacts remain fixed in
memory until a restart. Missing, invalid or corrupt models produce clear server
logs and **HTTP 503** from `/health`; available predictions may still fall back
to rules. Required skills JSON load failures also produce 503. Healthy status
requires all eleven models and both skills resources. Health reports counts,
program names and safe failure categories, with no secrets or filesystem paths.

Plan approximately **256–512 MiB RAM per worker**, with at least 512 MiB
available headroom, and **2–15 seconds** for startup on a typical small VPS.
These are capacity estimates, not VPS measurements. See
[deploy/VALIDATION.md](deploy/VALIDATION.md) for local observations. One worker
avoids duplicating model memory. Confirm RAM, startup latency and throughput on
the actual VPS before setting resource caps or increasing concurrency.

## API and request limits

Successful inference response schemas remain compatible. Blank/oversized input,
unknown journal courses and model preferences are rejected with 422. Validation
errors omit submitted values; internal failures return a controlled JSON error.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/health` | 200 healthy; 503 degraded; available during application overload. |
| POST | `/api/ml/skill-match` | At most 100 skills per list, 128 characters per skill. |
| POST | `/api/ml/recommend-internships` | At most 100 postings and 1,000 total required skills; `top_k` from 1 to 10. |
| POST | `/api/ml/analyze-journal` | Supported course and nonblank journal, at most 10,000 characters. |
| POST | `/api/journal/analyze` | Same journal limits; Laravel response contract described below. |
| POST | `/api/ml/batch-analyze` | 1–50 entries, at most 100,000 total journal characters; 15-second cooperative deadline. |
| POST | `/api/ml/analyze-journal/dual` | Rules and sklearn comparison. |
| POST | `/api/ml/explain` | Existing feature/heuristic explanation response. |
| GET | `/api/ml/metrics/{program_code}` | Stored metrics only; validated program path; 404 when absent. |
| GET | `/api/ml/skills-by-course/{course_code}` | Existing course-skills response. |
| GET | `/api/ml/models` | Requires `X-ML-Admin-Token` matching `ML_ADMIN_TOKEN`; 503 if unconfigured, 401 if invalid. |
| POST | `/api/ml/optimize-hyperparameters` | Disabled with 403; run offline. |
| POST | `/api/ml/models/{program_code}/activate` | Disabled with 403; deploy a reviewed model release. |

Every request body is capped at **1 MiB**, including streamed bodies (413).
Body receipt times out after **10 seconds** (408). At most **four** application
requests, including background callbacks, run concurrently (503 when busy).
Uvicorn's own connection limit may also return 503. Batch work stops between
entries once its deadline passes (504); it cannot preempt a running native model
call. Bounded input and concurrency constrain CPU and memory without spawning
per-entry threads or processes. `preferred_model` accepts `sklearn`, `rules` and
legacy `pytorch`; the latter safely falls back to sklearn/rules without importing
deep-learning packages.

Example health check and lightweight inference:

```sh
curl --fail http://127.0.0.1:8002/health
curl --fail http://127.0.0.1:8002/api/ml/analyze-journal \
  -H 'Content-Type: application/json' \
  -d '{"student_course":"BSIT","journal_text":"I implemented a Laravel API and debugged SQL queries."}'
```

## Laravel callback contract

`POST /api/journal/analyze` accepts `journal_entry_id`, `journal_text`,
`student_course` and optional `callback_url`. It returns exactly:
`journal_entry_id`, `is_course_related`, `confidence_score`, `detected_tasks`,
`flag_level`, `feedback`, `model_used`.

Without `callback_url`, the normal synchronous response requires no token.
When a callback is requested, **Laravel must send `X-ML-Callback-Token` matching
the ML service's `ML_CALLBACK_TOKEN`**. Missing service configuration returns
503; missing/wrong request token returns 401; a URL outside the exact allowlist
returns 400. This is a required security tightening of the old unauthenticated
callback behavior. The deployment assistant must verify the Laravel caller
sends the header before enabling callbacks; no Laravel code was changed here.

The service POSTs the same JSON response to the allowed URL in a background
thread, with `Content-Type: application/json`, `User-Agent: InternPulse-ML/2.0`
and **`X-ML-Callback-Token`**. The Laravel receiver must compare that header to
its configured secret and reject missing/mismatched tokens. Configure matching
secrets outside Git. Delivery has a ten-second socket timeout, uses no proxy
environment settings and follows no redirects, preventing token forwarding.
Logs include status/failure class without callback URLs, payloads or tokens.
Delivery is best-effort, has no persistent retry queue and does not change a
successful inference response. The backend should retain its existing
synchronous-result/retry behavior.

## systemd handoff (deployment assistant only)

[deploy/internpulse-ml.service](deploy/internpulse-ml.service) is a repository-only
template. Replace `@PROJECT_PATH@` with the absolute path to this release's
`ml/` directory, `@SERVICE_USER@` and `@SERVICE_GROUP@` with a dedicated account,
and `@ENVIRONMENT_FILE@` with the protected absolute environment-file path.
Use a path outside the user's home directory because `ProtectHome=true`.
The unit supports an environment file, one worker, loopback binding, automatic
restart, journal logging and a read-only runtime filesystem.

After reviewing and installing the substituted template as this application's
dedicated service, the deployment assistant may run:

```sh
sudo systemd-analyze verify /etc/systemd/system/internpulse-ml.service
sudo systemctl daemon-reload
sudo systemctl enable --now internpulse-ml.service
sudo systemctl status internpulse-ml.service
curl --fail http://127.0.0.1:8002/health
journalctl -u internpulse-ml.service -n 100 --no-pager
```

Keep this unit's environment file private and artifacts readable by the service
account. Health failures need explicit monitoring: the process remains alive to
serve safe fallbacks, so a systemd restart-on-failure policy alone does not detect
degraded readiness. Do not expose port 8002 publicly. DNS, Nginx, firewall,
databases and other applications are outside this handoff's scope.

## Validation, logs and rollback

To repeat the repository tests in an isolated environment, from `ml/`:

```sh
.venv/bin/python -m pip install -r requirements-test.txt
.venv/bin/python -B -m unittest discover -s tests -v
.venv/bin/python -m pip check
```

The tests launch the production entry point on an unused loopback port from
another directory, call every documented core inference endpoint, exercise
authentication/errors/limits, load the actual artifacts, verify degraded model
health and check that training packages are absent. Use a clean inference/test
environment for the training-package checks. Test dependencies are not required
on the live service.

Startup logs show per-program model success/failure, counts and elapsed time.
Inspect the dedicated unit's journal and monitor `/health` and HTTP 5xx rates.
Internal error details stay in server logs; clients receive controlled errors.
Avoid debug request-body/header logging because journals and tokens are private.

For rollback, retain the previous release, its pinned virtual environment and
reviewed artifacts. Point **only this unit** back to that release, restart
`internpulse-ml.service`, and verify health plus a sample inference request.
Keep secret environment configuration outside both releases. Roll back code,
model artifacts and registry together; do not activate or train models through
the live HTTP API. The deployment assistant should record the deployed Git
commit and a platform-specific install record. Runtime dependencies, including
transitive packages, are pinned in `requirements.txt`.

See [deploy/CHANGELOG.md](deploy/CHANGELOG.md) for the complete file-level change
summary and [deploy/VALIDATION.md](deploy/VALIDATION.md) for validation results
and remaining platform/integration limitations.
