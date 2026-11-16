"""
Async Training Queue & Task Manager.

Allows non-blocking background training of both PyTorch and Scikit-learn models
via FastAPI BackgroundTasks, with progress tracking, error handling, and registry updating.
"""

import asyncio
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# In-memory training status store: task_id -> status dict
_TRAINING_TASKS: Dict[str, Dict[str, Any]] = {}

def get_training_tasks() -> Dict[str, Dict[str, Any]]:
    return _TRAINING_TASKS

def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    return _TRAINING_TASKS.get(task_id)


def execute_training_task(
    task_id: str,
    program_code: str,
    model_type: str = "pytorch",
    epochs: int = 4,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
    fine_tune: bool = True,
):
    """
    Synchronous worker executed in FastAPI BackgroundTasks thread pool.
    Updates in-memory status so clients can poll /api/ml/train/status/{task_id}.
    """
    task = _TRAINING_TASKS.get(task_id)
    if not task:
        return

    task["status"] = "in_progress"
    task["started_at"] = datetime.now().isoformat()
    task["progress_percentage"] = 5.0

    try:
        from .pytorch_training_service import PyTorchTrainingService
        from .model_manager import get_model_manager

        models_dir = Path(__file__).resolve().parents[2] / "models"
        datasets_dir = Path(__file__).resolve().parents[2] / "datasets"

        from train_all_classifiers import PROGRAM_CODE_MAPPING
        csv_name = PROGRAM_CODE_MAPPING.get(program_code.upper())
        if not csv_name:
            raise ValueError(f"No dataset found for program {program_code}")

        dataset_path = datasets_dir / csv_name
        if not dataset_path.exists():
            raise FileNotFoundError(f"Dataset path {dataset_path} does not exist.")

        task["progress_percentage"] = 15.0

        if model_type.lower() == "pytorch":
            def progress_hook(info: Dict):
                task["current_epoch"] = info.get("current_epoch")
                task["total_epochs"] = info.get("total_epochs")
                task["current_train_loss"] = info.get("train_loss")
                task["current_val_loss"] = info.get("val_loss")
                task["best_val_loss"] = info.get("best_val_loss")
                task["progress_percentage"] = info.get("progress_percentage", 50.0)

            service = PyTorchTrainingService(models_dir=models_dir)
            results = service.train_model_from_csv(
                dataset_path=dataset_path,
                program_code=program_code.upper(),
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
                progress_callback=progress_hook,
            )
            task["results"] = results
        else:
            from train_all_classifiers import load_dataset, train_classifier
            texts, labels, _ = load_dataset(dataset_path)
            task["progress_percentage"] = 50.0
            results = train_classifier(texts, labels, program_code.upper())
            task["results"] = results

        # Invalidate model cache so newly trained model is used immediately
        get_model_manager().clear_cache(program_code)

        task["status"] = "completed"
        task["completed_at"] = datetime.now().isoformat()
        task["progress_percentage"] = 100.0

    except Exception as e:
        logger.error(f"Training task {task_id} failed: {e}", exc_info=True)
        task["status"] = "failed"
        task["error"] = str(e)
        task["completed_at"] = datetime.now().isoformat()


def create_training_job(
    program_code: str,
    model_type: str = "pytorch",
    epochs: int = 4,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
) -> str:
    """Create and register a new training job."""
    task_id = f"train_{program_code.lower()}_{uuid.uuid4().hex[:8]}"
    _TRAINING_TASKS[task_id] = {
        "task_id": task_id,
        "program_code": program_code.upper(),
        "model_type": model_type,
        "status": "queued",
        "progress_percentage": 0.0,
        "created_at": datetime.now().isoformat(),
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
    }
    return task_id
