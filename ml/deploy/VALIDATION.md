# Local production validation

Validated on **22 November 2026**, on Windows x86-64. This JOURNAL runtime
update was validated locally; no VPS was accessed or changed. Only `ml/` files
belong to the fix commit. The full file-level summary is in [CHANGELOG.md](CHANGELOG.md).

The update uses JOURNAL as the shared fallback for **all eleven supported
programs**, after each program's own classifier and before rules. The production
loader now requires **twelve** trusted fitted pipelines. The healthy runtime
reports `expected_models: 12`, `sklearn_models_loaded: 12`, JOURNAL in the loaded
identifiers, and no missing models or failures.

The existing JOURNAL pipeline's classes are `course_related` and `unrelated`;
its stored training metadata references BSIT activities. Routing it as a shared
fallback is verified here; accuracy across other programs has not been measured.
All twelve trained artifacts, registry metadata, metrics and datasets were
preserved. No retraining, conversion or deletion of repository artifacts occurred.

The Laravel caller flow was inspected: `MLService::analyzeJournal` posts the
course and journal to `/api/ml/analyze-journal`; queued `ClassifyJournalEntry`
posts them with the entry ID and authenticated callback URL to
`/api/journal/analyze`. Both use the same shared fallback. Batch, dual comparison
and explanation paths were also verified for every supported course.
Successful response fields and callback payload keys remain compatible.

## Results

| Check | Result |
| --- | --- |
| Isolated CPython 3.11.14 runtime | Reused the previously validated clean environment; no dependency installation or global changes for this update. |
| Separate isolated CPython 3.10.6 compatibility runtime | Complete updated suite passed; Python 3.11 remains the recommended deployment runtime. |
| Production dependency consistency (`python -m pip check`) | Passed on both environments. |
| Syntax compilation of app, launcher, scripts, tests and offline training sources | Passed: 32 Python files compiled in memory, without writing bytecode or importing/running training code. |
| FastAPI import and real lifespan startup | Passed under both Python versions. |
| Inference-only startup and prediction | Passed; all twelve models loaded and prediction used sklearn. No new dependencies were installed. |
| `/health` | Passed: healthy 200 with actual artifacts; degraded 503 for missing models/datasets. |
| Each core inference endpoint | Passed: skill match, recommendations, journal analysis, Laravel compatibility, batch, dual comparison, explain and stored BSIT metrics. Course-skills endpoint also passed. |
| Actual model loading and prediction across all supported programs | Passed: all twelve validated pipelines, including the existing binary JOURNAL classifier. |
| Missing, corrupt and wrong-type artifacts | Passed: clear failure categories, reduced counts, degraded readiness, rules fallback available. |
| Corrupt registry and model path traversal | Passed: corrupt registry tracked, paths outside models rejected. |
| Runtime prediction failure | Passed: course failure uses JOURNAL; shared failure uses rules; failed models are quarantined and health remains degraded. Malformed/non-finite probabilities are rejected at startup and runtime. |
| Production startup writes and artifact preservation | Passed: startup with registry/artifact writes forbidden; SHA-256 fingerprints of all model-directory files unchanged after startup and fallback; Git confirms no changes under models or datasets. |
| All-program JOURNAL routing | Passed: actual JOURNAL predictions on all eleven course identifiers through single, Laravel, batch, dual and explanation paths. Course classifiers remain first choice; explicit rules requests bypass both models. |
| Missing/rejected JOURNAL | Passed: 11 loaded / 12 expected, HTTP 503, safe failure category; available course predictions continue, and missing course plus missing JOURNAL uses rules. |
| Explanation model and coefficient labels | Passed: uses JOURNAL weights when fallback is selected, binary weights are oriented toward course-related labels, and detected task keywords use the requested course. |
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

The regression suite contains **30 tests** (with additional endpoint/error
subcases) and passed in both environments:

```text
Python 3.11.14: Ran 30 tests in 36.256s — OK
Python 3.10.6:  Ran 30 tests in 41.648s — OK
```

The live test invokes `run.py` from another directory and calls all core
inference endpoints over HTTP. Local observations:

| Runtime | Time to healthy HTTP | Model preload | Peak process-tree working set |
| --- | --- | --- | --- |
| Python 3.11.14 | 7.44 s | 1.846 s | 167.5 MiB |
| Python 3.10.6 | 7.52 s | 2.018 s | 161.8 MiB |

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
  sends and the receiver validates `X-ML-Callback-Token`. Caller code was
  inspected, and no Laravel code was modified for this update.
- Callbacks are best-effort background delivery with a socket timeout and no
  durable retry queue. Batch deadlines are checked between entries and cannot
  interrupt a native prediction call. Input size and concurrency are bounded.
- Missing course models allow the shared JOURNAL fallback, then rules if
  JOURNAL is also unavailable; readiness correctly remains degraded. Monitor the HTTP health status; systemd restarts on process failure
  alone do not detect degraded models. Artifact/registry updates require a
  reviewed release and restart.
- Stored classification artifacts and metrics were preserved; no models were
  retrained or re-evaluated against training datasets. JOURNAL was configured
  for all programs as requested; its stored BSIT training provenance does not
  establish accuracy for other programs. Joblib artifacts must remain trusted
  and read-only.
- GitHub's existing `feature/in-progress` branch diverges from the supplied local
  baseline and includes different ML artifacts. The tested local fixes are
  published on `fix/ml-production-inference`; the existing remote branch is
  preserved. Deploy `ml/` from that exact fix commit. Any later merge with the
  divergent branch needs model/code validation rather than replacing artifacts
  without testing.

No DNS, Nginx, firewall, VPS systemd installation, database or other-application
configuration was changed. This update reused ignored local validation
environments without installing software or changing global dependencies.
After repository review and deployment of the exact fix commit, the deployment
operator should restart only `internpulse-ml` and verify HTTP 200 with all twelve
models loaded. No remote deployment commands were run for this update.
