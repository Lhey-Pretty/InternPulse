import json
from pathlib import Path
from typing import Dict, List, Optional
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime


class MetricsVisualizer:
    """Visualize training metrics and model performance."""

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or Path("ml/logs/metrics")

        # Setup plots
        sns.set_style("whitegrid")
        self.colors = {
            "train": "#1f77b4",
            "val": "#ff7f0e",
            "best": "#2ca02c",
        }

    def plot_training_history(self, history: Dict, save_path: Optional[Path] = None) -> Figure:
        """
        Plot training and validation loss/accuracy curves.

        Args:
            history: Training history dictionary
            save_path: Path to save the figure (optional)

        Returns:
            Matplotlib figure
        """
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        epochs = range(1, len(history["train_loss"]) + 1)

        # Loss curve
        axes[0].plot(
            epochs, history["train_loss"],
            label="Train Loss", color=self.colors["train"], marker='o'
        )
        if "val_loss" in history and history["val_loss"]:
            axes[0].plot(
                epochs, history["val_loss"],
                label="Val Loss", color=self.colors["val"], marker='s'
            )
        axes[0].set_xlabel("Epoch")
        axes[0].set_ylabel("Loss")
        axes[0].set_title("Training & Validation Loss")
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)

        # Accuracy curve
        axes[1].plot(
            epochs, history["train_accuracy"],
            label="Train Accuracy", color=self.colors["train"], marker='o'
        )
        if "val_accuracy" in history and history["val_accuracy"]:
            axes[1].plot(
                epochs, history["val_accuracy"],
                label="Val Accuracy", color=self.colors["val"], marker='s'
            )
        axes[1].set_xlabel("Epoch")
        axes[1].set_ylabel("Accuracy")
        axes[1].set_title("Training & Validation Accuracy")
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)

        plt.tight_layout()

        if save_path:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path, dpi=300, bbox_inches="tight")
            print(f"[OK] Training history plot saved to: {save_path}")

        return fig

    def plot_confusion_matrix(
        self,
        classes: List[str],
        cm: List[List[int]],
        save_path: Optional[Path] = None,
    ) -> Figure:
        """
        Plot confusion matrix heatmap.

        Args:
            classes: List of class names
            cm: Confusion matrix as 2D list
            save_path: Path to save the figure (optional)

        Returns:
            Matplotlib figure
        """
        fig, ax = plt.subplots(figsize=(10, 8))

        disp = sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=classes,
            yticklabels=classes,
            ax=ax,
        )

        ax.set_title("Confusion Matrix", fontsize=14, pad=20)
        ax.set_xlabel("Predicted Label", fontsize=12)
        ax.set_ylabel("True Label", fontsize=12)

        plt.tight_layout()

        if save_path:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path, dpi=300, bbox_inches="tight")
            print(f"[OK] Confusion matrix saved to: {save_path}")

        return fig

    def plot_dashboard(
        self,
        results: Dict,
        save_path: Optional[Path] = None,
    ) -> Dict[str, Figure]:
        """
        Create comprehensive dashboard with multiple metrics.

        Args:
            results: Training results dictionary
            save_path: Base path for dashboard plots

        Returns:
            Dictionary of Figure objects
        """
        dashboard = {}

        metrics = results["metrics"]

        # 1. Performance metrics bar chart
        fig, ax = plt.subplots(figsize=(10, 6))
        metrics_data = {
            "Accuracy": metrics["accuracy"],
            "Precision": metrics["precision"],
            "Recall": metrics["recall"],
            "F1 Score": metrics["f1_score"],
        }

        bars = ax.bar(metrics_data.keys(), metrics_data.values(), color=[
            "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"
        ])

        for bar in bars:
            height = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2.,
                height,
                f'{height:.4f}',
                ha='center', va='bottom'
            )

        ax.set_title("Model Performance Metrics", fontsize=14, pad=20)
        ax.set_ylim(0, 1.0)
        ax.set_ylabel("Score")
        plt.xticks(rotation=45)
        plt.tight_layout()

        if save_path:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(save_path / "performance_metrics.png", dpi=300, bbox_inches="tight")
            print(f"[OK] Performance metrics dashboard saved to: {save_path / 'performance_metrics.png'}")

        dashboard["performance"] = fig

        # 2. Per-class precision/recall/F1
        class_names = metrics.get("class_names", [])
        if class_names:
            fig, axes = plt.subplots(1, 3, figsize=(16, 5))

            for idx, metric_name in enumerate(["precision", "recall", "f1_score"]):
                ax = axes[idx]
                values = metrics.get(metric_name, {})

                # Get list of values for all classes
                if isinstance(values, dict):
                    values = [values.get(cls, 0.0) for cls in class_names]

                bars = ax.bar(class_names, values, color="#1f77b4")

                for bar in bars:
                    height = bar.get_height()
                    ax.text(
                        bar.get_x() + bar.get_width() / 2.,
                        height + 0.01,
                        f'{height:.3f}',
                        ha='center', va='bottom', fontsize=8
                    )

                ax.set_title(metric_name.replace("_", " ").title(), fontsize=12, pad=10)
                ax.tick_params(axis='x', rotation=45, labelsize=8)
                ax.set_ylim(0, 1.0)

            plt.tight_layout()

            if save_path:
                plt.savefig(save_path / "per_class_metrics.png", dpi=300, bbox_inches="tight")
                print(f"[OK] Per-class metrics saved to: {save_path / 'per_class_metrics.png'}")

            dashboard["per_class"] = fig

        # 3. ROC-AUC curves (if probability data available)
        # TODO: Add ROC-AUC visualization

        return dashboard

    def generate_markdown_summary(
        self,
        results: Dict,
        save_path: Optional[Path] = None,
    ) -> str:
        """
        Generate a markdown summary of training results.

        Args:
            results: Training results dictionary
            save_path: Path to save the markdown file

        Returns:
            Markdown text
        """
        metrics = results["metrics"]

        summary = f"""# Training Summary

**Program:** {results['program_code']}
**Model:** {results['model_name']}
**Timestamp:** {results.get('training', {}).get('timestamp', 'unknown')}

## Model Performance

| Metric | Value |
|--------|-------|
| Accuracy | {metrics['accuracy']:.4f} |
| Precision | {metrics['precision']:.4f} |
| Recall | {metrics['recall']:.4f} |
| F1 Score | {metrics['f1_score']:.4f} |
| Best Val Loss | {results.get('best_val_loss', 0):.4f} |

## Class Performance

{self._format_class_metrics(metrics)}

## Training Details

- Epochs: {results['training']['epochs']}
- Batch Size: {results['training']['batch_size']}
- Learning Rate: {results['training']['learning_rate']}
- Device: {results['training']['device']}
- Train Samples: {results['dataset']['train_samples']}
- Test Samples: {results['dataset']['test_samples']}

## Confusion Matrix

```
{self._format_confusion_matrix(metrics['confusion_matrix'])}
```
"""

        if save_path:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            save_path.write_text(summary, encoding="utf-8")
            print(f"[OK] Markdown summary saved to: {save_path}")

        return summary

    def _format_class_metrics(self, metrics: Dict) -> str:
        """Format per-class metrics as markdown table."""
        class_names = metrics.get("class_names", [])
        if not class_names:
            return "No class-level data available."

        table = "| Class | Precision | Recall | F1 |\n|--------|-----------|--------|-----|\n"

        for cls in class_names:
            precision = metrics.get("precision", {}).get(cls, 0.0)
            recall = metrics.get("recall", {}).get(cls, 0.0)
            f1 = metrics.get("f1_score", {}).get(cls, 0.0)

            table += f"| {cls} | {precision:.4f} | {recall:.4f} | {f1:.4f} |\n"

        return table

    def _format_confusion_matrix(self, cm: List[List[int]]) -> str:
        """Format confusion matrix as markdown table."""
        lines = []
        num_classes = len(cm)

        header = " | "
        header += " | ".join([f"Pred_{i}" for i in range(num_classes)])
        lines.append(header + " |")

        separator = " | " + " | ".join(["---"] * num_classes) + " |"
        lines.append(separator)

        for i in range(num_classes):
            row = f"True_{i} | "
            row += " | ".join([str(val) for val in cm[i]])
            lines.append(row + " |")

        return "\n".join(lines)


from matplotlib.figure import Figure