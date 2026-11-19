import argparse
import csv
import json
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = BASE_DIR / "datasets" / "bsit_activities_training.csv"
DEFAULT_MODEL = BASE_DIR / "models" / "journal_classifier.joblib"
DEFAULT_METRICS = BASE_DIR / "models" / "journal_classifier_metrics.json"


def load_dataset(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    required_columns = {"journal_text", "label"}
    if not rows or not required_columns.issubset(rows[0]):
        raise ValueError("Dataset must contain journal_text and label columns.")

    texts = [row["journal_text"].strip() for row in rows]
    labels = [row["label"].strip() for row in rows]
    if any(not text or not label for text, label in zip(texts, labels)):
        raise ValueError("Dataset contains an empty journal_text or label.")

    return texts, labels


def train(dataset_path: Path, model_path: Path, metrics_path: Path):
    texts, labels = load_dataset(dataset_path)
    text_train, text_test, label_train, label_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    model = Pipeline(
        [
            ("vectorizer", TfidfVectorizer(lowercase=True, ngram_range=(1, 2))),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42)),
        ]
    )
    model.fit(text_train, label_train)

    predictions = model.predict(text_test)
    report = classification_report(
        label_test,
        predictions,
        output_dict=True,
        zero_division=0,
    )

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    metrics_path.write_text(
        json.dumps(
            {
                "dataset": str(dataset_path),
                "rows": len(texts),
                "test_rows": len(text_test),
                "labels": sorted(set(labels)),
                "classification_report": report,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(classification_report(label_test, predictions, zero_division=0))
    print(f"Saved model: {model_path}")
    print(f"Saved metrics: {metrics_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the InternPulse journal classifier.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--metrics", type=Path, default=DEFAULT_METRICS)
    args = parser.parse_args()
    train(args.dataset, args.model, args.metrics)
