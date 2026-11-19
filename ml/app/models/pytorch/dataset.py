"""
PyTorch Dataset and DataLoader for journal classification.

Handles text tokenization using HuggingFace AutoTokenizer,
label mapping, and batched data loading.
"""

from torch.utils.data import Dataset, DataLoader
import torch
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class JournalClassificationDataset(Dataset):
    """PyTorch dataset for internship journal classification."""

    def __init__(
        self,
        texts: List[str],
        labels: List[str],
        labels_map: Optional[Dict[str, int]] = None,
        max_length: int = 128,
    ):
        if labels_map is None:
            # Auto-create label mapping
            unique_labels = sorted(set(labels))
            self.labels_map = {label: idx for idx, label in enumerate(unique_labels)}
        else:
            self.labels_map = labels_map

        self.reverse_labels_map = {idx: label for label, idx in self.labels_map.items()}

        self.texts = texts
        self.labels = [self.labels_map[label] for label in labels]
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]

        return {
            "text": text,
            "labels": torch.tensor(label, dtype=torch.long),
        }


class TokenizerCollator:
    """
    Collate function that tokenizes text batches using a HuggingFace tokenizer.

    This is the proper way to handle tokenization — in the collate function
    rather than __getitem__, so we can batch-tokenize with dynamic padding.
    """

    def __init__(self, tokenizer, max_length: int = 128):
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __call__(self, batch: List[Dict]) -> Dict[str, torch.Tensor]:
        texts = [item["text"] for item in batch]
        labels = torch.stack([item["labels"] for item in batch])

        # Batch tokenization with padding and truncation
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )

        return {
            "input_ids": encoded["input_ids"],
            "attention_mask": encoded["attention_mask"],
            "labels": labels,
            "texts": texts,
        }


class SentenceTransformerCollator:
    """
    Collate function for SentenceTransformer models.

    SentenceTransformers expect raw text strings (not token IDs),
    so we pass texts through and let the model's encode() handle tokenization.
    """

    def __init__(self, max_length: int = 128):
        self.max_length = max_length

    def __call__(self, batch: List[Dict]) -> Dict[str, torch.Tensor]:
        texts = [item["text"] for item in batch]
        labels = torch.stack([item["labels"] for item in batch])

        # SentenceTransformer handles its own tokenization in encode()
        # We pass raw texts and use placeholder tensors for input_ids/attention_mask
        return {
            "input_ids": texts,  # Raw strings for SentenceTransformer.encode()
            "attention_mask": torch.ones(len(texts), dtype=torch.long),  # Placeholder
            "labels": labels,
            "texts": texts,
        }


def create_dataloader(
    texts: List[str],
    labels: List[str],
    batch_size: int = 32,
    max_length: int = 128,
    tokenizer=None,
    labels_map: Optional[Dict[str, int]] = None,
    shuffle: bool = True,
    num_workers: int = 0,
    use_sentence_transformer: bool = False,
) -> Tuple[DataLoader, Dict[str, int]]:
    """
    Create a PyTorch DataLoader for batch processing.

    Args:
        texts: List of journal text entries
        labels: List of label strings
        batch_size: Batch size for the DataLoader
        max_length: Maximum token sequence length
        tokenizer: HuggingFace tokenizer instance (or None for SentenceTransformer)
        labels_map: Optional pre-defined label-to-index mapping
        shuffle: Whether to shuffle the data
        num_workers: Number of worker processes for data loading
        use_sentence_transformer: If True, use SentenceTransformerCollator

    Returns:
        Tuple of (DataLoader, labels_map dict)
    """
    dataset = JournalClassificationDataset(
        texts=texts,
        labels=labels,
        labels_map=labels_map,
        max_length=max_length,
    )

    # Select the appropriate collator
    if use_sentence_transformer or tokenizer is None:
        collator = SentenceTransformerCollator(max_length=max_length)
    else:
        collator = TokenizerCollator(tokenizer=tokenizer, max_length=max_length)

    dataloader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        collate_fn=collator,
        num_workers=num_workers,
    )

    return dataloader, dataset.labels_map


def load_dataset_from_csv(dataset_path: Path) -> Tuple[List[str], List[str]]:
    """
    Load dataset from CSV file with proper encoding and flexible column resolution.
    Supports 'journal_text', 'Task', 'content', etc.
    """
    df = pd.read_csv(dataset_path, encoding="utf-8-sig")

    text_col = None
    for candidate in ["journal_text", "Task", "task", "content", "entry", "text"]:
        if candidate in df.columns:
            text_col = candidate
            break

    label_col = None
    for candidate in ["label", "category", "target", "class"]:
        if candidate in df.columns:
            label_col = candidate
            break

    if not text_col or not label_col:
        raise ValueError(f"CSV must contain text and label columns. Found: {df.columns.tolist()}")

    # Drop rows with missing values
    df = df.dropna(subset=[text_col, label_col])
    
    if "Title" in df.columns:
        texts = [
            f"{row['Title'].strip()}. {row[text_col].strip()}"
            if pd.notna(row.get("Title")) and str(row.get("Title")).strip() not in str(row[text_col])
            else str(row[text_col]).strip()
            for _, row in df.iterrows()
        ]
    else:
        texts = [str(t).strip() for t in df[text_col].tolist()]

    labels = [str(l).strip() for l in df[label_col].tolist()]

    # Filter non-empty
    valid = [(t, l) for t, l in zip(texts, labels) if t and l]
    if not valid:
        raise ValueError(f"No valid non-empty samples found in {dataset_path}")

    return [v[0] for v in valid], [v[1] for v in valid]
