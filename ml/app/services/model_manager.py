"""Read-only, trusted sklearn inference models with explicit readiness status."""

import logging
import time
import warnings
from pathlib import Path
from typing import Dict, Optional, Tuple

import joblib
import numpy as np
from sklearn.exceptions import InconsistentVersionWarning
from sklearn.pipeline import Pipeline

from ..config import MODELS_DIR, DATASETS_DIR
from ..models.schemas import JournalAnalysisRequest, JournalAnalysisResponse, SUPPORTED_COURSES
from .model_registry import ModelRegistry

logger = logging.getLogger(__name__)


class ModelManager:
    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = (Path(models_dir) if models_dir else MODELS_DIR).resolve()
        self.registry = ModelRegistry(self.models_dir)
        self._sklearn_models: Dict[str, object] = {}
        self._load_errors: Dict[str, str] = {}
        self._startup_complete = False
        self.startup_seconds = 0.0

    def _model_path(self, program_code: str) -> Path:
        active = self.registry.get_active_model(program_code, "sklearn")
        candidate = Path(active.model_path) if active and active.model_path else Path(f"{program_code.lower()}_classifier.joblib")
        path = (self.models_dir / candidate).resolve()
        if not path.is_relative_to(self.models_dir) or path.suffix != ".joblib":
            raise ValueError("Model path must be a joblib file inside the models directory")
        return path

    @staticmethod
    def _validate_model(model):
        if not isinstance(model, Pipeline) or not callable(getattr(model, "predict_proba", None)):
            raise ValueError("Expected a fitted sklearn classification pipeline")
        classes = {str(label) for label in model.classes_}
        if not classes or not classes.issubset({"course_related", "errand", "unrelated"}):
            raise ValueError("Unsupported classifier labels")
        prediction = str(model.predict(["Internship model readiness check"])[0])
        probabilities = np.asarray(model.predict_proba(["Internship model readiness check"])[0])
        if (prediction not in classes or probabilities.shape != (len(classes),)
                or not np.isfinite(probabilities).all()
                or np.any(probabilities < 0) or np.any(probabilities > 1)
                or not np.isclose(probabilities.sum(), 1)):
            raise ValueError("Classifier inference validation failed")

    def preload_all(self) -> Dict[str, int]:
        start = time.perf_counter()
        self._startup_complete = False
        self._sklearn_models.clear()
        self._load_errors.clear()
        for program_code in sorted(SUPPORTED_COURSES):
            try:
                path = self._model_path(program_code)
                if not path.is_file():
                    self._load_errors[program_code] = "missing"
                    logger.error("Missing inference model for %s", program_code)
                    continue
                with warnings.catch_warnings():
                    warnings.simplefilter("error", InconsistentVersionWarning)
                    model = joblib.load(path)
                self._validate_model(model)
                self._sklearn_models[program_code] = model
                logger.info("Loaded and validated sklearn inference model for %s", program_code)
            except Exception:
                self._load_errors[program_code] = "load_failed"
                logger.exception("Failed to load inference model for %s", program_code)
        self.startup_seconds = round(time.perf_counter() - start, 3)
        self._startup_complete = True
        counts = {"sklearn": len(self._sklearn_models), "pytorch": 0}
        logger.info("Model startup: sklearn=%s expected=%s failures=%s elapsed=%.3fs",
                    counts["sklearn"], len(SUPPORTED_COURSES), len(self._load_errors), self.startup_seconds)
        return counts

    def get_sklearn_model(self, program_code: str) -> Optional[object]:
        # Artifacts stay fixed for the life of a worker; publish a release and restart to update.
        return self._sklearn_models.get(program_code.upper())

    def get_pytorch_model(self, program_code: str):
        # Preserve compatibility for callers; production never imports torch/transformers.
        return None, None

    def predict_with_fallback(self, request: JournalAnalysisRequest, preferred_model: Optional[str] = None) -> Tuple[JournalAnalysisResponse, str]:
        program_code = request.student_course
        if preferred_model != "rules":
            try:
                result, model_type = self._predict_sklearn(request, program_code)
                if result is not None:
                    return result, model_type
            except Exception:
                self._sklearn_models.pop(program_code, None)
                self._load_errors[program_code] = "prediction_failed"
                logger.exception("Sklearn prediction failed for %s; using rules", program_code)
        from .nlp_classifier import _analyze_with_rules
        return _analyze_with_rules(request), "rules"

    def _predict_pytorch(self, request: JournalAnalysisRequest, program_code: str):
        return None, "pytorch"

    def _predict_sklearn(self, request: JournalAnalysisRequest, program_code: str):
        model = self.get_sklearn_model(program_code)
        if model is None:
            return None, "sklearn"
        text = request.journal_text.strip()
        prediction = str(model.predict([text])[0])
        confidence = round(float(max(model.predict_proba([text])[0])), 2)
        from .nlp_classifier import _detect_course_tasks
        detected_tasks = _detect_course_tasks(text.lower(), program_code)
        if prediction == "course_related":
            is_course_related = True
            flag_level = "Normal"
            feedback = f"ML model classified this entry as aligned with {request.student_course} activities."
        elif prediction == "errand":
            is_course_related = False
            flag_level = "Warning - Errand / Administrative"
            feedback = "ML model flagged this entry as an errand or administrative activity."
        else:
            is_course_related = False
            flag_level = "Unrelated"
            feedback = f"ML model found no clear {request.student_course} internship activity in this entry."
        return JournalAnalysisResponse(
            is_course_related=is_course_related, confidence_score=confidence,
            detected_tasks=detected_tasks, flag_level=flag_level, feedback=feedback,
        ), "sklearn"

    def get_status(self) -> Dict:
        programs = sorted(self._sklearn_models)
        missing = sorted(SUPPORTED_COURSES - set(programs))
        ready = self._startup_complete and not missing and not self.registry.load_failed
        return {
            "startup_complete": self._startup_complete,
            "ready": ready,
            "sklearn_models_loaded": len(programs),
            "sklearn_programs": programs,
            "pytorch_models_loaded": 0,
            "pytorch_programs": [],
            "expected_models": len(SUPPORTED_COURSES),
            "missing_programs": missing,
            "failed_programs": dict(self._load_errors),
            "registry_load_failed": self.registry.load_failed,
            "startup_seconds": self.startup_seconds,
            "registry_summary": self.registry.get_summary(),
        }

    def clear_cache(self, program_code: Optional[str] = None):
        if program_code:
            self._sklearn_models.pop(program_code.upper(), None)
        else:
            self._sklearn_models.clear()
        self._startup_complete = False


_model_manager: Optional[ModelManager] = None


def get_model_manager() -> ModelManager:
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager
