"""
Batch Processor for High-Throughput Journal Analysis.

Processes batches of 1,000+ journal entries with chunking,
progress tracking, and aggregated statistics.
"""

import time
import logging
from typing import List, Optional
from ..models.schemas import (
    BatchJournalItem,
    BatchJournalResultItem,
    BatchJournalAnalysisResponse,
    JournalAnalysisRequest,
)
from .model_manager import get_model_manager

logger = logging.getLogger(__name__)


def process_journal_batch(
    entries: List[BatchJournalItem],
    preferred_model: Optional[str] = None,
    chunk_size: int = 128,
) -> BatchJournalAnalysisResponse:
    """
    Process a list of journal entries in batches.
    Maintains fast throughput by grouping and leveraging warm model caches.
    """
    start_time = time.time()
    manager = get_model_manager()

    results: List[BatchJournalResultItem] = []
    success_count = 0
    failure_count = 0

    for i in range(0, len(entries), chunk_size):
        chunk = entries[i : i + chunk_size]
        for item in chunk:
            try:
                req = JournalAnalysisRequest(
                    student_course=item.student_course,
                    journal_text=item.journal_text,
                    preferred_model=preferred_model,
                )
                resp, model_used = manager.predict_with_fallback(req, preferred_model=preferred_model)

                results.append(
                    BatchJournalResultItem(
                        id=item.id,
                        student_course=item.student_course,
                        is_course_related=resp.is_course_related,
                        confidence_score=resp.confidence_score,
                        flag_level=resp.flag_level,
                        detected_tasks=resp.detected_tasks,
                        feedback=resp.feedback,
                        model_used=model_used,
                    )
                )
                success_count += 1
            except Exception as e:
                logger.warning(f"Error processing entry {item.id}: {e}")
                results.append(
                    BatchJournalResultItem(
                        id=item.id,
                        student_course=item.student_course,
                        is_course_related=False,
                        confidence_score=0.0,
                        flag_level="Unrelated",
                        detected_tasks=[],
                        feedback=f"Processing error: {str(e)}",
                        model_used="error_fallback",
                    )
                )
                failure_count += 1

    elapsed_ms = (time.time() - start_time) * 1000.0

    return BatchJournalAnalysisResponse(
        total_processed=len(entries),
        success_count=success_count,
        failure_count=failure_count,
        processing_time_ms=round(elapsed_ms, 2),
        results=results,
    )
