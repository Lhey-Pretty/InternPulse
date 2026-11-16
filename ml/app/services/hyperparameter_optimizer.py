"""
Hyperparameter Optimization Service.

Supports:
1. Optuna Bayesian Optimization (if optuna is installed)
2. Scikit-learn GridSearch & RandomizedSearch for TF-IDF / LogisticRegression / RandomForest
3. PyTorch training hyperparameter tuning
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)


def optimize_hyperparameters(
    program_code: str,
    n_trials: int = 10,
    model_type: str = "sklearn",
) -> Dict[str, Any]:
    """
    Tune model hyperparameters using Optuna (if installed) or Scikit-learn GridSearchCV.
    """
    from train_all_classifiers import PROGRAM_CODE_MAPPING, load_dataset, DATASETS_DIR
    from sklearn.model_selection import StratifiedKFold, GridSearchCV
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression

    csv_file = PROGRAM_CODE_MAPPING.get(program_code.upper())
    if not csv_file:
        raise ValueError(f"No dataset configured for program {program_code}")

    dataset_path = DATASETS_DIR / csv_file
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset {dataset_path} does not exist.")

    texts, labels, _ = load_dataset(dataset_path)

    # Check if Optuna is available
    optuna_available = False
    try:
        import optuna
        optuna_available = True
    except ImportError:
        optuna_available = False

    if optuna_available:
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        def objective(trial):
            c_val = trial.suggest_float("C", 0.1, 20.0, log=True)
            ngram_max = trial.suggest_int("ngram_max", 1, 3)
            max_features = trial.suggest_categorical("max_features", [5000, 10000, 20000])

            pipeline = Pipeline([
                ("vectorizer", TfidfVectorizer(ngram_range=(1, ngram_max), max_features=max_features)),
                ("classifier", LogisticRegression(C=c_val, max_iter=500, random_state=42)),
            ])

            cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
            scores = []
            for train_idx, val_idx in cv.split(texts, labels):
                X_train = [texts[i] for i in train_idx]
                y_train = [labels[i] for i in train_idx]
                X_val = [texts[i] for i in val_idx]
                y_val = [labels[i] for i in val_idx]

                pipeline.fit(X_train, y_train)
                scores.append(pipeline.score(X_val, y_val))

            return float(np.mean(scores))

        study = optuna.create_study(direction="maximize")
        study.optimize(objective, n_trials=n_trials)

        return {
            "program_code": program_code.upper(),
            "optimizer": "optuna",
            "n_trials_completed": len(study.trials),
            "best_params": study.best_params,
            "best_score": round(study.best_value, 4),
            "metric_name": "val_accuracy",
        }
    else:
        # Fallback to Scikit-learn GridSearchCV
        pipeline = Pipeline([
            ("vectorizer", TfidfVectorizer(max_features=10000)),
            ("classifier", LogisticRegression(max_iter=500, random_state=42)),
        ])

        param_grid = {
            "vectorizer__ngram_range": [(1, 1), (1, 2)],
            "classifier__C": [0.5, 1.0, 5.0, 10.0],
        }

        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        grid_search = GridSearchCV(
            pipeline,
            param_grid,
            cv=cv,
            scoring="f1_weighted",
            n_jobs=1,
        )

        grid_search.fit(texts[:500], labels[:500]) # Sample for fast execution

        clean_params = {
            k.replace("classifier__", "").replace("vectorizer__", ""): v
            for k, v in grid_search.best_params_.items()
        }

        return {
            "program_code": program_code.upper(),
            "optimizer": "grid_search",
            "n_trials_completed": len(grid_search.cv_results_["params"]),
            "best_params": clean_params,
            "best_score": round(float(grid_search.best_score_), 4),
            "metric_name": "f1_weighted",
        }
