# Production inference changes

All changes are confined to `ml/`. The repository is the InternPulse monorepo;
unrelated frontend/backend working changes are excluded from this release.
No model artifacts were retrained and no VPS settings were changed.

| Changed file | Production blocker or resulting behavior |
| --- | --- |
| `run.py` | Removes reload and sibling Laravel `.env` guessing; loopback, configurable `ML_PORT` default 8002, one worker, bounded Uvicorn concurrency and numerical-library threads; absolute app location. |
| `app/config.py` | Central absolute model/dataset paths and explicit origin parsing; browser origins empty by default and wildcard origins rejected. |
| `app/main.py` | Inference-only lifespan; useful 200/503 readiness; safe error/validation responses; no eager optimizer import; protected model-list route and disabled optimizer/activation; sync thread-pool Laravel inference/callback; forwards explicit rules preference; validated metric/course paths; BOM-tolerant JSON resources. |
| `app/security.py` | Constant-time admin/callback request authentication using environment secrets; exact trusted callback URL allowlist with unsafe URL forms rejected. |
| `app/request_limits.py` | Streaming 1 MiB body cap, ten-second body timeout and four concurrent requests including callbacks; health bypasses application admission limit. |
| `app/models/schemas.py` | Bounded journals, skill lists, postings, aggregate batch text and identifiers; shared course validation across journal/Laravel/batch requests; validated model preference. Successful response models retained. |
| `app/services/model_manager.py` | Loads twelve trusted sklearn pipelines, including shared JOURNAL; validates startup and runtime inference and sklearn version; honors portable active registry paths; no auto-registration, writes or PyTorch imports; fixed in-memory release artifacts; missing/corrupt/prediction-failed models degrade readiness; every course tries its own classifier, JOURNAL, then rules. |
| `app/services/explainability.py` | Uses the selected primary/shared classifier for feature weights and aligns binary coefficient signs with course-related labels; rules requests use heuristic attribution. |
| `app/services/nlp_classifier.py` | Documents the production course/JOURNAL/rules hierarchy; existing BSIT technical-work correction retained. |
| `app/services/model_registry.py` | Validates loaded metadata, reports corrupt registries, accepts UTF-8 BOM; nonexistent offline activation versions no longer deactivate existing entries in memory. |
| `app/services/matcher.py` | Loads inference taxonomy with BOM-tolerant UTF-8 decoding. Matching behavior retained. |
| `app/services/ab_test_router.py` | Dual analysis uses the production manager's safe sklearn/rules fallback, including failure tracking. |
| `app/services/batch_processor.py` | Fifty-entry/aggregate-text guard, cooperative fifteen-second deadline, controlled per-entry errors and positive chunk validation. |
| `models/model_registry.json` | Converts machine-specific Windows artifact paths to filenames relative to `models/`; retains version/metrics metadata. |
| `requirements.txt` | Pins compatible inference runtime and transitive dependencies, including artifact-compatible sklearn 1.7.2, NumPy/SciPy and joblib; no training packages. |
| `requirements-training.txt` | Keeps offline-only dependencies separate and includes Optuna for offline optimization. |
| `requirements-test.txt` | Adds isolated HTTP test dependency without making it a production requirement. |
| `.gitignore` | Ignores private environment files, keys, caches, local interpreters and validation virtual environments. No generated credentials are included. |
| `.gitattributes` | Keeps the Linux systemd template in LF format on Windows checkouts. |
| `deploy/internpulse-ml.service` | Placeholder-only dedicated service, environment file, one worker on loopback, automatic restart, journald and read-only runtime hardening. |
| `README.md` | Supported Python/runtime setup, resource requirements, API/limits, required callback headers, systemd handoff, logging/rollback, capacity estimates and explicit offline-training warning. |
| `tests/test_production.py` | Endpoint contracts, input limits, callback/admin authentication, safe failures, corrupted/missing/wrong-type models, registry path containment, no training dependencies, no reload and middleware timeout/overload checks. |
| `tests/test_journal_runtime.py` | Thirteen regression tests covering 12-model readiness, shared fallback across every course and journal flow, primary/rules preferences, invalid/missing/corrupt/version-mismatched JOURNAL, failures, explanations, and unchanged artifacts. |
| `tests/test_live_startup.py` | Real production launch from another working directory on an unused loopback port, all core inference calls, startup/log checks and local resource observation. |
| `deploy/VALIDATION.md` | Exact checks, local runtime results and remaining deployment/integration limitations. |
| `deploy/CHANGELOG.md` | Complete file-level diff summary and production-safety contract changes. |

Callback authentication and request limits are intentional production-safety
tightenings. The Laravel callback payload remains unchanged. The deployment
assistant must confirm the caller and receiver use the documented shared-token
header before enabling callbacks. Live optimization/activation are permanently
unavailable; publish reviewed offline model releases instead.

The JOURNAL runtime extension preserves all model artifacts and registry bytes.
Its existing metadata references BSIT training data; using it as a shared
fallback does not establish accuracy on other programs.
