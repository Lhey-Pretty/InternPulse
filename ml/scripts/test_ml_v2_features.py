"""
Comprehensive verification test script for InternPulse ML v2 features.
Directly tests endpoint functions and services to guarantee functionality.
"""

import sys
import os
import asyncio

# Ensure ml package is on path
current_dir = os.path.dirname(os.path.abspath(__file__))
ml_dir = os.path.dirname(current_dir)
sys.path.insert(0, ml_dir)

from app.models.schemas import (
    JournalAnalysisRequest,
    LaravelJournalAnalyzeRequest,
    BatchJournalItem,
    BatchJournalAnalysisRequest,
    OptunaOptimizationRequest,
)
from app.main import (
    health,
    analyze_journal_endpoint,
    laravel_journal_analyze_endpoint,
    batch_analyze_endpoint,
    dual_model_analyze_endpoint,
    explain_journal_endpoint,
    list_models_endpoint,
    get_program_metrics_endpoint,
    optimize_hyperparameters_endpoint,
    startup_event,
)
from fastapi import BackgroundTasks

async def run_tests():
    print("\n" + "="*70)
    print("VERIFYING INTERNPULSE ML V2 MICROSERVICE")
    print("="*70)

    # 1. Warm startup
    print("\n[1] Testing warm startup & model preloading...")
    await startup_event()
    h = health()
    print("  Health status:", h["status"])
    print("  Cached skill programs:", len(h["cached_programs"]))
    print("  Sklearn models loaded in memory:", h["model_governance"]["sklearn_models_loaded"])
    print("  Models registered:", h["model_governance"]["registry_summary"]["total_models"])
    assert h["model_governance"]["sklearn_models_loaded"] >= 8

    # 2. Journal analysis with unified fallback chain
    print("\n[2] Testing /api/ml/analyze-journal (Course Related entry)...")
    req = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="I developed a REST API endpoint using FastAPI and wrote unit tests for the authentication controller.",
    )
    res = analyze_journal_endpoint(req)
    print("  Model used:", res.model_used)
    print("  Is course related:", res.is_course_related)
    print("  Confidence:", res.confidence_score)
    print("  Flag level:", res.flag_level)
    print("  Detected tasks:", res.detected_tasks)
    assert res.is_course_related == True

    print("\n[2b] Testing /api/ml/analyze-journal (Errand entry)...")
    req_errand = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="I bought coffee and merienda for the senior engineers and swept the office floor.",
    )
    res_errand = analyze_journal_endpoint(req_errand)
    print("  Model used:", res_errand.model_used)
    print("  Is course related:", res_errand.is_course_related)
    print("  Confidence:", res_errand.confidence_score)
    print("  Flag level:", res_errand.flag_level)
    assert "Errand" in res_errand.flag_level or res_errand.is_course_related == False

    # 3. Laravel Compatibility Endpoint
    print("\n[3] Testing Laravel compatibility endpoint /api/journal/analyze...")
    bg = BackgroundTasks()
    req_laravel = LaravelJournalAnalyzeRequest(
        journal_entry_id=42,
        student_course="BSIT",
        journal_text="Configured Docker containers and migrated the database schema using Laravel Artisan.",
    )
    res_laravel = await laravel_journal_analyze_endpoint(req_laravel, bg)
    print("  Journal ID:", res_laravel["journal_entry_id"])
    print("  Is related:", res_laravel["is_course_related"])
    print("  Model used:", res_laravel["model_used"])
    assert res_laravel["journal_entry_id"] == 42

    # 4. Batch Processing
    print("\n[4] Testing /api/ml/batch-analyze (High-throughput batching)...")
    batch_req = BatchJournalAnalysisRequest(
        entries=[
            BatchJournalItem(id=1, student_course="BSIT", journal_text="Fixed MySQL connection timeout in Laravel service."),
            BatchJournalItem(id=2, student_course="BSCRIM", journal_text="Conducted fingerprint dactyloscopy examination on evidence."),
            BatchJournalItem(id=3, student_course="BEED", journal_text="Prepared flashcards and lesson plan for kindergarten phonics reading."),
            BatchJournalItem(id=4, student_course="BSIT", journal_text="Wala kaming ginawa, tambay lang sa pantry buong araw."),
        ]
    )
    res_batch = batch_analyze_endpoint(batch_req)
    print(f"  Processed {res_batch.total_processed} entries in {res_batch.processing_time_ms} ms")
    for r in res_batch.results:
        print(f"    - ID {r.id} ({r.student_course}): related={r.is_course_related}, flag={r.flag_level}, model={r.model_used}")
    assert res_batch.success_count == 4

    # 5. Dual-Model Mode
    print("\n[5] Testing /api/ml/analyze-journal/dual (Dual-Model Mode)...")
    req_dual = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="Wrote PHP code for user authentication and fixed git merge conflicts.",
    )
    res_dual = dual_model_analyze_endpoint(req_dual)
    print("  Models compared:", res_dual.models_compared)
    print(f"  Rule result: {res_dual.rule_based_result.flag_level} (conf: {res_dual.rule_based_result.confidence_score})")
    print(f"  ML result: {res_dual.ml_result.flag_level} (conf: {res_dual.ml_result.confidence_score})")
    print("  Is agreement:", res_dual.is_agreement)
    print("  Latencies (ms):", res_dual.latency_ms)
    print("  Recommendation:", res_dual.recommendation)
    assert res_dual.models_compared[0] == "rules"

    # 6. Model Interpretability & Explainability
    print("\n[6] Testing /api/ml/explain (Feature Attribution)...")
    req_exp = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="I deployed the backend server on Linux, debugged the SQL database queries, and then went out to buy coffee.",
    )
    res_exp = explain_journal_endpoint(req_exp)
    print("  Predicted label:", res_exp.predicted_label)
    print("  Summary:", res_exp.explanation_summary)
    print("  Top features:")
    for feat in res_exp.top_features[:5]:
        print(f"    * {feat.feature}: weight={feat.importance_weight} ({feat.impact})")
    assert len(res_exp.top_features) > 0

    # 7. Model Governance & Versioning
    print("\n[7] Testing /api/ml/models (Model Registry & Governance)...")
    res_models = list_models_endpoint(program_code="BSIT")
    print("  Summary:", res_models["summary"])
    print(f"  BSIT models found: {len(res_models['models'])}")
    assert len(res_models["models"]) >= 1

    # 8. Evaluation Metrics
    print("\n[8] Testing /api/ml/metrics/BSIT...")
    res_metrics = get_program_metrics_endpoint("BSIT")
    print("  Accuracy:", res_metrics.accuracy)
    print("  Weighted F1:", res_metrics.f1_score)
    print("  Classes:", res_metrics.class_names)
    print("  Confusion matrix:", res_metrics.confusion_matrix)
    if res_metrics.roc_auc_curves:
        for cname, curve in res_metrics.roc_auc_curves.items():
            print(f"  ROC-AUC ({cname}): {curve.get('auc')}")
    assert res_metrics.accuracy > 0.85

    # 9. Hyperparameter Optimization
    print("\n[9] Testing /api/ml/optimize-hyperparameters (GridSearch/Optuna)...")
    res_opt = optimize_hyperparameters_endpoint(OptunaOptimizationRequest(
        program_code="BSCRIM",
        n_trials=2
    ))
    print("  Optimizer:", res_opt.optimizer)
    print("  Trials completed:", res_opt.n_trials_completed)
    print("  Best score:", res_opt.best_score)
    print("  Best params:", res_opt.best_params)
    assert res_opt.best_score > 0.8

    print("\n" + "="*70)
    print("ALL INTERNPULSE ML V2 FEATURES VERIFIED SUCCESSFULLY!")
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
