"""
Dual-Model Mode and A/B Testing Router.

Allows side-by-side comparison of Rule-based analysis vs Machine Learning models
(PyTorch / Scikit-learn), tracking agreement rates, confidence differences,
and traffic-splitting for controlled rollouts.
"""

import time
import random
import logging
from typing import Dict, Any, Optional
from ..models.schemas import (
    JournalAnalysisRequest,
    JournalAnalysisResponse,
    DualModelAnalysisResponse,
)
from .nlp_classifier import _analyze_with_rules
from .model_manager import get_model_manager

logger = logging.getLogger(__name__)


class ABTestRouter:
    """
    Manages dual-model comparison and controlled traffic splitting.
    """

    def __init__(self, pytorch_traffic_pct: float = 0.5, sklearn_traffic_pct: float = 0.3):
        # Remaining percentage defaults to rule-based fallback
        self.pytorch_traffic_pct = pytorch_traffic_pct
        self.sklearn_traffic_pct = sklearn_traffic_pct

    def run_dual_comparison(self, request: JournalAnalysisRequest) -> DualModelAnalysisResponse:
        """
        Execute both rule-based analysis and ML model analysis on the exact same entry,
        measuring latency, confidence deltas, and agreement.
        """
        manager = get_model_manager()

        # 1. Rule-based execution
        t0 = time.time()
        rule_resp = _analyze_with_rules(request)
        rule_resp.model_used = "rules"
        rule_latency = (time.time() - t0) * 1000.0

        # 2. ML execution (prefer PyTorch, fallback to sklearn)
        t1 = time.time()
        program_code = request.student_course.upper().replace(" ", "").replace("-", "_")

        ml_resp = None
        used_model = "rules"

        ml_resp, used_model = manager.predict_with_fallback(request)

        ml_resp.model_used = used_model
        ml_latency = (time.time() - t1) * 1000.0

        # Compare outputs
        is_agreement = (rule_resp.is_course_related == ml_resp.is_course_related) and (
            rule_resp.flag_level == ml_resp.flag_level
        )
        conf_delta = round(abs(rule_resp.confidence_score - ml_resp.confidence_score), 4)

        preview = (
            request.journal_text[:80] + "..."
            if len(request.journal_text) > 80
            else request.journal_text
        )

        recommendation = (
            "Models agree. Confident prediction."
            if is_agreement
            else f"Divergence detected: Rule-based={rule_resp.flag_level} vs {used_model}={ml_resp.flag_level}. Flag for coordinator review."
        )

        return DualModelAnalysisResponse(
            journal_text_preview=preview,
            student_course=request.student_course,
            models_compared=["rules", used_model],
            rule_based_result=rule_resp,
            ml_result=ml_resp,
            is_agreement=is_agreement,
            confidence_delta=conf_delta,
            latency_ms={
                "rules": round(rule_latency, 2),
                used_model: round(ml_latency, 2),
            },
            recommendation=recommendation,
        )

    def route_traffic(self, request: JournalAnalysisRequest) -> str:
        """
        Determine which model should serve this request based on randomized traffic split.
        Returns 'pytorch', 'sklearn', or 'rules'.
        """
        r = random.random()
        if r < self.pytorch_traffic_pct:
            return "pytorch"
        elif r < (self.pytorch_traffic_pct + self.sklearn_traffic_pct):
            return "sklearn"
        else:
            return "rules"


_router_instance: Optional[ABTestRouter] = None

def get_ab_test_router() -> ABTestRouter:
    global _router_instance
    if _router_instance is None:
        _router_instance = ABTestRouter()
    return _router_instance
