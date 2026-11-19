import argparse
import csv
import json
import os
from pathlib import Path
from datetime import datetime
from decimal import Decimal

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
)
from sklearn.calibration import calibration_curve
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import numpy as np
import joblib
import pandas as pd

from app.services.model_registry import ModelRegistry

BASEPATH = Path(__file__).resolve().parent
DATASETS_DIR = BASEPATH / "datasets"
MODELS_DIR = BASEPATH / "models"
REPORT_FILE = MODELS_DIR / "training_report.json"

# Program code mapping to exact filenames
PROGRAM_CODE_MAPPING = {
    "BEED": "filtered_BEED_dataset.csv",
    "BSED_ENGLISH": "filtered_BSED_English_dataset.csv",
    "BSED_MATH": "filtered_BSED_Mathematics_dataset.csv",
    "BSED_SCIENCE": "BSED_Science_dataset.csv",
    "BSIT": "filtered_IT_dataset.csv",
    "BSCPE": "Computer_Engineering_dataset.csv",
    "BSCRIM": "Criminology_dataset.csv",
    "FISHERIES": "Fisheries_dataset.csv",
    "POLSCI": "filtered_Political_Science_dataset.csv",
    "BSHM": "filtered_HM_dataset.csv",
    "BSTM": "TM-filtered_ojt_dataset_2.csv",
}

def load_dataset(path: Path):
    """Load a CSV or Excel dataset and validate its text and label columns."""
    if path.suffix.lower() in {".xlsx", ".xls"}:
        rows = pd.read_excel(path).fillna("").to_dict(orient="records")
    else:
        with path.open(encoding="utf-8-sig", newline="") as file:
            rows = list(csv.DictReader(file))

    if not rows:
        raise ValueError("Dataset is empty.")

    first_row = rows[0]
    # Identify text column
    text_col = None
    for candidate in ["journal_text", "Task", "task", "content", "entry", "text"]:
        if candidate in first_row:
            text_col = candidate
            break

    # Identify label column
    label_col = None
    for candidate in ["label", "category", "target", "class"]:
        if candidate in first_row:
            label_col = candidate
            break

    if not text_col or not label_col:
        raise ValueError(f"Could not find text/label columns. Available columns: {list(first_row.keys())}")

    label_aliases = {
        "related": "course_related",
        "course related": "course_related",
        "course-related": "course_related",
        "course_related": "course_related",
        "unrelated": "unrelated",
        "errand": "errand",
    }

    texts = []
    labels = []
    for row in rows:
        t = row.get(text_col, "").strip()
        raw_label = row.get(label_col, "").strip()
        l = label_aliases.get(raw_label.lower())
        if raw_label and l is None:
            raise ValueError(
                f"Unsupported label '{raw_label}' in {path.name}. "
                "Use related/course_related, unrelated, or errand."
            )
        if t and l:
            # If Title exists and not already in text, optionally prefix
            if "Title" in row and row["Title"] and row["Title"].strip() not in t:
                t = f"{row['Title'].strip()}. {t}"
            texts.append(t)
            labels.append(l)

    if not texts or not labels:
        raise ValueError("Dataset contains no valid non-empty entries.")

    label_counts = {}
    for label in labels:
        label_counts[label] = label_counts.get(label, 0) + 1

    if len(label_counts) < 2:
        raise ValueError(
            f"{path.name} contains only one usable class ({label_counts}). "
            "A journal classifier needs examples from at least two classes; "
            "add labeled unrelated BSIT journal entries before training."
        )

    print(f"[OK] Loaded {len(texts)} entries from {path.name} (using '{text_col}', '{label_col}')")
    print(f"  Classes: {sorted(set(labels))}")
    print(f"  Distribution: {label_counts}")

    return texts, labels, label_counts


def train_classifier(texts: list, labels: list, program_code: str) -> dict:
    """Train a logistic regression classifier with TF-IDF features and complete metrics."""
    print(f"\n[TRAIN] Training classifier for {program_code}...")

    # Stratified train/test split (80/20)
    text_train, text_test, label_train, label_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    print(f"  Training: {len(text_train)} | Testing: {len(text_test)}")

    model = Pipeline(
        [
            ("vectorizer", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), max_features=10000)),
            ("classifier", LogisticRegression(
                max_iter=1000,
                random_state=42,
                C=5.0,
                class_weight="balanced",
            )),
        ]
    )

    model.fit(text_train, label_train)

    predictions = model.predict(text_test)
    probabilities = model.predict_proba(text_test)

    classes = list(model.classes_)
    report = classification_report(
        label_test,
        predictions,
        output_dict=True,
        zero_division=0,
    )

    cm = confusion_matrix(label_test, predictions, labels=classes)
    accuracy = float(np.mean([p == t for p, t in zip(predictions, label_test)]))

    # ROC-AUC computation (One-vs-Rest)
    roc_curves = {}
    calibration_data = {}
    y_test_arr = np.array(label_test)

    for idx, cname in enumerate(classes):
        binary_true = (y_test_arr == cname).astype(int)
        if np.sum(binary_true) > 0 and len(np.unique(binary_true)) > 1:
            fpr, tpr, _ = roc_curve(binary_true, probabilities[:, idx])
            roc_auc = float(auc(fpr, tpr))
            roc_curves[cname] = {
                "auc": round(roc_auc, 4),
                "fpr": [round(float(x), 4) for x in fpr[::max(1, len(fpr) // 20)]],
                "tpr": [round(float(x), 4) for x in tpr[::max(1, len(tpr) // 20)]],
            }
            prob_true, prob_pred = calibration_curve(binary_true, probabilities[:, idx], n_bins=5)
            calibration_data[cname] = {
                "prob_true": [round(float(x), 4) for x in prob_true],
                "prob_pred": [round(float(x), 4) for x in prob_pred],
            }

    # Save model and metrics
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / f"{program_code.lower()}_classifier.joblib"
    metrics_path = MODELS_DIR / f"{program_code.lower()}_metrics.json"

    joblib.dump(model, model_path)

    metrics = {
        "program_code": program_code,
        "trained_at": datetime.now().isoformat(),
        "model_type": "sklearn",
        "dataset_info": {
            "total_rows": len(texts),
            "train_size": len(text_train),
            "test_size": len(text_test),
        },
        "class_distribution": {
            k: v for k, v in report.items()
            if k not in ['accuracy', 'macro avg', 'weighted avg']
        },
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "class_names": classes,
        "roc_curves": roc_curves,
        "calibration_data": calibration_data,
        "model_performance": {
            "accuracy": round(accuracy, 4),
            "weighted_f1": round(report.get("weighted avg", {}).get("f1-score", accuracy), 4),
            "weighted_precision": round(report.get("weighted avg", {}).get("precision", accuracy), 4),
            "weighted_recall": round(report.get("weighted avg", {}).get("recall", accuracy), 4),
        },
    }

    metrics_path.write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # Register in ModelRegistry
    registry = ModelRegistry(MODELS_DIR)
    registry.register_model(
        program_code=program_code,
        model_type="sklearn",
        accuracy=metrics["model_performance"]["accuracy"],
        f1_score=metrics["model_performance"]["weighted_f1"],
        precision=metrics["model_performance"]["weighted_precision"],
        recall=metrics["model_performance"]["weighted_recall"],
        model_path=str(model_path),
        auto_activate=True,
    )

    print(f"  [OK] Model saved: {model_path.name}")
    print(f"  [OK] Metrics saved: {metrics_path.name}")
    print(f"  [OK] Accuracy: {accuracy:.4f}")
    return metrics


def generate_training_report(all_metrics: list) -> dict:
    """Generate a master training report across all programs."""
    report = {
        "generated_at": datetime.now().isoformat(),
        "programs_trained": len(all_metrics),
        "programs": all_metrics,
        "summary": {
            "total_models": len(all_metrics),
            "average_accuracy": round(sum(m["model_performance"]["accuracy"] for m in all_metrics) / len(all_metrics), 4),
            "best_classifier": max(all_metrics, key=lambda m: m["model_performance"]["accuracy"])["program_code"],
            "worst_classifier": min(all_metrics, key=lambda m: m["model_performance"]["accuracy"])["program_code"],
        }
    }

    REPORT_FILE.write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\n" + "="*70)
    print("MASTER TRAINING REPORT")
    print("="*70)
    print(json.dumps(report["summary"], indent=2, ensure_ascii=False))
    print(f"\nReport saved to: {REPORT_FILE}")
    print("="*70)

    return report


def main():
    parser = argparse.ArgumentParser(
        description="Train internship journal classification models for all programs."
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="Skip programs that already have trained models"
    )
    parser.add_argument(
        "--program",
        default="ALL",
        type=str.upper,
        choices=["ALL", *PROGRAM_CODE_MAPPING.keys()],
        help="Train only one program (for example, BSIT) or ALL programs",
    )
    args = parser.parse_args()

    print("\n" + "="*70)
    print("TRAIN ALL INTERNSHIP JOURNAL CLASSIFIERS")
    print("="*70)
    print(f"Base directory: {BASEPATH}")
    print(f"Datasets directory: {DATASETS_DIR}")
    print(f"Models directory: {MODELS_DIR}")
    print("="*70 + "\n")

    programs_to_train = []
    for program_code, dataset_file in PROGRAM_CODE_MAPPING.items():
        if args.program != "ALL" and program_code != args.program:
            continue
        if dataset_file is None:
            continue
        dataset_path = DATASETS_DIR / dataset_file
        if not dataset_path.exists():
            print(f"[WARNING] Skipping {program_code} - dataset not found: {dataset_path}")
            continue
        if args.skip_existing:
            model_path = MODELS_DIR / f"{program_code.lower()}_classifier.joblib"
            if model_path.exists():
                print(f"[SKIP] Skipping {program_code} - model already exists")
                continue
        programs_to_train.append((program_code, dataset_path))

    if not programs_to_train:
        print("[OK] No programs to train. All models exist or data missing.")
        return

    all_metrics = []
    for program_code, dataset_path in programs_to_train:
        try:
            texts, labels, _ = load_dataset(dataset_path)
            metrics = train_classifier(texts, labels, program_code)
            all_metrics.append(metrics)
            print("-" * 70)
        except Exception as e:
            print(f"\n[ERROR] Error training {program_code}: {e}")

    if all_metrics:
        generate_training_report(all_metrics)
        print(f"\n[OK] SUCCESS: Trained {len(all_metrics)} classifiers")
    else:
        print("\n[WARNING] No successful training completed")


if __name__ == "__main__":
    main()
