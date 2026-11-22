"""
Model Registry — Tracks model versions, metadata, and active deployments.

Maintains a JSON manifest of all trained models with version numbers,
accuracy metrics, training timestamps, and which model is currently
serving predictions for each program.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

REGISTRY_FILENAME = "model_registry.json"


class ModelVersion:
    """Represents a single versioned model entry."""

    def __init__(
        self,
        program_code: str,
        model_type: str,  # "sklearn", "pytorch", "rules"
        version: int,
        accuracy: float = 0.0,
        f1_score: float = 0.0,
        precision: float = 0.0,
        recall: float = 0.0,
        trained_at: Optional[str] = None,
        model_path: Optional[str] = None,
        is_active: bool = False,
        metadata: Optional[Dict] = None,
    ):
        self.program_code = program_code
        self.model_type = model_type
        self.version = version
        self.accuracy = accuracy
        self.f1_score = f1_score
        self.precision = precision
        self.recall = recall
        self.trained_at = trained_at or datetime.now().isoformat()
        self.model_path = model_path
        self.is_active = is_active
        self.metadata = metadata or {}

    def to_dict(self) -> Dict:
        return {
            "program_code": self.program_code,
            "model_type": self.model_type,
            "version": self.version,
            "accuracy": self.accuracy,
            "f1_score": self.f1_score,
            "precision": self.precision,
            "recall": self.recall,
            "trained_at": self.trained_at,
            "model_path": self.model_path,
            "is_active": self.is_active,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "ModelVersion":
        return cls(**data)


class ModelRegistry:
    """
    Central registry for all trained models.

    Persists model metadata to a JSON file so model versions survive restarts.
    Supports registering new models, activating specific versions,
    and rolling back to previous versions.
    """

    def __init__(self, models_dir: Path):
        self.models_dir = Path(models_dir)
        self.registry_path = self.models_dir / REGISTRY_FILENAME
        self._registry: Dict[str, List[Dict]] = {}
        self.load_failed = False
        self._load()

    def _load(self) -> None:
        """Load registry from disk."""
        if self.registry_path.exists():
            try:
                with open(self.registry_path, "r", encoding="utf-8-sig") as f:
                    self._registry = json.load(f)
                if not isinstance(self._registry, dict):
                    raise ValueError("Registry must be an object")
                for key, versions in self._registry.items():
                    if not isinstance(versions, list):
                        raise ValueError("Registry versions must be lists")
                    for entry in versions:
                        model = ModelVersion.from_dict(entry)
                        if (key != f"{model.program_code}_{model.model_type}"
                                or not isinstance(model.version, int) or model.version < 1
                                or not isinstance(model.accuracy, (int, float))
                                or not isinstance(model.is_active, bool)
                                or model.model_path is not None and not isinstance(model.model_path, str)):
                            raise ValueError("Invalid registry entry")
                logger.info(
                    f"Loaded model registry with "
                    f"{sum(len(v) for v in self._registry.values())} entries"
                )
            except (ValueError, OSError, TypeError, KeyError) as e:
                logger.warning(f"Failed to load model registry: {e}")
                self.load_failed = True
                self._registry = {}
        else:
            self._registry = {}

    def _save(self) -> None:
        """Persist registry to disk."""
        self.models_dir.mkdir(parents=True, exist_ok=True)
        with open(self.registry_path, "w", encoding="utf-8") as f:
            json.dump(self._registry, f, indent=2, ensure_ascii=False)

    def register_model(
        self,
        program_code: str,
        model_type: str,
        accuracy: float = 0.0,
        f1_score: float = 0.0,
        precision: float = 0.0,
        recall: float = 0.0,
        model_path: Optional[str] = None,
        metadata: Optional[Dict] = None,
        auto_activate: bool = True,
    ) -> ModelVersion:
        """
        Register a newly trained model.

        Args:
            program_code: Program identifier (e.g., "BEED", "BSIT")
            model_type: One of "sklearn", "pytorch", "rules"
            accuracy: Model accuracy on test set
            f1_score: Weighted F1 score
            precision: Weighted precision
            recall: Weighted recall
            model_path: Path to the saved model artifact
            metadata: Additional metadata (hyperparameters, etc.)
            auto_activate: If True, automatically set as active model

        Returns:
            The registered ModelVersion
        """
        key = f"{program_code}_{model_type}"

        if key not in self._registry:
            self._registry[key] = []

        # Compute next version number
        existing_versions = [e["version"] for e in self._registry[key]]
        next_version = max(existing_versions, default=0) + 1

        # Deactivate previous versions if auto-activating
        if auto_activate:
            for entry in self._registry[key]:
                entry["is_active"] = False

        model_version = ModelVersion(
            program_code=program_code,
            model_type=model_type,
            version=next_version,
            accuracy=accuracy,
            f1_score=f1_score,
            precision=precision,
            recall=recall,
            model_path=model_path,
            is_active=auto_activate,
            metadata=metadata,
        )

        self._registry[key].append(model_version.to_dict())
        self._save()

        logger.info(
            f"Registered {model_type} model v{next_version} for {program_code} "
            f"(accuracy={accuracy:.4f}, active={auto_activate})"
        )

        return model_version

    def get_active_model(
        self, program_code: str, model_type: Optional[str] = None
    ) -> Optional[ModelVersion]:
        """
        Get the currently active model for a program.

        If model_type is None, returns the best active model across all types.
        """
        candidates = []

        for key, versions in self._registry.items():
            if not key.startswith(program_code + "_"):
                continue
            if model_type and not key.endswith("_" + model_type):
                continue

            for entry in versions:
                if entry.get("is_active", False):
                    candidates.append(ModelVersion.from_dict(entry))

        if not candidates:
            return None

        # Return highest-accuracy active model
        return max(candidates, key=lambda m: m.accuracy)

    def activate_version(
        self, program_code: str, model_type: str, version: int
    ) -> bool:
        """Activate a specific model version (and deactivate others of the same type)."""
        key = f"{program_code}_{model_type}"

        if key not in self._registry:
            logger.warning(f"No models found for {key}")
            return False

        found = False
        if not any(entry["version"] == version for entry in self._registry[key]):
            return False
        for entry in self._registry[key]:
            if entry["version"] == version:
                entry["is_active"] = True
                found = True
            else:
                entry["is_active"] = False

        if found:
            self._save()
            logger.info(f"Activated {model_type} v{version} for {program_code}")
        else:
            logger.warning(f"Version {version} not found for {key}")

        return found

    def rollback(self, program_code: str, model_type: str) -> Optional[ModelVersion]:
        """Roll back to the previous version of a model."""
        key = f"{program_code}_{model_type}"

        if key not in self._registry or len(self._registry[key]) < 2:
            logger.warning(f"Cannot rollback {key}: insufficient versions")
            return None

        # Sort by version descending
        sorted_versions = sorted(
            self._registry[key], key=lambda e: e["version"], reverse=True
        )

        # Deactivate current, activate previous
        for entry in self._registry[key]:
            entry["is_active"] = False

        previous = sorted_versions[1]
        previous["is_active"] = True
        self._save()

        result = ModelVersion.from_dict(previous)
        logger.info(
            f"Rolled back {model_type} for {program_code} to v{result.version}"
        )
        return result

    def list_models(
        self, program_code: Optional[str] = None
    ) -> List[Dict]:
        """List all registered models, optionally filtered by program."""
        results = []

        for key, versions in self._registry.items():
            for entry in versions:
                if program_code and entry["program_code"] != program_code:
                    continue
                results.append(entry)

        return sorted(results, key=lambda e: (e["program_code"], e["model_type"], e["version"]))

    def get_summary(self) -> Dict:
        """Get a high-level summary of the registry."""
        total_models = sum(len(v) for v in self._registry.values())
        active_models = sum(
            1
            for versions in self._registry.values()
            for v in versions
            if v.get("is_active", False)
        )
        programs = set()
        for versions in self._registry.values():
            for v in versions:
                programs.add(v["program_code"])

        return {
            "total_models": total_models,
            "active_models": active_models,
            "programs": sorted(programs),
            "model_types": sorted(
                set(
                    v["model_type"]
                    for versions in self._registry.values()
                    for v in versions
                )
            ),
        }
