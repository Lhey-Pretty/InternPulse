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

# Runtime model identifiers are separate from student course identifiers.
REQUIRED_MODEL_CODES = frozenset(SUPPORTED_COURSES | {"JOURNAL"})


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
    def _validated_prediction(model, text):
        classes = [str(label) for label in model.classes_]
        if (not classes or len(classes) != len(set(classes))
                or not set(classes).issubset({"course_related", "errand", "unrelated"})):
            raise ValueError("Unsupported classifier labels")
        predictions = np.asarray(model.predict([text]))
        probabilities = np.asarray(model.predict_proba([text]))
        if (predictions.shape != (1,) or str(predictions[0]) not in classes
                or probabilities.shape != (1, len(classes))
                or not np.isfinite(probabilities).all()
                or np.any(probabilities < 0) or np.any(probabilities > 1)
                or not np.isclose(probabilities.sum(), 1)):
            raise ValueError("Classifier inference validation failed")
        return str(predictions[0]), round(float(max(probabilities[0])), 2)

    @classmethod
    def _validate_model(cls, model):
        if not isinstance(model, Pipeline) or not callable(getattr(model, "predict_proba", None)):
            raise ValueError("Expected a fitted sklearn classification pipeline")
        cls._validated_prediction(model, "Internship model readiness check")

    def preload_all(self) -> Dict[str, int]:
        start = time.perf_counter()
        self._startup_complete = False
        self._sklearn_models.clear()
        self._load_errors.clear()
        for program_code in sorted(REQUIRED_MODEL_CODES):
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
                    counts["sklearn"], len(REQUIRED_MODEL_CODES), len(self._load_errors), self.startup_seconds)
        return counts

    def get_sklearn_model(self, program_code: str) -> Optional[object]:
        # Artifacts stay fixed for the life of a worker; publish a release and restart to update.
        return self._sklearn_models.get(program_code.upper())

    def get_pytorch_model(self, program_code: str):
        # Preserve compatibility for callers; production never imports torch/transformers.
        return None, None

    @staticmethod
    def _prediction_model_codes(program_code: str):
        # Preserve course-specific predictions; JOURNAL is the shared second choice.
        course = program_code.upper()
        return (course, "JOURNAL") if course in SUPPORTED_COURSES else ()

    def get_prediction_model_code(self, program_code: str) -> Optional[str]:
        return next((code for code in self._prediction_model_codes(program_code)
                     if code in self._sklearn_models), None)

    def predict_with_fallback(self, request: JournalAnalysisRequest, preferred_model: Optional[str] = None) -> Tuple[JournalAnalysisResponse, str]:
        if preferred_model != "rules":
            for model_code in self._prediction_model_codes(request.student_course):
                try:
                    result, model_type = self._predict_sklearn(request, model_code)
                    if result is not None:
                        return result, model_type
                except Exception:
                    self._sklearn_models.pop(model_code, None)
                    self._load_errors[model_code] = "prediction_failed"
                    logger.exception("Sklearn prediction failed for %s; trying next fallback", model_code)
        from .nlp_classifier import _analyze_with_rules
        return _analyze_with_rules(request), "rules"

    def _predict_pytorch(self, request: JournalAnalysisRequest, program_code: str):
        return None, "pytorch"

    def _predict_sklearn(self, request: JournalAnalysisRequest, program_code: str):
        model = self.get_sklearn_model(program_code)
        if model is None:
            return None, "sklearn"
        text = request.journal_text.strip()
        prediction, confidence = self._validated_prediction(model, text)
        from .nlp_classifier import _detect_course_tasks
        detected_tasks = _detect_course_tasks(text.lower(), request.student_course)
        shared_fallback = program_code == "JOURNAL"
        if prediction == "course_related":
            is_course_related = True
            flag_level = "Normal"
            feedback = ("Shared JOURNAL fallback classified this entry as course-related."
                        if shared_fallback else
                        f"ML model classified this entry as aligned with {request.student_course} activities.")
        elif prediction == "errand":
            is_course_related = False
            flag_level = "Warning - Errand / Administrative"
            feedback = ("Shared JOURNAL fallback flagged this entry as an errand or administrative activity."
                        if shared_fallback else
                        "ML model flagged this entry as an errand or administrative activity.")
        else:
            is_course_related = False
            flag_level = "Unrelated"
            feedback = ("Shared JOURNAL fallback found no clear internship activity in this entry."
                        if shared_fallback else
                        f"ML model found no clear {request.student_course} internship activity in this entry.")
        return JournalAnalysisResponse(
            is_course_related=is_course_related, confidence_score=confidence,
            detected_tasks=detected_tasks, flag_level=flag_level, feedback=feedback,
        ), "sklearn"

    def get_status(self) -> Dict:
        programs = sorted(self._sklearn_models)
        missing = sorted(REQUIRED_MODEL_CODES - set(programs))
        ready = self._startup_complete and not missing and not self.registry.load_failed
        return {
            "startup_complete": self._startup_complete,
            "ready": ready,
            "sklearn_models_loaded": len(programs),
            "sklearn_programs": programs,
            "pytorch_models_loaded": 0,
            "pytorch_programs": [],
            "expected_models": len(REQUIRED_MODEL_CODES),
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
