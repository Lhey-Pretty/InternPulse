import argparse
import csv
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Callable

import torch
import numpy as np
from sklearn.model_selection import train_test_split

from ..models.pytorch.dataset import load_dataset_from_csv, create_dataloader
from ..models.pytorch.model import JournalClassificationModel, ModelArchitecture
from ..models.pytorch.trainer import Trainer
from .model_registry import ModelRegistry


class PyTorchTrainingService:
    """Service for training and managing deep learning PyTorch classification models."""

    def __init__(self, models_dir: Path):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.registry = ModelRegistry(self.models_dir)

    def train_model_from_csv(
        self,
        dataset_path: Path,
        program_code: str,
        model_name: str = ModelArchitecture.MINILM.value,
        epochs: int = 3,
        batch_size: int = 16,
        learning_rate: float = 2e-5,
        test_size: float = 0.2,
        val_size: float = 0.1,
        max_length: int = 128,
        progress_callback: Optional[Callable[[Dict], None]] = None,
    ) -> Dict:
        """
        Train a PyTorch model with a 3-way split (Train / Validation / Test),
        early stopping, and comprehensive metric evaluation.
        """
        print(f"\n{'='*70}")
        print(f"[PYTORCH TRAINING] Training {model_name} for {program_code}")
        print(f"{'='*70}")

        texts, labels = load_dataset_from_csv(dataset_path)

        # 3-way split: 1st split off test set, then split remainder into train and val
        text_temp, text_test, label_temp, label_test = train_test_split(
            texts, labels, test_size=test_size, random_state=42, stratify=labels
        )
        val_relative_size = val_size / (1.0 - test_size)
        text_train, text_val, label_train, label_val = train_test_split(
            text_temp, label_temp, test_size=val_relative_size, random_state=42, stratify=label_temp
        )

        print(f"  Samples -> Train: {len(text_train)} | Val: {len(text_val)} | Test: {len(text_test)}")

        unique_labels = sorted(set(labels))
        labels_map = {label: idx for idx, label in enumerate(unique_labels)}
        reverse_labels_map = {idx: label for label, idx in labels_map.items()}

        train_loader, _ = create_dataloader(
            texts=text_train,
            labels=label_train,
            batch_size=batch_size,
            labels_map=labels_map,
            shuffle=True,
            use_sentence_transformer=True,
        )

        val_loader, _ = create_dataloader(
            texts=text_val,
            labels=label_val,
            batch_size=batch_size,
            labels_map=labels_map,
            shuffle=False,
            use_sentence_transformer=True,
        )

        test_loader, _ = create_dataloader(
            texts=text_test,
            labels=label_test,
            batch_size=batch_size,
            labels_map=labels_map,
            shuffle=False,
            use_sentence_transformer=True,
        )

        model = JournalClassificationModel(
            model_name=model_name,
            num_classes=len(unique_labels),
            max_length=max_length,
            use_pretrained=True,
        )

        trainer = Trainer(
            model=model,
            learning_rate=learning_rate,
            batch_size=batch_size,
            epochs=epochs,
            device="cuda" if torch.cuda.is_available() else "cpu",
            early_stopping=True,
            patience=2,
            progress_callback=progress_callback,
        )

        save_dir = self.models_dir / f"{program_code.lower()}"
        save_dir.mkdir(parents=True, exist_ok=True)

        history = trainer.train(train_loader, val_loader, save_dir=save_dir)

        # Evaluate on the unseen test set using the best saved model
        loaded_model = JournalClassificationModel.load_model(save_dir, num_classes=len(unique_labels))
        test_preds, test_true_indices, test_probs = loaded_model.predict(test_loader)

        metrics = trainer.compute_metrics(
            predictions=test_preds,
            labels=test_true_indices,
            probabilities=test_probs,
            labels_map=reverse_labels_map,
        )

        results = {
            "program_code": program_code,
            "model_name": model_name,
            "dataset": {
                "source": str(dataset_path),
                "total_samples": len(texts),
                "train_samples": len(text_train),
                "val_samples": len(text_val),
                "test_samples": len(text_test),
                "num_classes": len(unique_labels),
                "class_distribution": {
                    cls: label_train.count(cls) for cls in unique_labels
                },
            },
            "training": {
                "epochs": epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate,
                "test_size": test_size,
                "val_size": val_size,
                "max_length": max_length,
                "device": trainer.device,
            },
            "metrics": metrics,
            "history": history,
            "best_val_loss": trainer.best_val_loss,
            "trained_at": datetime.now().isoformat(),
        }

        results_path = save_dir / "pytorch_results.json"
        with open(results_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        # Register in ModelRegistry
        self.registry.register_model(
            program_code=program_code,
            model_type="pytorch",
            accuracy=metrics["accuracy"],
            f1_score=metrics["f1_score"],
            precision=metrics["precision"],
            recall=metrics["recall"],
            model_path=str(save_dir),
            metadata={
                "model_name": model_name,
                "epochs": epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate,
            },
            auto_activate=True,
        )

        print(f"\n[PYTORCH TEST RESULTS] Accuracy: {metrics['accuracy']:.4f} | F1: {metrics['f1_score']:.4f}")
        return results
