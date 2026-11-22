# Local production validation

Validated on **22 November 2026**, on Windows x86-64. No VPS was accessed or
configured and this service is **not deployed**. Only `ml/` files belong to the
fix commit. The full file-level summary is in [CHANGELOG.md](CHANGELOG.md).

## Results

| Check | Result |
| --- | --- |
| Clean CPython 3.11.14 virtual environment, `pip install -r requirements.txt` | Passed; no global Python/dependency changes retained. |
| Separate clean CPython 3.10.6 compatibility environment | Passed; Python 3.10 is not recommended for a new deployment because its support has ended. |
| Production dependency consistency (`python -m pip check`) | Passed on both environments. |
| Syntax compilation of app, launcher, scripts, tests and offline training sources | Passed without importing or running training code. |
| FastAPI import and real lifespan startup | Passed under both Python versions. |
| Inference-only startup/prediction before test dependency installation | Passed; all eleven models loaded and prediction used sklearn. |
| `/health` | Passed: healthy 200 with actual artifacts; degraded 503 for missing models/datasets. |
| Each core inference endpoint | Passed: skill match, recommendations, journal analysis, Laravel compatibility, batch, dual comparison, explain and stored BSIT metrics. Course-skills endpoint also passed. |
| Actual model loading and prediction across all supported programs | Passed: eleven validated sklearn pipelines; unused legacy generic journal classifier excluded. |
| Missing, corrupt and wrong-type artifacts | Passed: clear failure categories, reduced counts, degraded readiness, rules fallback available. |
| Corrupt registry and model path traversal | Passed: corrupt registry tracked, paths outside models rejected. |
| Runtime prediction failure | Passed: failing model removed from cache, health degrades, safe rules fallback. |
| Production startup writes | Passed: model manager works with registry writes forbidden. |
| Laravel callback and model-list authentication | Passed: required environment tokens/headers, closed defaults, wrong/missing tokens rejected. |
| Callback URL/redirect safety | Passed: unsafe/disallowed URLs rejected, redirect handler refuses forwarding, delivery contract/header verified with mocked HTTP I/O. |
| Disabled optimization and activation | Passed: both routes return 403 without loading training modules. |
| Limits and validation | Passed: excessive journals/skill lists/postings/batches, unknown courses/model preferences, malformed JSON and traversal rejected; 1 MiB bodies capped including streaming, slow bodies return 408, busy admission returns 503, expired batch deadline returns 504. |
| Internal error responses | Passed: generic inference error; batch errors omit exception details; validation responses omit submitted input. |
| CORS | Passed: empty default, wildcard rejected, explicit origin supported without credentials, unknown browser origin blocked. |
| Reload/host/workers/port | Passed: real launcher has no reloader; defaults are loopback, one worker, port 8002; `ML_PORT` override checked. Live tests use an unused local port to avoid existing services. |
| Training packages/modules absent | Passed: torch, transformers, pandas, sentence-transformers and Optuna not installed; optimizer/training queue/training service/training script not imported during startup or inference. |
| Tracked environment/credential files and secret patterns | Passed: no ML `.env` files; no private-key, common GitHub/OpenAI token, AWS access-key or secret-assignment pattern findings in the scanned ML files. New files contain only configuration names, examples and runtime-generated test fixtures, with no stored credentials. |
| Diff whitespace and scope | Passed: final fix changes only `ml/`; unrelated frontend/backend working changes are excluded. |

The regression suite contains **17 tests** (with additional endpoint/error
subcases) and passed in both environments:

```text
Python 3.11.14: Ran 17 tests in 14.944s — OK
Python 3.10.6:  Ran 17 tests in 17.632s — OK
```

The live test invokes `run.py` from another directory and calls all core
inference endpoints over HTTP. Local observations:

| Runtime | Time to healthy HTTP | Model preload | Peak process-tree working set |
| --- | --- | --- | --- |
| Python 3.11.14 | 6.94 s | 1.813 s | 166.2 MiB |
| Python 3.10.6 | 8.02 s | 2.096 s | 160.5 MiB |

These are local smoke-test measurements, not VPS capacity/load benchmarks.
Windows process-tree peak memory is the sum of observed process peaks, including
any virtual-environment launcher. Plan 256–512 MiB per worker and verify actual
Linux usage and startup time before setting limits.

## Repeating checks

From `ml/`, in a fresh Python 3.11 virtual environment:

```sh
.venv/bin/python -m pip install -r requirements-test.txt
.venv/bin/python -B -m unittest discover -s tests -v
.venv/bin/python -m pip check
git diff --check -- .
git ls-files -- '.env' '.env.*' '*.pem' '*.key'
```

Runtime dependencies, including transitive packages, are pinned. The test HTTP
client is separate from production requirements. Tests create temporary
fixtures, briefly launch a loopback process, and clean up their own process
tree. Secret-pattern checks are a scoped audit, not a guarantee that arbitrary
historical/binary content can never contain a secret.

## Remaining limitations and deployment notes

- Linux/VPS binary-wheel installation, systemd syntax/runtime behavior, actual
  traffic throughput and VPS resource usage still need validation by the
  separate deployment assistant. Use supported Python 3.11 and one worker on
  127.0.0.1:8002, with the documented private environment file.
- Real Laravel callback delivery and receiver authentication were not exercised
  against a backend. Before enabling callbacks, configure the exact URL
  allowlist and matching shared token on both sides; confirm the Laravel caller
  sends and the receiver validates `X-ML-Callback-Token`. No Laravel code was
  accessed or modified for this task.
- Callbacks are best-effort background delivery with a socket timeout and no
  durable retry queue. Batch deadlines are checked between entries and cannot
  interrupt a native prediction call. Input size and concurrency are bounded.
- Missing models allow safe rules fallback, but readiness correctly remains
  degraded. Monitor the HTTP health status; systemd restarts on process failure
  alone do not detect degraded models. Artifact/registry updates require a
  reviewed release and restart.
- Classification quality, stored metric quality and legacy explainability
  heuristics were preserved; no models were retrained or re-evaluated against
  training datasets. Joblib artifacts must remain trusted and read-only.
- GitHub's existing `feature/in-progress` branch diverges from the supplied local
  baseline and includes different ML artifacts. The tested local fixes are
  published on `fix/ml-production-inference`; the existing remote branch is
  preserved. Deploy `ml/` from that exact fix commit. Any later merge with the
  divergent branch needs model/code validation rather than replacing artifacts
  without testing.

No DNS, Nginx, firewall, systemd installation, database or other-application
configuration was changed. The isolated Python installer briefly created a
user launcher and Python registry registration; both verified installer
artifacts were removed, leaving only ignored local ML validation environments.
