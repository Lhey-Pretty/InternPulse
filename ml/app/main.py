import os
import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import urllib.request
import urllib.error
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from .models.schemas import (
    SkillMatchRequest, SkillMatchResponse,
    RecommendInternshipsRequest, RecommendInternshipsResponse,
    JournalAnalysisRequest, JournalAnalysisResponse,
    LaravelJournalAnalyzeRequest,
    BatchJournalAnalysisRequest, BatchJournalAnalysisResponse,
    DualModelAnalysisResponse,
    JournalExplanationResponse,
    OptunaOptimizationRequest, OptunaOptimizationResponse,
    MetricsSummaryResponse,
)
from .services.matcher import calculate_skill_match
from .services.recommender import recommend_internships
from .services.nlp_classifier import analyze_journal_entry
from .services.model_manager import get_model_manager
from .services.batch_processor import process_journal_batch
from .services.ab_test_router import get_ab_test_router
from .services.explainability import explain_journal_prediction
from .services.hyperparameter_optimizer import optimize_hyperparameters

logger = logging.getLogger("internpulse_ml")

app = FastAPI(
    title="InternPulse ML Microservice",
    description="Machine learning API for skill matching, internship recommendations, journal analysis, and model governance.",
    version="2.0.0"
)

# Enable CORS for Laravel communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ML_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:8000,http://localhost:8000"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
MODELS_DIR = os.path.join(BASE_DIR, "models")
CURATED_SKILLS_PATH = os.path.join(DATASETS_DIR, "curated_skills.json")

_CURATED_SKILLS_CACHE = {}
_LAST_MTIME = 0

def load_curated_skills(force: bool = False):
    global _CURATED_SKILLS_CACHE, _LAST_MTIME
    if os.path.exists(CURATED_SKILLS_PATH):
        try:
            mtime = os.path.getmtime(CURATED_SKILLS_PATH)
            if force or mtime != _LAST_MTIME or not _CURATED_SKILLS_CACHE:
                with open(CURATED_SKILLS_PATH, 'r', encoding='utf-8') as f:
                    _CURATED_SKILLS_CACHE = json.load(f)
                _LAST_MTIME = mtime
        except Exception as e:
            logger.error(f"Failed to load curated skills: {e}")
    return _CURATED_SKILLS_CACHE


@app.on_event("startup")
async def startup_event():
    """Warm startup: load skill taxonomies and preload all trained models into memory."""
    load_curated_skills()
    manager = get_model_manager()
    counts = manager.preload_all()
    logger.info(f"Startup complete: Loaded {counts['sklearn']} sklearn and {counts['pytorch']} PyTorch models.")


@app.get("/")
def root():
    manager = get_model_manager()
    return {
        "status": "online",
        "service": "InternPulse ML Microservice v2.0",
        "model_status": manager.get_status(),
        "endpoints": [
            "/health",
            "/api/ml/skill-match",
            "/api/ml/recommend-internships",
            "/api/ml/analyze-journal",
            "/api/journal/analyze",
            "/api/ml/batch-analyze",
            "/api/ml/analyze-journal/dual",
            "/api/ml/explain",
            "/api/ml/models",
            "/api/ml/optimize-hyperparameters",
            "/api/ml/metrics/{program_code}",
        ]
    }


@app.get("/health")
def health():
    manager = get_model_manager()
    return {
        "status": "healthy",
        "cached_programs": list(load_curated_skills().keys()),
        "model_governance": manager.get_status(),
    }


# ----------------------------------------------------------------------
# 1. Core Endpoints
# ----------------------------------------------------------------------

@app.post("/api/ml/skill-match", response_model=SkillMatchResponse)
def skill_match_endpoint(request: SkillMatchRequest):
    """Calculate skill-based match score between student skills and job requirements."""
    try:
        return calculate_skill_match(
            student_skills_raw=request.student_skills,
            required_skills_raw=request.required_skills,
            optional_skills_raw=request.optional_skills
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/recommend-internships", response_model=RecommendInternshipsResponse)
def recommend_internships_endpoint(request: RecommendInternshipsRequest):
    """Rank and recommend the best internship postings for a student."""
    try:
        return recommend_internships(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/analyze-journal", response_model=JournalAnalysisResponse)
def analyze_journal_endpoint(request: JournalAnalysisRequest):
    """
    Unified NLP analysis of student journal entry.
    Uses an available trained classifier, then falls back to rule-based analysis.
    """
    try:
        return analyze_journal_entry(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 2. Laravel Backend Compatibility Endpoint
# ----------------------------------------------------------------------

async def _send_laravel_callback(callback_url: str, payload: Dict[str, Any]):
    """Background task to fire webhook callback to Laravel backend."""
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            callback_url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "InternPulse-ML/2.0",
                "X-ML-Callback-Token": os.getenv("ML_CALLBACK_TOKEN", ""),
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            logger.info(f"Callback delivered to {callback_url} with status {resp.status}")
    except Exception as e:
        logger.warning(f"Failed to deliver callback to {callback_url}: {e}")


@app.post("/api/journal/analyze")
async def laravel_journal_analyze_endpoint(
    request: LaravelJournalAnalyzeRequest,
    background_tasks: BackgroundTasks
):
    """
    Compatibility endpoint for Laravel JournalClassificationService.php.
    Accepts journal_entry_id and optional callback_url.
    """
    try:
        analysis_req = JournalAnalysisRequest(
            student_course=request.student_course,
            journal_text=request.journal_text,
        )
        result = analyze_journal_entry(analysis_req)

        response_payload = {
            "journal_entry_id": request.journal_entry_id,
            "is_course_related": result.is_course_related,
            "confidence_score": result.confidence_score,
            "detected_tasks": result.detected_tasks,
            "flag_level": result.flag_level,
            "feedback": result.feedback,
            "model_used": result.model_used,
        }

        # If callback URL was provided by Laravel, deliver asynchronously
        if request.callback_url:
            background_tasks.add_task(
                _send_laravel_callback,
                request.callback_url,
                response_payload
            )

        return response_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 3. High-Throughput Batch Predictions
# ----------------------------------------------------------------------

@app.post("/api/ml/batch-analyze", response_model=BatchJournalAnalysisResponse)
def batch_analyze_endpoint(request: BatchJournalAnalysisRequest):
    """Process high-throughput batches of 1,000+ journal entries."""
    try:
        return process_journal_batch(
            entries=request.entries,
            preferred_model=request.preferred_model,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 4. Dual-Model Mode & A/B Testing
# ----------------------------------------------------------------------

@app.post("/api/ml/analyze-journal/dual", response_model=DualModelAnalysisResponse)
def dual_model_analyze_endpoint(request: JournalAnalysisRequest):
    """
    Execute Rule-based and Machine Learning models concurrently on the same entry.
    Returns latency comparison, agreement evaluation, and confidence delta.
    """
    try:
        router = get_ab_test_router()
        return router.run_dual_comparison(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 5. Model Interpretability & Explainability
# ----------------------------------------------------------------------

@app.post("/api/ml/explain", response_model=JournalExplanationResponse)
def explain_journal_endpoint(request: JournalAnalysisRequest):
    """
    Explain journal prediction with token/feature attribution and rationale.
    """
    try:
        return explain_journal_prediction(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 6. Model Governance & Versioning
# ----------------------------------------------------------------------

@app.get("/api/ml/models")
def list_models_endpoint(program_code: Optional[str] = None):
    """List all registered model versions and active deployments."""
    manager = get_model_manager()
    models = manager.registry.list_models(program_code=program_code)
    summary = manager.registry.get_summary()
    return {
        "summary": summary,
        "models": models,
    }


@app.post("/api/ml/models/{program_code}/activate")
def activate_model_endpoint(
    program_code: str,
    model_type: str,
    version: int,
):
    """Promote or roll back a specific model version to production."""
    manager = get_model_manager()
    success = manager.registry.activate_version(
        program_code=program_code.upper(),
        model_type=model_type,
        version=version,
    )
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Model version {version} ({model_type}) for {program_code} not found."
        )

    # Invalidate memory cache so newly activated version is loaded
    manager.clear_cache(program_code)
    return {"status": "success", "message": f"Activated {model_type} v{version} for {program_code.upper()}"}


# ----------------------------------------------------------------------
# 8. Model evaluation
# ----------------------------------------------------------------------

@app.post("/api/ml/optimize-hyperparameters", response_model=OptunaOptimizationResponse)
def optimize_hyperparameters_endpoint(request: OptunaOptimizationRequest):
    """Evaluate sklearn hyperparameters against the local dataset snapshot."""
    try:
        result = optimize_hyperparameters(
            program_code=request.program_code,
            n_trials=request.n_trials,
        )
        return OptunaOptimizationResponse(
            program_code=result["program_code"],
            optimizer=result.get("optimizer", "grid_search"),
            n_trials_completed=result["n_trials_completed"],
            best_params=result["best_params"],
            best_score=result["best_score"],
            metric_name=result["metric_name"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------
# 9. Evaluation Curves & Analytics
# ----------------------------------------------------------------------

@app.get("/api/ml/metrics/{program_code}", response_model=MetricsSummaryResponse)
def get_program_metrics_endpoint(program_code: str):
    """
    Retrieve confusion matrix, ROC-AUC curves, calibration curves, and per-class metrics.
    """
    clean_code = program_code.upper().replace(" ", "").replace("-", "_")
    metrics_path = Path(MODELS_DIR) / f"{clean_code.lower()}_metrics.json"

    if not metrics_path.exists():
        # Check pytorch results
        py_path = Path(MODELS_DIR) / clean_code.lower() / "pytorch_results.json"
        if py_path.exists():
            with open(py_path, "r", encoding="utf-8") as f:
                py_data = json.load(f)
            m = py_data["metrics"]
            return MetricsSummaryResponse(
                program_code=clean_code,
                model_type="pytorch",
                accuracy=m["accuracy"],
                f1_score=m["f1_score"],
                precision=m["precision"],
                recall=m["recall"],
                class_names=m["class_names"],
                confusion_matrix=m["confusion_matrix"],
                per_class_metrics=m["per_class_metrics"],
                roc_auc_curves=m.get("roc_auc_curves"),
                calibration_data=m.get("calibration_data"),
            )

        raise HTTPException(
            status_code=404,
            detail=f"No metrics found for program {program_code}. Please train a model first."
        )

    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    perf = data.get("model_performance", {})
    return MetricsSummaryResponse(
        program_code=clean_code,
        model_type=data.get("model_type", "sklearn"),
        accuracy=perf.get("accuracy", 0.0),
        f1_score=perf.get("weighted_f1", 0.0),
        precision=perf.get("weighted_precision", 0.0),
        recall=perf.get("weighted_recall", 0.0),
        class_names=data.get("class_names", []),
        confusion_matrix=data.get("confusion_matrix", []),
        per_class_metrics=data.get("class_distribution", {}),
        roc_auc_curves=data.get("roc_curves"),
        calibration_data=data.get("calibration_data"),
    )


@app.get("/api/ml/skills-by-course/{course_code}")
def get_skills_by_course(course_code: str):
    """Retrieve curated O*NET & HuggingFace skills for a specific school program."""
    skills = load_curated_skills()
    code_normalized = course_code.upper().replace(' ', '').replace('-', '')
    if code_normalized in skills:
        return {
            "course": code_normalized,
            "total_skills": len(skills[code_normalized]),
            "skills": skills[code_normalized]
        }

    for k in skills:
        if code_normalized in k or k in code_normalized:
            return {
                "course": k,
                "total_skills": len(skills[k]),
                "skills": skills[k]
            }

    raise HTTPException(
        status_code=404,
        detail=f"Course '{course_code}' not found. Available programs: {list(skills.keys())}"
    )
