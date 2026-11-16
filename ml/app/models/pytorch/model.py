"""
PyTorch model for classifying internship journal entries.

Supports two modes:
1. SentenceTransformer mode (default) — Uses pretrained sentence embeddings
   + classification head. Best for small datasets.
2. HuggingFace Transformer mode — Uses AutoModel with proper tokenization.
   Supports fine-tuning the full model.
"""

import json
import logging
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
import numpy as np
from enum import Enum
from typing import Dict, List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class ModelArchitecture(Enum):
    """Supported PyTorch model architectures."""
    MINILM = "sentence-transformers/all-MiniLM-L6-v2"
    DISTILBERT = "sentence-transformers/distilbert-base-uncased"
    CUSTOM_BERT = "bert-base-uncased"
    CUSTOM_TRANSFORMER = "custom_transformer"


class JournalClassificationModel(nn.Module):
    """
    PyTorch model for classifying internship journal entries.

    Architecture:
        Pretrained Encoder (SentenceTransformer or BERT)
        → Dropout(0.1)
        → Linear(embed_dim, 256)
        → ReLU
        → Dropout(0.1)
        → Linear(256, num_classes)
    """

    def __init__(
        self,
        model_name: str = ModelArchitecture.MINILM.value,
        num_classes: int = 2,
        dropout: float = 0.1,
        max_length: int = 128,
        use_pretrained: bool = True,
    ):
        super().__init__()

        self.model_name = model_name
        self.num_classes = num_classes
        self.max_length = max_length
        self.use_sentence_transformer = False
        self.tokenizer = None

        if model_name.startswith("sentence-transformers/") or "MiniLM" in model_name:
            self._init_sentence_transformer(model_name, dropout, use_pretrained)
        else:
            self._init_huggingface_transformer(model_name, dropout, use_pretrained)

    def _init_sentence_transformer(
        self, model_name: str, dropout: float, use_pretrained: bool
    ):
        """Initialize with SentenceTransformer encoder."""
        from sentence_transformers import SentenceTransformer

        self.use_sentence_transformer = True

        if use_pretrained:
            self.encoder = SentenceTransformer(model_name, device="cpu")
            embedding_dim = self.encoder.get_sentence_embedding_dimension()
        else:
            raise ValueError(
                "SentenceTransformer requires use_pretrained=True. "
                "Use a HuggingFace model name for training from scratch."
            )

        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(embedding_dim, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, self.num_classes),
        )

        logger.info(
            f"Initialized SentenceTransformer model: {model_name} "
            f"(embed_dim={embedding_dim}, classes={self.num_classes})"
        )

    def _init_huggingface_transformer(
        self, model_name: str, dropout: float, use_pretrained: bool
    ):
        """Initialize with HuggingFace AutoModel + AutoTokenizer."""
        from transformers import AutoModel, AutoTokenizer

        self.use_sentence_transformer = False

        if use_pretrained:
            self.encoder = AutoModel.from_pretrained(model_name)
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        else:
            from transformers import AutoConfig
            config = AutoConfig.from_pretrained(model_name)
            self.encoder = AutoModel.from_config(config)
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)

        embedding_dim = self.encoder.config.hidden_size

        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(embedding_dim, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, self.num_classes),
        )

        logger.info(
            f"Initialized HuggingFace model: {model_name} "
            f"(embed_dim={embedding_dim}, classes={self.num_classes})"
        )

    def forward(self, input_ids, attention_mask):
        """
        Forward pass through the model.

        Args:
            input_ids: For SentenceTransformer — list of raw text strings.
                       For HuggingFace — tokenized input IDs tensor.
            attention_mask: For SentenceTransformer — ignored (placeholder).
                           For HuggingFace — attention mask tensor.

        Returns:
            Logits tensor of shape (batch_size, num_classes)
        """
        if self.use_sentence_transformer:
            # SentenceTransformer expects raw text strings
            embeddings = self.encoder.encode(
                input_ids,  # This is actually a list of strings
                convert_to_tensor=True,
                show_progress_bar=False,
            )
            # Ensure 2D: (batch_size, embed_dim)
            if len(embeddings.shape) == 1:
                embeddings = embeddings.unsqueeze(0)
        else:
            # HuggingFace Transformers API — input_ids are proper token tensors
            outputs = self.encoder(
                input_ids=input_ids,
                attention_mask=attention_mask,
            )
            # Use [CLS] token representation
            embeddings = outputs.last_hidden_state[:, 0, :]  # (batch_size, hidden_dim)

        # Classification head
        logits = self.classifier(embeddings)
        return logits

    def save_model(self, save_path: Path):
        """Save model state, config, and optionally tokenizer."""
        save_path = Path(save_path)
        save_path.mkdir(parents=True, exist_ok=True)

        # Save model state (only classifier head — encoder is loaded from pretrained)
        torch.save(
            {
                "classifier_state_dict": self.classifier.state_dict(),
                "model_name": self.model_name,
                "num_classes": self.num_classes,
                "max_length": self.max_length,
                "use_sentence_transformer": self.use_sentence_transformer,
            },
            save_path / "pytorch_model.bin",
        )

        # Save config
        config = {
            "model_name": self.model_name,
            "num_classes": self.num_classes,
            "max_length": self.max_length,
            "use_sentence_transformer": self.use_sentence_transformer,
            "architecture": (
                "sentence-transformer-classifier"
                if self.use_sentence_transformer
                else "huggingface-transformer-classifier"
            ),
        }

        with open(save_path / "config.json", "w") as f:
            json.dump(config, f, indent=2)

        # Save tokenizer if using HuggingFace model
        if self.tokenizer is not None:
            self.tokenizer.save_pretrained(save_path / "tokenizer")

        logger.info(f"Model saved to: {save_path}")

    @classmethod
    def load_model(
        cls,
        load_path: Path,
        num_classes: Optional[int] = None,
        device: str = "cpu",
    ) -> "JournalClassificationModel":
        """
        Load a saved PyTorch model.

        Args:
            load_path: Directory containing saved model files
            num_classes: Override number of classes (optional)
            device: Device to load model onto

        Returns:
            Loaded JournalClassificationModel in eval mode
        """
        load_path = Path(load_path)

        # Load config
        with open(load_path / "config.json", "r") as f:
            config = json.load(f)

        # Create model
        model = cls(
            model_name=config["model_name"],
            num_classes=num_classes or config["num_classes"],
            max_length=config["max_length"],
        )

        # Load classifier head state
        checkpoint = torch.load(
            load_path / "pytorch_model.bin",
            map_location=device,
            weights_only=True,
        )

        # Handle both old and new save formats
        if "classifier_state_dict" in checkpoint:
            model.classifier.load_state_dict(checkpoint["classifier_state_dict"])
        elif "model_state_dict" in checkpoint:
            # Legacy format — load full state dict
            model.load_state_dict(checkpoint["model_state_dict"], strict=False)

        model.to(device)
        model.eval()

        logger.info(f"Model loaded from: {load_path}")
        return model

    def predict_single(self, text: str, device: str = "cpu") -> Tuple[int, np.ndarray]:
        """
        Predict a single text sample.

        Args:
            text: Input journal text
            device: Device for inference

        Returns:
            Tuple of (predicted_class_index, probabilities_array)
        """
        self.eval()
        with torch.no_grad():
            if self.use_sentence_transformer:
                logits = self.forward([text], None)
            else:
                if self.tokenizer is None:
                    raise RuntimeError("Tokenizer not available for HuggingFace model")
                encoded = self.tokenizer(
                    [text],
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                input_ids = encoded["input_ids"].to(device)
                attention_mask = encoded["attention_mask"].to(device)
                logits = self.forward(input_ids, attention_mask)

            probs = torch.softmax(logits, dim=1)
            pred_idx = torch.argmax(probs, dim=1).item()

        return pred_idx, probs[0].cpu().numpy()

    def predict_proba(self, dataloader: DataLoader) -> Tuple[np.ndarray, np.ndarray]:
        """Get class probabilities for all batches."""
        self.eval()

        all_probs = []
        all_labels = []

        with torch.no_grad():
            for batch in dataloader:
                input_ids = batch["input_ids"]
                attention_mask = batch["attention_mask"]
                labels = batch["labels"]

                logits = self(input_ids, attention_mask)
                probs = torch.softmax(logits, dim=1)
                all_probs.append(probs.cpu().numpy())
                all_labels.append(labels.numpy())

        return np.vstack(all_probs), np.concatenate(all_labels)

    def predict(self, dataloader: DataLoader) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Get predictions, labels, and probabilities from a dataloader."""
        probs, labels = self.predict_proba(dataloader)
        predictions = np.argmax(probs, axis=1)
        return predictions, labels, probs
