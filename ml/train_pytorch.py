"""
InternPulse — PyTorch Deep Learning Training Script.

Trains neural network classifiers using PyTorch and SentenceTransformers (all-MiniLM-L6-v2)
for journal classification across school programs.
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime

# Ensure ml package is on python path
ml_root = Path(__file__).resolve().parent
sys.path.insert(0, str(ml_root))

from app.services.pytorch_training_service import PyTorchTrainingService
from train_all_classifiers import PROGRAM_CODE_MAPPING, DATASETS_DIR, MODELS_DIR


def train_single_program(
    program_code: str,
    epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
):
    clean_code = program_code.upper()
    csv_file = PROGRAM_CODE_MAPPING.get(clean_code)

    if not csv_file:
        print(f"[ERROR] No dataset mapped for program {clean_code}.")
        print(f"Available programs: {list(PROGRAM_CODE_MAPPING.keys())}")
        return None

    dataset_path = DATASETS_DIR / csv_file
    if not dataset_path.exists():
        print(f"[ERROR] Dataset file not found at: {dataset_path}")
        return None

    service = PyTorchTrainingService(models_dir=MODELS_DIR)

    print(f"\n{'='*70}")
    print(f"STARTING PYTORCH TRAINING FOR: {clean_code}")
    print(f"Dataset: {csv_file}")
    print(f"Epochs: {epochs} | Batch size: {batch_size} | LR: {learning_rate}")
    print(f"{'='*70}\n")

    results = service.train_model_from_csv(
        dataset_path=dataset_path,
        program_code=clean_code,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
    )

    print(f"\n[OK] PyTorch model trained and saved to: ml/models/{clean_code.lower()}/")
    print(f"Accuracy: {results['metrics']['accuracy']:.4f}")
    print(f"F1-Score: {results['metrics']['f1_score']:.4f}")
    print(f"Confusion Matrix: {results['metrics']['confusion_matrix']}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Train PyTorch Deep Learning Models for InternPulse")
    parser.add_argument("--program", type=str, default="BSIT", help="Program code to train (e.g. BSIT, BSCPE, BEED) or ALL")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs (default: 3)")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate (default: 2e-5)")

    args = parser.parse_args()

    if args.program.upper() == "ALL":
        print(f"\n[+] Training PyTorch models for ALL programs...")
        for prog in PROGRAM_CODE_MAPPING.keys():
            try:
                train_single_program(prog, epochs=args.epochs, batch_size=args.batch_size, learning_rate=args.lr)
            except Exception as e:
                print(f"[WARNING] Skipping {prog}: {e}")
    else:
        train_single_program(args.program.upper(), epochs=args.epochs, batch_size=args.batch_size, learning_rate=args.lr)


if __name__ == "__main__":
    main()
