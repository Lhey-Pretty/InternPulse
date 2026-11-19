"""
Model Manager — Central hub for loading, caching, and serving ML models.

Manages the lifecycle of all model types (sklearn, PyTorch, rules) and
provides a unified prediction interface with a structured fallback chain:

    PyTorch (highest accuracy) → sklearn TF-IDF → Rule-based (always available)
"""

import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib

from ..models.schemas import JournalAnalysisRequest, JournalAnalysisResponse
from .model_registry import ModelRegistry

logger = logging.getLogger(__name__)

# Resolve paths
_ML_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = _ML_ROOT / "models"
DATASETS_DIR = _ML_ROOT / "datasets"


class ModelManager:
    """
    Central model management service.

    Handles:
    - Preloading all available models at startup (warm loading)
    - In-memory caching with lazy loading fallback
    - Structured fallback chain for predictions
    - Model version tracking via ModelRegistry
    """

    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir) if models_dir else MODELS_DIR
        self.registry = ModelRegistry(self.models_dir)

        # In-memory model caches
        self._sklearn_models: Dict[str, object] = {}
        self._pytorch_models: Dict[str, object] = {}
        self._pytorch_label_maps: Dict[str, Dict[int, str]] = {}

        # Load tracking
        self._load_attempted: Dict[str, bool] = {}
        self._startup_complete = False

    # ------------------------------------------------------------------
    # Startup / Preloading
    # ------------------------------------------------------------------

    def preload_all(self) -> Dict[str, int]:
        """
        Preload all available models into memory at startup.

        Returns:
            Dict with counts of loaded models by type
        """
        start = time.time()
        counts = {"sklearn": 0, "pytorch": 0}

        # Load sklearn models
        counts["sklearn"] = self._load_all_sklearn_models()

        # Load PyTorch models
        counts["pytorch"] = self._load_all_pytorch_models()

        elapsed = time.time() - start
        self._startup_complete = True

        logger.info(
            f"Model preloading complete in {elapsed:.2f}s — "
            f"sklearn: {counts['sklearn']}, pytorch: {counts['pytorch']}"
        )

        return counts

    def _load_all_sklearn_models(self) -> int:
        """Load all sklearn .joblib models from the models directory."""
        count = 0
        for path in self.models_dir.glob("*_classifier.joblib"):
            program_code = path.stem.replace("_classifier", "").upper()
            try:
                model = joblib.load(path)
                self._sklearn_models[program_code] = model
                self._load_attempted[f"sklearn_{program_code}"] = True
                count += 1
                logger.info(f"Loaded sklearn model for {program_code}")

                # Auto-register in registry if not already tracked
                if self.registry.get_active_model(program_code, "sklearn") is None:
                    # Try to load metrics for accuracy info
                    metrics_path = self.models_dir / f"{program_code.lower()}_metrics.json"
                    accuracy = 0.0
                    if metrics_path.exists():
                        import json
                        with open(metrics_path, "r", encoding="utf-8") as f:
                            metrics = json.load(f)
                        accuracy = metrics.get("model_performance", {}).get("accuracy", 0.0)

                    self.registry.register_model(
                        program_code=program_code,
                        model_type="sklearn",
                        accuracy=accuracy,
                        model_path=str(path),
                    )

            except Exception as e:
                logger.warning(f"Failed to load sklearn model {path.name}: {e}")
                self._load_attempted[f"sklearn_{program_code}"] = True

        return count

    def _load_all_pytorch_models(self) -> int:
        """Load all PyTorch models from subdirectories."""
        count = 0

        for model_dir in self.models_dir.iterdir():
            if not model_dir.is_dir():
                continue

            config_path = model_dir / "config.json"
            model_bin_path = model_dir / "pytorch_model.bin"

            if not config_path.exists() or not model_bin_path.exists():
                continue

            program_code = model_dir.name.upper()
            try:
                from ..models.pytorch.model import JournalClassificationModel
                import json

                with open(config_path, "r") as f:
                    config = json.load(f)

                model = JournalClassificationModel.load_model(
                    model_dir,
                    num_classes=config.get("num_classes", 3),
                )
                self._pytorch_models[program_code] = model

                # Load label map if available
                results_path = model_dir / "pytorch_results.json"
                if results_path.exists():
                    with open(results_path, "r", encoding="utf-8") as f:
                        results = json.load(f)
                    # Reconstruct reverse label map from class distribution
                    class_dist = results.get("dataset", {}).get("class_distribution", {})
                    if class_dist:
                        sorted_labels = sorted(class_dist.keys())
                        self._pytorch_label_maps[program_code] = {
                            i: label for i, label in enumerate(sorted_labels)
                        }

                self._load_attempted[f"pytorch_{program_code}"] = True
                count += 1
                logger.info(f"Loaded PyTorch model for {program_code}")

                # Auto-register in registry
                if self.registry.get_active_model(program_code, "pytorch") is None:
                    accuracy = 0.0
                    if results_path.exists():
                        accuracy = results.get("metrics", {}).get("accuracy", 0.0)

                    self.registry.register_model(
                        program_code=program_code,
                        model_type="pytorch",
                        accuracy=accuracy,
                        model_path=str(model_dir),
                    )

            except Exception as e:
                logger.warning(f"Failed to load PyTorch model from {model_dir.name}: {e}")
                self._load_attempted[f"pytorch_{program_code}"] = True

        return count

    # ------------------------------------------------------------------
    # Model Access
    # ------------------------------------------------------------------

    def get_sklearn_model(self, program_code: str) -> Optional[object]:
        """Get a cached sklearn model, with lazy loading if not preloaded."""
        program_code = program_code.upper()

        if program_code in self._sklearn_models:
            return self._sklearn_models[program_code]

        # Lazy load if startup didn't find it
        cache_key = f"sklearn_{program_code}"
        if self._load_attempted.get(cache_key, False):
            return None

        self._load_attempted[cache_key] = True
        model_path = self.models_dir / f"{program_code.lower()}_classifier.joblib"

        if not model_path.exists():
            logger.debug(f"No sklearn model found for {program_code}")
            return None

        try:
            model = joblib.load(model_path)
            self._sklearn_models[program_code] = model
            logger.info(f"Lazy-loaded sklearn model for {program_code}")
            return model
        except Exception as e:
            logger.warning(f"Failed to lazy-load sklearn model for {program_code}: {e}")
            return None

    def get_pytorch_model(
        self, program_code: str
    ) -> Tuple[Optional[object], Optional[Dict[int, str]]]:
        """
        Get a cached PyTorch model and its label map.

        Returns:
            Tuple of (model or None, reverse_label_map or None)
        """
        program_code = program_code.upper()

        model = self._pytorch_models.get(program_code)
        label_map = self._pytorch_label_maps.get(program_code)

        if model is not None:
            return model, label_map

        # Lazy load
        cache_key = f"pytorch_{program_code}"
        if self._load_attempted.get(cache_key, False):
            return None, None

        self._load_attempted[cache_key] = True
        model_dir = self.models_dir / program_code.lower()

        if not (model_dir / "pytorch_model.bin").exists():
            logger.debug(f"No PyTorch model found for {program_code}")
            return None, None

        try:
            from ..models.pytorch.model import JournalClassificationModel
            import json

            with open(model_dir / "config.json", "r") as f:
                config = json.load(f)

            model = JournalClassificationModel.load_model(
                model_dir,
                num_classes=config.get("num_classes", 3),
            )
            self._pytorch_models[program_code] = model

            # Load label map
            results_path = model_dir / "pytorch_results.json"
            if results_path.exists():
                with open(results_path, "r", encoding="utf-8") as f:
                    results = json.load(f)
                class_dist = results.get("dataset", {}).get("class_distribution", {})
                if class_dist:
                    sorted_labels = sorted(class_dist.keys())
                    label_map = {i: label for i, label in enumerate(sorted_labels)}
                    self._pytorch_label_maps[program_code] = label_map

            logger.info(f"Lazy-loaded PyTorch model for {program_code}")
            return model, label_map

        except Exception as e:
            logger.warning(f"Failed to lazy-load PyTorch model for {program_code}: {e}")
            return None, None

    # ------------------------------------------------------------------
    # Prediction with Fallback Chain
    # ------------------------------------------------------------------

    def predict_with_fallback(
        self,
        request: JournalAnalysisRequest,
        preferred_model: Optional[str] = None,
    ) -> Tuple[JournalAnalysisResponse, str]:
        """
        Predict using the structured fallback chain:
            PyTorch → sklearn → rules

        Args:
            request: Journal analysis request
            preferred_model: Force a specific model type ("pytorch", "sklearn", "rules")

        Returns:
            Tuple of (response, model_type_used)
        """
        program_code = request.student_course.upper().replace(" ", "").replace("-", "_")

        # If a specific model is preferred, try only that
        if preferred_model:
            return self._predict_with_type(request, program_code, preferred_model)

        # Fallback chain: PyTorch → sklearn → rules
        for model_type in ["pytorch", "sklearn", "rules"]:
            try:
                result, used_type = self._predict_with_type(
                    request, program_code, model_type
                )
                if result is not None:
                    return result, used_type
            except Exception as e:
                logger.warning(
                    f"Prediction failed with {model_type} for {program_code}: {e}"
                )
                continue

        # This should never happen since rules always works
        from .nlp_classifier import _analyze_with_rules
        return _analyze_with_rules(request), "rules"

    def _predict_with_type(
        self,
        request: JournalAnalysisRequest,
        program_code: str,
        model_type: str,
    ) -> Tuple[Optional[JournalAnalysisResponse], str]:
        """Attempt prediction with a specific model type."""

        if model_type == "pytorch":
            return self._predict_pytorch(request, program_code)
        elif model_type == "sklearn":
            return self._predict_sklearn(request, program_code)
        elif model_type == "rules":
            from .nlp_classifier import _analyze_with_rules
            return _analyze_with_rules(request), "rules"
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def _predict_pytorch(
        self, request: JournalAnalysisRequest, program_code: str
    ) -> Tuple[Optional[JournalAnalysisResponse], str]:
        """Predict using PyTorch model."""
        model, label_map = self.get_pytorch_model(program_code)

        if model is None or label_map is None:
            return None, "pytorch"

        text = request.journal_text.strip()
        if not text:
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=0.0,
                detected_tasks=[],
                flag_level="Unrelated",
                feedback="Empty journal entry text provided.",
            ), "pytorch"

        pred_idx, probs = model.predict_single(text)
        prediction = label_map.get(pred_idx, "unknown")
        confidence = float(max(probs))

        # Detect course-specific tasks using rule-based detection
        from .nlp_classifier import _detect_course_tasks
        detected_tasks = _detect_course_tasks(text.lower(), program_code)

        if prediction == "course_related":
            return JournalAnalysisResponse(
                is_course_related=True,
                confidence_score=round(confidence, 2),
                detected_tasks=detected_tasks,
                flag_level="Normal",
                feedback=(
                    f"PyTorch model classified this entry as aligned with "
                    f"{request.student_course} activities (confidence: {confidence:.0%})."
                ),
            ), "pytorch"
        elif prediction == "errand":
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=round(confidence, 2),
                detected_tasks=detected_tasks,
                flag_level="Warning - Errand / Administrative",
                feedback="PyTorch model flagged this entry as an errand or administrative activity.",
            ), "pytorch"
        else:
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=round(confidence, 2),
                detected_tasks=detected_tasks,
                flag_level="Unrelated",
                feedback=(
                    f"PyTorch model found no clear {request.student_course} "
                    "internship activity in this entry."
                ),
            ), "pytorch"

    def _predict_sklearn(
        self, request: JournalAnalysisRequest, program_code: str
    ) -> Tuple[Optional[JournalAnalysisResponse], str]:
        """Predict using sklearn TF-IDF model."""
        model = self.get_sklearn_model(program_code)

        if model is None:
            return None, "sklearn"

        text = request.journal_text.strip()
        if not text:
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=0.0,
                detected_tasks=[],
                flag_level="Unrelated",
                feedback="Empty journal entry text provided.",
            ), "sklearn"

        prediction = str(model.predict([text])[0])
        probabilities = model.predict_proba([text])[0]
        confidence = round(float(max(probabilities)), 2)

        from .nlp_classifier import _detect_course_tasks
        detected_tasks = _detect_course_tasks(text.lower(), program_code)

        if prediction == "course_related":
            return JournalAnalysisResponse(
                is_course_related=True,
                confidence_score=confidence,
                detected_tasks=detected_tasks,
                flag_level="Normal",
                feedback=(
                    f"ML model classified this entry as aligned with "
                    f"{request.student_course} activities."
                ),
            ), "sklearn"
        elif prediction == "errand":
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=confidence,
                detected_tasks=detected_tasks,
                flag_level="Warning - Errand / Administrative",
                feedback="ML model flagged this entry as an errand or administrative activity.",
            ), "sklearn"
        else:
            return JournalAnalysisResponse(
                is_course_related=False,
                confidence_score=confidence,
                detected_tasks=detected_tasks,
                flag_level="Unrelated",
                feedback=(
                    f"ML model found no clear {request.student_course} "
                    "internship activity in this entry."
                ),
            ), "sklearn"

    # ------------------------------------------------------------------
    # Status & Info
    # ------------------------------------------------------------------

    def get_status(self) -> Dict:
        """Get comprehensive status of all loaded models."""
        sklearn_programs = sorted(self._sklearn_models.keys())
        pytorch_programs = sorted(self._pytorch_models.keys())

        return {
            "startup_complete": self._startup_complete,
            "sklearn_models_loaded": len(sklearn_programs),
            "sklearn_programs": sklearn_programs,
            "pytorch_models_loaded": len(pytorch_programs),
            "pytorch_programs": pytorch_programs,
            "registry_summary": self.registry.get_summary(),
        }

    def clear_cache(self, program_code: Optional[str] = None) -> None:
        """Clear model cache (forces reload on next access)."""
        if program_code:
            program_code = program_code.upper()
            self._sklearn_models.pop(program_code, None)
            self._pytorch_models.pop(program_code, None)
            self._pytorch_label_maps.pop(program_code, None)
            self._load_attempted.pop(f"sklearn_{program_code}", None)
            self._load_attempted.pop(f"pytorch_{program_code}", None)
            logger.info(f"Cleared model cache for {program_code}")
        else:
            self._sklearn_models.clear()
            self._pytorch_models.clear()
            self._pytorch_label_maps.clear()
            self._load_attempted.clear()
            logger.info("Cleared all model caches")


# Global singleton instance
_model_manager: Optional[ModelManager] = None


def get_model_manager() -> ModelManager:
    """Get or create the global ModelManager singleton."""
    global _model_manager
    if _model_manager is None:
        _model_manager = ModelManager()
    return _model_manager
