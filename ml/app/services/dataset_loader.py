"""
Multi-Program Dataset Loader and Classifier Trainer
Loads classification datasets for all programs and trains sklearn models
"""

import logging
import os
import pandas as pd
from typing import Dict, Tuple, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import joblib

logger = logging.getLogger(__name__)

# Map program codes to their dataset files
PROGRAM_DATASET_MAP = {
    "BSIT": "IT_Filtered_Dataset.xlsx",
    "BSCPE": "Computer_Engineering_dataset.csv",
    "BSTM": "TM-filtered_ojt_dataset_2.csv",
    "BSHM": "filtered_HM_dataset.csv",
    "BSCRIM": "Criminology_dataset.csv",
    "BSED_ENGLISH": "filtered_BSED_English_dataset.csv",
    "BSED_SCIENCE": "BSED_Science_dataset.csv",
    "BSED_MATH": "filtered_BSED_Mathematics_dataset.csv",
    "BEED": "filtered_BEED_dataset.csv",
    "FISHERIES": "Fisheries_dataset.csv",
    "POLSCI": "filtered_Political_Science_dataset.csv",
}

DATASETS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "datasets"
)

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models"
)


def load_program_dataset(program_code: str) -> Optional[pd.DataFrame]:
    """
    Load classification dataset for a specific program.
    
    Expected CSV format:
    - task_description (text column)
    - label (classification: 'course_related', 'errand', 'unrelated')
    
    Returns DataFrame or None if file not found.
    """
    filename = PROGRAM_DATASET_MAP.get(program_code)
    if not filename:
        logger.warning(f"No dataset mapping found for program: {program_code}")
        return None
    
    filepath = os.path.join(DATASETS_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"Dataset file not found: {filepath}")
        return None
    
    try:
        if os.path.splitext(filepath)[1].lower() in {".xlsx", ".xls"}:
            df = pd.read_excel(filepath)
        else:
            df = pd.read_csv(filepath, encoding="utf-8-sig")
        
        # Flexible column name detection
        text_col = None
        label_col = None
        
        for col in df.columns:
            col_lower = col.lower()
            if 'task' in col_lower or 'description' in col_lower or 'text' in col_lower or 'activity' in col_lower:
                text_col = col
            if 'label' in col_lower or 'classification' in col_lower or 'category' in col_lower:
                label_col = col
        
        if text_col is None or label_col is None:
            logger.error(f"Could not identify text/label columns in {filename}. Columns: {df.columns.tolist()}")
            return None
        
        # Standardize column names
        df = df.rename(columns={text_col: 'task_description', label_col: 'label'})
        
        # Keep only needed columns and remove nulls
        df = df[['task_description', 'label']].dropna()
        
        logger.info(f"Loaded {len(df)} records from {filename} for {program_code}")
        return df
    
    except Exception as e:
        logger.error(f"Error loading dataset {filename}: {e}")
        return None


def train_program_classifier(program_code: str, df: pd.DataFrame) -> Optional[Pipeline]:
    """
    Train a classification model for a specific program.
    
    Uses TF-IDF + Random Forest pipeline.
    Returns trained pipeline or None if training fails.
    """
    if len(df) < 10:
        logger.warning(f"Not enough data to train {program_code} classifier (only {len(df)} records)")
        return None
    
    try:
        X = df['task_description']
        y = df['label']
        
        # Create sklearn pipeline
        pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=500,
                ngram_range=(1, 2),
                min_df=2,
                stop_words='english'
            )),
            ('classifier', RandomForestClassifier(
                n_estimators=100,
                max_depth=20,
                random_state=42,
                class_weight='balanced'
            ))
        ])
        
        # Train model
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(df) > 20 else None
        )
        
        pipeline.fit(X_train, y_train)
        
        # Log accuracy
        train_score = pipeline.score(X_train, y_train)
        test_score = pipeline.score(X_test, y_test)
        logger.info(f"{program_code} classifier trained - Train: {train_score:.2f}, Test: {test_score:.2f}")
        
        return pipeline
    
    except Exception as e:
        logger.error(f"Error training {program_code} classifier: {e}")
        return None


def save_classifier(program_code: str, pipeline: Pipeline) -> bool:
    """Save trained classifier to models directory."""
    try:
        os.makedirs(MODELS_DIR, exist_ok=True)
        model_path = os.path.join(MODELS_DIR, f"{program_code.lower()}_classifier.joblib")
        joblib.dump(pipeline, model_path)
        logger.info(f"Saved {program_code} classifier to {model_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving {program_code} classifier: {e}")
        return False


def load_classifier(program_code: str) -> Optional[Pipeline]:
    """Load a trained classifier from disk."""
    model_path = os.path.join(MODELS_DIR, f"{program_code.lower()}_classifier.joblib")
    
    if not os.path.exists(model_path):
        logger.warning(f"Classifier not found for {program_code} at {model_path}")
        return None
    
    try:
        pipeline = joblib.load(model_path)
        logger.info(f"Loaded {program_code} classifier from {model_path}")
        return pipeline
    except Exception as e:
        logger.error(f"Error loading {program_code} classifier: {e}")
        return None


def train_all_classifiers() -> Dict[str, bool]:
    """
    Train classifiers for all programs that have datasets.
    Returns dict mapping program_code -> success status.
    """
    results = {}
    
    for program_code in PROGRAM_DATASET_MAP.keys():
        logger.info(f"Training classifier for {program_code}...")
        
        df = load_program_dataset(program_code)
        if df is None:
            results[program_code] = False
            continue
        
        pipeline = train_program_classifier(program_code, df)
        if pipeline is None:
            results[program_code] = False
            continue
        
        success = save_classifier(program_code, pipeline)
        results[program_code] = success
    
    return results


if __name__ == "__main__":
    # Train all classifiers when run directly
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting multi-program classifier training...")
    
    results = train_all_classifiers()
    
    print("\n=== Training Results ===")
    for program, success in results.items():
        status = "✓ SUCCESS" if success else "✗ FAILED"
        print(f"{program:20} {status}")
    
    successful = sum(1 for s in results.values() if s)
    print(f"\nTotal: {successful}/{len(results)} classifiers trained successfully")
