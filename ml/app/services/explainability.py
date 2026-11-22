"""
Model Interpretability and Explainability Service.

Provides feature attribution and rationale for journal entry predictions:
- Identifies positive tokens driving course alignment
- Identifies negative tokens driving errand or unrelated flags
- Explains model predictions transparently for coordinators and students
"""

import logging
import re
from typing import List, Dict, Tuple
from ..models.schemas import (
    FeatureAttribution,
    JournalExplanationResponse,
    JournalAnalysisRequest,
)
from .nlp_classifier import (
    _fuzzy_detect_errands,
    _detect_course_tasks,
    analyze_journal_entry,
)
from .model_manager import get_model_manager

logger = logging.getLogger(__name__)


def explain_journal_prediction(request: JournalAnalysisRequest) -> JournalExplanationResponse:
    """
    Generate feature attribution and an interpretability summary for a journal entry.
    """
    manager = get_model_manager()
    program_code = request.student_course.upper().replace(" ", "").replace("-", "_")

    # Get standard prediction
    analysis_resp = analyze_journal_entry(request)

    text = request.journal_text
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

    detected_errands = _fuzzy_detect_errands(text)
    detected_tasks = _detect_course_tasks(text.lower(), program_code)

    attributions: List[FeatureAttribution] = []

    # Try extracting linear model coefficients if sklearn model is loaded
    model_code = manager.get_prediction_model_code(program_code) if analysis_resp.model_used == "sklearn" else None
    model = manager.get_sklearn_model(model_code) if model_code else None
    if model is not None and hasattr(model, "named_steps"):
        try:
            vectorizer = model.named_steps.get("vectorizer")
            classifier = model.named_steps.get("classifier")

            if vectorizer and classifier:
                feature_names = vectorizer.get_feature_names_out()
                classes = list(classifier.classes_)
                if classifier.coef_.shape[0] == 1:
                    coefs = classifier.coef_[0]
                    # Binary sklearn weights describe classes_[1], which may be unrelated.
                    if classes[1] != "course_related":
                        coefs = -coefs
                else:
                    coefs = classifier.coef_[classes.index("course_related")]

                # Build dictionary for fast lookup
                vocab = vectorizer.vocabulary_

                word_scores = []
                for word in set(words):
                    if word in vocab:
                        idx = vocab[word]
                        score = float(coefs[idx])
                        word_scores.append((word, score))

                # Sort by absolute impact
                word_scores.sort(key=lambda x: abs(x[1]), reverse=True)

                for word, weight in word_scores[:10]:
                    impact = "positive" if weight > 0 else "negative"
                    attributions.append(
                        FeatureAttribution(
                            feature=word,
                            importance_weight=round(weight, 4),
                            impact=impact,
                        )
                    )
        except Exception as e:
            logger.warning(f"Could not compute TF-IDF linear attributions: {e}")

    # If no linear weights available, construct heuristic attributions based on detected tasks & errands
    if not attributions:
        for task in detected_tasks:
            attributions.append(
                FeatureAttribution(
                    feature=task,
                    importance_weight=1.5,
                    impact="positive",
                )
            )
        for errand in detected_errands:
            attributions.append(
                FeatureAttribution(
                    feature=errand,
                    importance_weight=-1.5,
                    impact="negative",
                )
            )

    # Human-readable summary
    positive_words = [a.feature for a in attributions if a.impact == "positive"]
    negative_words = [a.feature for a in attributions if a.impact == "negative"]

    parts = []
    if positive_words:
        parts.append(f"Strong course alignment indicators: {', '.join(positive_words[:4])}.")
    if negative_words:
        parts.append(f"Non-technical or errand indicators: {', '.join(negative_words[:4])}.")
    if not parts:
        parts.append("General description without specific technical or errand keywords.")

    summary = " ".join(parts)

    return JournalExplanationResponse(
        journal_text=request.journal_text,
        student_course=request.student_course,
        predicted_label="course_related" if analysis_resp.is_course_related else analysis_resp.flag_level,
        confidence=analysis_resp.confidence_score,
        model_type=analysis_resp.model_used or "fallback",
        top_features=attributions,
        detected_errands=detected_errands,
        detected_course_tasks=detected_tasks,
        explanation_summary=summary,
    )
