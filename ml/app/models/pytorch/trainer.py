import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from pathlib import Path
import json
from datetime import datetime
import numpy as np
from typing import Dict, List, Tuple, Optional, Callable, Any
from tqdm import tqdm

from .model import JournalClassificationModel
from .dataset import create_dataloader


class Trainer:
    """
    Robust PyTorch trainer for journal classification models.
    Supports SentenceTransformer and HuggingFace encoders,
    early stopping, learning curve tracking, progress callbacks,
    and comprehensive evaluation (ROC-AUC, calibration, per-class metrics).
    """

    def __init__(
        self,
        model: JournalClassificationModel,
        learning_rate: float = 2e-5,
        batch_size: int = 16,
        epochs: int = 4,
        device: Optional[str] = None,
        early_stopping: bool = True,
        patience: int = 2,
        max_grad_norm: float = 1.0,
        progress_callback: Optional[Callable[[Dict], None]] = None,
    ):
        self.model = model
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.epochs = epochs
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.early_stopping = early_stopping
        self.patience = patience
        self.max_grad_norm = max_grad_norm
        self.progress_callback = progress_callback

        self.model.to(self.device)

        # Optimize only trainable parameters (e.g. classifier head + unfrozen layers)
        trainable_params = [p for p in self.model.parameters() if p.requires_grad]
        self.optimizer = optim.AdamW(
            trainable_params,
            lr=learning_rate,
            weight_decay=0.01,
        )

        self.criterion = nn.CrossEntropyLoss()

        self.history = {
            "train_loss": [],
            "train_accuracy": [],
            "val_loss": [],
            "val_accuracy": [],
            "epochs": [],
        }

        self.best_val_loss = float("inf")

    def _prepare_inputs(self, batch: Dict) -> Tuple[Any, Any, torch.Tensor]:
        """Normalize batch inputs depending on tokenizer vs string collator."""
        input_ids = batch["input_ids"]
        if isinstance(input_ids, torch.Tensor):
            input_ids = input_ids.to(self.device)
            attention_mask = batch["attention_mask"].to(self.device)
        else:
            # Raw string list for SentenceTransformer
            attention_mask = None

        labels = batch["labels"].to(self.device)
        return input_ids, attention_mask, labels

    def train_epoch(self, train_loader: DataLoader) -> Tuple[float, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for batch in tqdm(train_loader, desc="Training", leave=False):
            input_ids, attention_mask, labels = self._prepare_inputs(batch)

            self.optimizer.zero_grad()
            logits = self.model(input_ids, attention_mask)
            loss = self.criterion(logits, labels)

            loss.backward()

            torch.nn.utils.clip_grad_norm_(
                self.model.parameters(),
                self.max_grad_norm,
            )

            self.optimizer.step()

            total_loss += loss.item()
            _, predicted = torch.max(logits, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()

        avg_loss = total_loss / max(1, len(train_loader))
        accuracy = correct / max(1, total)

        return avg_loss, accuracy

    def evaluate(self, val_loader: DataLoader) -> Tuple[float, float, np.ndarray, np.ndarray, np.ndarray]:
        """Evaluate on validation set and collect probabilities."""
        self.model.eval()
        total_loss = 0.0
        correct = 0
        total = 0

        all_preds = []
        all_labels = []
        all_probs = []

        with torch.no_grad():
            for batch in tqdm(val_loader, desc="Evaluating", leave=False):
                input_ids, attention_mask, labels = self._prepare_inputs(batch)

                logits = self.model(input_ids, attention_mask)
                loss = self.criterion(logits, labels)

                total_loss += loss.item()
                probs = torch.softmax(logits, dim=1)
                _, predicted = torch.max(logits, 1)

                total += labels.size(0)
                correct += (predicted == labels).sum().item()

                all_preds.extend(predicted.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())
                all_probs.extend(probs.cpu().numpy())

        avg_loss = total_loss / max(1, len(val_loader))
        accuracy = correct / max(1, total)

        return avg_loss, accuracy, np.array(all_preds), np.array(all_labels), np.array(all_probs)

    def train(
        self,
        train_dataloader: DataLoader,
        val_dataloader: Optional[DataLoader] = None,
        save_dir: Optional[Path] = None,
    ) -> Dict:
        """Full training loop with validation, early stopping, and progress updates."""
        epochs_without_improvement = 0

        for epoch in range(1, self.epochs + 1):
            train_loss, train_acc = self.train_epoch(train_dataloader)
            self.history["train_loss"].append(float(train_loss))
            self.history["train_accuracy"].append(float(train_acc))
            self.history["epochs"].append(epoch)

            val_loss = None
            val_acc = None

            if val_dataloader:
                val_loss, val_acc, _, _, _ = self.evaluate(val_dataloader)
                self.history["val_loss"].append(float(val_loss))
                self.history["val_accuracy"].append(float(val_acc))

                # Check for improvement
                if val_loss < self.best_val_loss:
                    self.best_val_loss = float(val_loss)
                    epochs_without_improvement = 0

                    if save_dir:
                        self.model.save_model(save_dir)
                else:
                    epochs_without_improvement += 1
            else:
                if save_dir and epoch == self.epochs:
                    self.model.save_model(save_dir)

            # Fire progress callback if provided
            if self.progress_callback:
                self.progress_callback({
                    "current_epoch": epoch,
                    "total_epochs": self.epochs,
                    "train_loss": float(train_loss),
                    "train_accuracy": float(train_acc),
                    "val_loss": float(val_loss) if val_loss is not None else None,
                    "val_accuracy": float(val_acc) if val_acc is not None else None,
                    "best_val_loss": float(self.best_val_loss) if self.best_val_loss != float("inf") else None,
                    "progress_percentage": round((epoch / self.epochs) * 100, 1),
                })

            if self.early_stopping and epochs_without_improvement >= self.patience:
                break

        return self.history

    def compute_metrics(
        self,
        predictions: np.ndarray,
        labels: np.ndarray,
        probabilities: Optional[np.ndarray],
        labels_map: Dict[int, str],
    ) -> Dict:
        """
        Compute comprehensive classification metrics:
        - Accuracy, Precision, Recall, F1
        - Confusion Matrix
        - Per-class metrics
        - ROC-AUC curves (One-vs-Rest)
        - Calibration curves
        """
        from sklearn.metrics import (
            accuracy_score,
            precision_score,
            recall_score,
            f1_score,
            confusion_matrix,
            classification_report,
            roc_curve,
            auc,
        )
        from sklearn.calibration import calibration_curve

        accuracy = float(accuracy_score(labels, predictions))
        precision = float(precision_score(labels, predictions, average="weighted", zero_division=0))
        recall = float(recall_score(labels, predictions, average="weighted", zero_division=0))
        f1 = float(f1_score(labels, predictions, average="weighted", zero_division=0))

        class_indices = sorted(labels_map.keys())
        class_names = [labels_map[i] for i in class_indices]

        # Classification report as dict
        report_dict = classification_report(
            labels,
            predictions,
            labels=class_indices,
            target_names=class_names,
            output_dict=True,
            zero_division=0,
        )

        # Per-class breakdown
        per_class_metrics = {}
        for cname in class_names:
            if cname in report_dict:
                per_class_metrics[cname] = {
                    "precision": float(report_dict[cname].get("precision", 0.0)),
                    "recall": float(report_dict[cname].get("recall", 0.0)),
                    "f1_score": float(report_dict[cname].get("f1-score", 0.0)),
                    "support": int(report_dict[cname].get("support", 0)),
                }

        # Confusion matrix
        cm = confusion_matrix(labels, predictions, labels=class_indices)

        # ROC-AUC computation
        roc_data = {}
        calibration_data = {}

        if probabilities is not None and probabilities.shape[1] == len(class_names):
            # One-vs-Rest ROC curve for each class
            for idx, cname in enumerate(class_names):
                binary_true = (labels == idx).astype(int)
                if np.sum(binary_true) > 0:
                    fpr, tpr, _ = roc_curve(binary_true, probabilities[:, idx])
                    roc_auc = float(auc(fpr, tpr))
                    roc_data[cname] = {
                        "auc": round(roc_auc, 4),
                        "fpr": [round(float(x), 4) for x in fpr[::max(1, len(fpr) // 20)]],
                        "tpr": [round(float(x), 4) for x in tpr[::max(1, len(tpr) // 20)]],
                    }

                    # Calibration curve
                    prob_true, prob_pred = calibration_curve(binary_true, probabilities[:, idx], n_bins=5)
                    calibration_data[cname] = {
                        "prob_true": [round(float(x), 4) for x in prob_true],
                        "prob_pred": [round(float(x), 4) for x in prob_pred],
                    }

        return {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": cm.tolist(),
            "class_names": class_names,
            "per_class_metrics": per_class_metrics,
            "roc_auc_curves": roc_data,
            "calibration_data": calibration_data,
        }
