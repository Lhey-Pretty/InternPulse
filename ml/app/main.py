"""InternPulse inference API. Offline training is deliberately unavailable here."""

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Dict, Optional
import urllib.request
import urllib.error

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Header, Query, Path as ApiPath
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import BASE_DIR, DATASETS_DIR, MODELS_DIR, allowed_origins
from .request_limits import RequestLimitsMiddleware
from .security import require_admin, validate_callback
from .models.schemas import (
    SkillMatchRequest, SkillMatchResponse,
    RecommendInternshipsRequest, RecommendInternshipsResponse,
    JournalAnalysisRequest, JournalAnalysisResponse, LaravelJournalAnalyzeRequest,
    BatchJournalAnalysisRequest, BatchJournalAnalysisResponse, DualModelAnalysisResponse,
    JournalExplanationResponse, OptunaOptimizationRequest, OptunaOptimizationResponse,
    MetricsSummaryResponse,
)
from .services.matcher import calculate_skill_match
from .services.recommender import recommend_internships
from .services.nlp_classifier import analyze_journal_entry
from .services.model_manager import get_model_manager
from .services.batch_processor import process_journal_batch
from .services.ab_test_router import get_ab_test_router
from .services.explainability import explain_journal_prediction

logger = logging.getLogger("internpulse_ml")
CURATED_SKILLS_PATH = DATASETS_DIR / "curated_skills.json"
_CURATED_SKILLS_CACHE = {}
_DATASETS_READY = False
ProgramPath = Annotated[str, ApiPath(min_length=1, max_length=40, pattern=r"^[A-Za-z0-9_ -]+$")]


def load_curated_skills(force: bool = False):
    global _CURATED_SKILLS_CACHE
    if force or not _CURATED_SKILLS_CACHE:
        try:
            with CURATED_SKILLS_PATH.open(encoding="utf-8-sig") as file:
                skills = json.load(file)
            if not isinstance(skills, dict) or not skills or not all(isinstance(k, str) and isinstance(v, list) for k, v in skills.items()):
                raise ValueError("Invalid curated skills mapping")
            _CURATED_SKILLS_CACHE = skills
        except Exception:
            _CURATED_SKILLS_CACHE = {}
            logger.exception("Failed to load curated skills")
    return _CURATED_SKILLS_CACHE


@asynccontextmanager
async def lifespan(app):
    global _DATASETS_READY
    _DATASETS_READY = False
    skills = load_curated_skills(force=True)
    try:
        with (DATASETS_DIR / "processed" / "onet_taxonomy.json").open(encoding="utf-8-sig") as file:
            taxonomy = json.load(file)
        if not isinstance(taxonomy, dict) or not isinstance(taxonomy.get("skills"), list):
            raise ValueError("Invalid skills taxonomy")
        _DATASETS_READY = bool(skills)
    except Exception:
        logger.exception("Failed to load inference skills taxonomy")
    counts = get_model_manager().preload_all()
    logger.info("Inference startup complete: sklearn=%s pytorch=%s datasets_ready=%s",
                counts["sklearn"], counts["pytorch"], _DATASETS_READY)
    yield


app = FastAPI(
    title="InternPulse ML Microservice",
    description="Inference-only skill matching, recommendations and journal analysis.",
    version="2.0.0", lifespan=lifespan,
)
app.add_middleware(RequestLimitsMiddleware)
app.add_middleware(
    CORSMiddleware, allow_origins=allowed_origins(), allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-ML-Callback-Token", "X-ML-Admin-Token"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    # Omit submitted values and internal validation context from error responses.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
        for error in exc.errors()
    ]})


@app.exception_handler(Exception)
async def internal_error_handler(request, exc):
    logger.error("Unhandled inference error (%s)", type(exc).__name__, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal inference error"})


@app.get("/")
def root():
    status = get_model_manager().get_status()
    return {
        "status": "online" if status["ready"] and _DATASETS_READY else "degraded",
        "service": "InternPulse ML Microservice v2.0",
        "model_status": status,
        "endpoints": [
            "/health", "/api/ml/skill-match", "/api/ml/recommend-internships",
            "/api/ml/analyze-journal", "/api/journal/analyze", "/api/ml/batch-analyze",
            "/api/ml/analyze-journal/dual", "/api/ml/explain", "/api/ml/models",
            "/api/ml/metrics/{program_code}",
        ],
    }


@app.get("/health")
def health():
    status = get_model_manager().get_status()
    ready = status["ready"] and _DATASETS_READY
    return JSONResponse(status_code=200 if ready else 503, content={
        "status": "healthy" if ready else "degraded",
        "cached_programs": sorted(_CURATED_SKILLS_CACHE),
        "model_governance": status,
        "datasets_ready": _DATASETS_READY,
    })


@app.post("/api/ml/skill-match", response_model=SkillMatchResponse)
def skill_match_endpoint(request: SkillMatchRequest):
    return calculate_skill_match(
        student_skills_raw=request.student_skills, required_skills_raw=request.required_skills,
        optional_skills_raw=request.optional_skills,
    )


@app.post("/api/ml/recommend-internships", response_model=RecommendInternshipsResponse)
def recommend_internships_endpoint(request: RecommendInternshipsRequest):
    return recommend_internships(request)


@app.post("/api/ml/analyze-journal", response_model=JournalAnalysisResponse)
def analyze_journal_endpoint(request: JournalAnalysisRequest):
    return analyze_journal_entry(request)


class _NoCallbackRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _send_laravel_callback(callback_url: str, payload: Dict[str, Any]):
    """Run blocking callback I/O in FastAPI's background thread pool."""
    try:
        req = urllib.request.Request(
            callback_url, data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json", "User-Agent": "InternPulse-ML/2.0",
                "X-ML-Callback-Token": os.environ["ML_CALLBACK_TOKEN"],
            }, method="POST",
        )
        # Ignore proxy environment variables and never forward the token on redirects.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoCallbackRedirects())
        with opener.open(req, timeout=10.0) as response:
            logger.info("Laravel callback delivered: status=%s", response.status)
    except urllib.error.HTTPError as exc:
        logger.warning("Laravel callback rejected: status=%s", exc.code)
    except Exception as exc:
        logger.warning("Laravel callback failed (%s)", type(exc).__name__)


@app.post("/api/journal/analyze")
def laravel_journal_analyze_endpoint(
    request: LaravelJournalAnalyzeRequest, background_tasks: BackgroundTasks,
    x_ml_callback_token: Optional[str] = Header(default=None, max_length=512),
):
    if request.callback_url is not None:
        validate_callback(request.callback_url, x_ml_callback_token)
    result = analyze_journal_entry(JournalAnalysisRequest(
        student_course=request.student_course, journal_text=request.journal_text,
    ))
    payload = {
        "journal_entry_id": request.journal_entry_id, "is_course_related": result.is_course_related,
        "confidence_score": result.confidence_score, "detected_tasks": result.detected_tasks,
        "flag_level": result.flag_level, "feedback": result.feedback, "model_used": result.model_used,
    }
    if request.callback_url:
        background_tasks.add_task(_send_laravel_callback, request.callback_url, payload)
    return payload


@app.post("/api/ml/batch-analyze", response_model=BatchJournalAnalysisResponse)
def batch_analyze_endpoint(request: BatchJournalAnalysisRequest):
    return process_journal_batch(entries=request.entries, preferred_model=request.preferred_model)


@app.post("/api/ml/analyze-journal/dual", response_model=DualModelAnalysisResponse)
def dual_model_analyze_endpoint(request: JournalAnalysisRequest):
    return get_ab_test_router().run_dual_comparison(request)


@app.post("/api/ml/explain", response_model=JournalExplanationResponse)
def explain_journal_endpoint(request: JournalAnalysisRequest):
    return explain_journal_prediction(request)


@app.get("/api/ml/models", dependencies=[Depends(require_admin)])
def list_models_endpoint(program_code: Optional[str] = Query(default=None, max_length=40, pattern=r"^[A-Za-z0-9_ -]+$")):
    manager = get_model_manager()
    return {"summary": manager.registry.get_summary(), "models": manager.registry.list_models(program_code=program_code)}


@app.post("/api/ml/models/{program_code}/activate")
def activate_model_endpoint(program_code: ProgramPath, model_type: str, version: int = Query(ge=1)):
    raise HTTPException(403, "Model activation is disabled on the inference service; deploy a reviewed model release")


@app.post("/api/ml/optimize-hyperparameters", response_model=OptunaOptimizationResponse)
def optimize_hyperparameters_endpoint(request: OptunaOptimizationRequest):
    raise HTTPException(403, "Hyperparameter optimization is disabled on the inference service; run it offline")


@app.get("/api/ml/metrics/{program_code}", response_model=MetricsSummaryResponse)
def get_program_metrics_endpoint(program_code: ProgramPath):
    clean_code = program_code.upper().replace(" ", "").replace("-", "_")
    metrics_path = MODELS_DIR / f"{clean_code.lower()}_metrics.json"
    if not metrics_path.is_file():
        py_path = MODELS_DIR / clean_code.lower() / "pytorch_results.json"
        if not py_path.is_file():
            raise HTTPException(404, "No metrics found for this program")
        with py_path.open(encoding="utf-8-sig") as file:
            metrics = json.load(file)["metrics"]
        return MetricsSummaryResponse(program_code=clean_code, model_type="pytorch",
            **{key: metrics[key] for key in ("accuracy", "f1_score", "precision", "recall", "class_names", "confusion_matrix", "per_class_metrics")},
            roc_auc_curves=metrics.get("roc_auc_curves"), calibration_data=metrics.get("calibration_data"))
    with metrics_path.open(encoding="utf-8-sig") as file:
        data = json.load(file)
    perf = data.get("model_performance", {})
    return MetricsSummaryResponse(
        program_code=clean_code, model_type=data.get("model_type", "sklearn"),
        accuracy=perf.get("accuracy", 0.0), f1_score=perf.get("weighted_f1", 0.0),
        precision=perf.get("weighted_precision", 0.0), recall=perf.get("weighted_recall", 0.0),
        class_names=data.get("class_names", []), confusion_matrix=data.get("confusion_matrix", []),
        per_class_metrics=data.get("class_distribution", {}), roc_auc_curves=data.get("roc_curves"),
        calibration_data=data.get("calibration_data"),
    )


@app.get("/api/ml/skills-by-course/{course_code}")
def get_skills_by_course(course_code: ProgramPath):
    skills = load_curated_skills()
    normalized = course_code.upper().replace(" ", "").replace("-", "")
    if normalized in skills:
        return {"course": normalized, "total_skills": len(skills[normalized]), "skills": skills[normalized]}
    for code in skills:
        if normalized in code or code in normalized:
            return {"course": code, "total_skills": len(skills[code]), "skills": skills[code]}
    raise HTTPException(404, "Course not found")
