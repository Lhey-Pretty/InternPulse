"""Regression checks for the twelfth runtime model and shared journal fallback."""

from contextlib import contextmanager
import hashlib
import json
import warnings
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

import joblib
import numpy as np
from fastapi.testclient import TestClient
from sklearn.exceptions import InconsistentVersionWarning

import app.main as main
from app.config import MODELS_DIR
from app.models.schemas import JournalAnalysisRequest, SUPPORTED_COURSES
from app.services.model_manager import ModelManager, REQUIRED_MODEL_CODES
from app.services.model_registry import ModelRegistry

TEXT = "I implemented a Laravel API and debugged the database queries."


class JournalRuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loaded = ModelManager()
        cls.loaded.preload_all()

    def manager(self):
        manager = ModelManager()
        manager._sklearn_models = dict(self.loaded._sklearn_models)
        manager._startup_complete = True
        return manager

    @contextmanager
    def client(self, manager):
        # The manager is already loaded; do not reload failure fixtures through lifespan.
        with patch("app.services.model_manager._model_manager", manager), patch.object(main, "_DATASETS_READY", True):
            client = TestClient(main.app, raise_server_exceptions=False)
            try:
                yield client
            finally:
                client.close()

    def test_startup_requires_twelve_models_without_artifact_writes(self):
        manager = ModelManager()
        with patch.object(ModelRegistry, "_save", side_effect=AssertionError("Registry write")), patch.object(joblib, "dump", side_effect=AssertionError("Artifact write")), patch("app.services.model_manager._model_manager", manager):
            with TestClient(main.app) as client:
                response = client.get("/health")
                self.assertEqual(response.status_code, 200)
                status = response.json()["model_governance"]
                self.assertEqual(status["expected_models"], 12)
                self.assertEqual(status["sklearn_models_loaded"], 12)
                self.assertEqual(set(status["sklearn_programs"]), REQUIRED_MODEL_CODES)
                self.assertEqual(status["missing_programs"], [])
                self.assertEqual(status["failed_programs"], {})
                self.assertEqual(status["pytorch_models_loaded"], 0)
                self.assertEqual(set(manager.get_sklearn_model("JOURNAL").classes_), {"course_related", "unrelated"})

    def test_shared_fallback_used_by_every_journal_flow_for_every_course(self):
        for course in sorted(SUPPORTED_COURSES):
            with self.subTest(course=course):
                manager = self.manager()
                manager._sklearn_models.pop(course)
                journal = manager.get_sklearn_model("JOURNAL")
                body = {"student_course": course, "journal_text": TEXT}
                with patch.object(journal, "predict", wraps=journal.predict) as predict, self.client(manager) as client:
                    self.assertEqual(client.get("/health").status_code, 503)
                    for endpoint in ["/api/ml/analyze-journal", "/api/journal/analyze"]:
                        response = client.post(endpoint, json=body)
                        self.assertEqual(response.status_code, 200, response.text)
                        self.assertEqual(response.json()["model_used"], "sklearn")
                        self.assertIn("JOURNAL", response.json()["feedback"])
                    batch = client.post("/api/ml/batch-analyze", json={"entries": [{**body, "id": 1}]})
                    self.assertEqual(batch.status_code, 200, batch.text)
                    self.assertEqual(batch.json()["results"][0]["model_used"], "sklearn")
                    self.assertIn("JOURNAL", batch.json()["results"][0]["feedback"])
                    dual = client.post("/api/ml/analyze-journal/dual", json=body)
                    self.assertEqual(dual.status_code, 200, dual.text)
                    self.assertIn("JOURNAL", dual.json()["ml_result"]["feedback"])
                    explanation = client.post("/api/ml/explain", json=body)
                    self.assertEqual(explanation.status_code, 200, explanation.text)
                    self.assertEqual(explanation.json()["model_type"], "sklearn")
                    self.assertEqual(predict.call_count, 5)
                    for call in predict.call_args_list:
                        self.assertEqual(call.args[0], [TEXT])

    def test_course_classifier_remains_first_choice(self):
        manager = self.manager()
        journal = manager.get_sklearn_model("JOURNAL")
        with patch.object(journal, "predict", side_effect=AssertionError("Must use course model")) as shared_predict:
            for course in sorted(SUPPORTED_COURSES):
                with self.subTest(course=course):
                    response, used = manager.predict_with_fallback(JournalAnalysisRequest(student_course=course, journal_text=TEXT))
                    self.assertEqual(used, "sklearn")
                    self.assertNotIn("JOURNAL", response.feedback)
            shared_predict.assert_not_called()

    def test_course_prediction_failure_uses_journal_and_degrades_health(self):
        manager = self.manager()
        primary = manager.get_sklearn_model("BSTM")
        with patch.object(primary, "predict", side_effect=RuntimeError("private failure")), self.assertLogs("app.services.model_manager", level="ERROR"), self.client(manager) as client:
            response = client.post("/api/journal/analyze", json={"student_course": "BSTM", "journal_text": TEXT})
            self.assertEqual(response.status_code, 200)
            self.assertIn("JOURNAL", response.json()["feedback"])
            health = client.get("/health")
            self.assertEqual(health.status_code, 503)
            status = health.json()["model_governance"]
            self.assertEqual(status["failed_programs"], {"BSTM": "prediction_failed"})
            self.assertEqual(status["missing_programs"], ["BSTM"])
            self.assertEqual(status["sklearn_models_loaded"], 11)
            self.assertNotIn("private failure", health.text + response.text)

    def test_both_models_failing_returns_rules_and_quarantines_failures(self):
        manager = self.manager()
        primary = manager.get_sklearn_model("BSTM")
        journal = manager.get_sklearn_model("JOURNAL")
        request = JournalAnalysisRequest(student_course="BSTM", journal_text="I arranged travel booking and an itinerary.")
        with patch.object(primary, "predict", side_effect=RuntimeError("primary")) as first, patch.object(journal, "predict", side_effect=RuntimeError("shared")) as second, self.assertLogs("app.services.model_manager", level="ERROR"):
            response, used = manager.predict_with_fallback(request)
            self.assertEqual(used, "rules")
            self.assertIsNotNone(response)
            self.assertEqual(manager.predict_with_fallback(request)[1], "rules")
            first.assert_called_once()
            second.assert_called_once()
        status = manager.get_status()
        self.assertFalse(status["ready"])
        self.assertEqual(status["sklearn_models_loaded"], 10)
        self.assertEqual(status["failed_programs"], {"BSTM": "prediction_failed", "JOURNAL": "prediction_failed"})
        # A reviewed release/restart can restore healthy caches without changing artifacts.
        self.assertEqual(manager.preload_all()["sklearn"], 12)
        self.assertTrue(manager.get_status()["ready"])

    def test_explicit_rules_preference_bypasses_both_models(self):
        manager = self.manager()
        body = {"student_course": "BSTM", "journal_text": TEXT, "preferred_model": "rules"}
        with patch.object(manager.get_sklearn_model("BSTM"), "predict") as primary, patch.object(manager.get_sklearn_model("JOURNAL"), "predict") as shared, self.client(manager) as client:
            for endpoint in ["/api/ml/analyze-journal", "/api/journal/analyze"]:
                response = client.post(endpoint, json=body)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["model_used"], "rules")
            batch = client.post("/api/ml/batch-analyze", json={"entries": [body], "preferred_model": "rules"})
            self.assertEqual(batch.json()["results"][0]["model_used"], "rules")
            explanation = client.post("/api/ml/explain", json=body)
            self.assertEqual(explanation.json()["model_type"], "rules")
            primary.assert_not_called()
            shared.assert_not_called()
            self.assertEqual(client.get("/health").status_code, 200)

    def test_missing_corrupt_and_wrong_type_journal_degrade_health(self):
        for case in ["missing", "corrupt", "wrong_type"]:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                for code in REQUIRED_MODEL_CODES:
                    shutil.copyfile(MODELS_DIR / f"{code.lower()}_classifier.joblib", root / f"{code.lower()}_classifier.joblib")
                path = root / "journal_classifier.joblib"
                if case == "missing":
                    path.unlink()
                elif case == "corrupt":
                    path.write_bytes(b"corrupt fixture")
                else:
                    joblib.dump({"metadata_only": True}, path)
                manager = ModelManager(root)
                with self.assertLogs("app.services.model_manager", level="ERROR"):
                    self.assertEqual(manager.preload_all()["sklearn"], 11)
                with self.client(manager) as client:
                    health = client.get("/health")
                    self.assertEqual(health.status_code, 503)
                    status = health.json()["model_governance"]
                    self.assertEqual(status["expected_models"], 12)
                    self.assertEqual(status["missing_programs"], ["JOURNAL"])
                    self.assertEqual(status["failed_programs"]["JOURNAL"], "missing" if case == "missing" else "load_failed")
                for course in sorted(SUPPORTED_COURSES):
                    request = JournalAnalysisRequest(student_course=course, journal_text=TEXT)
                    self.assertEqual(manager.predict_with_fallback(request)[1], "sklearn")
                    manager._sklearn_models.pop(course)
                    self.assertEqual(manager.predict_with_fallback(request)[1], "rules")

    def test_journal_registry_path_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            registry = {"JOURNAL_sklearn": [{"program_code": "JOURNAL", "model_type": "sklearn", "version": 1, "is_active": True, "model_path": "../outside.joblib"}]}
            (root / "model_registry.json").write_text(json.dumps(registry), encoding="utf-8")
            manager = ModelManager(root)
            with self.assertRaises(ValueError):
                manager._model_path("JOURNAL")
            with patch.object(joblib, "load") as load, self.assertLogs("app.services.model_manager", level="ERROR"):
                manager.preload_all()
                load.assert_not_called()
            self.assertEqual(manager.get_status()["failed_programs"]["JOURNAL"], "load_failed")

    def test_journal_sklearn_version_mismatch_is_rejected(self):
        load = joblib.load
        def incompatible(path):
            if Path(path).name == "journal_classifier.joblib":
                warnings.warn(InconsistentVersionWarning(estimator_name="LogisticRegression", current_sklearn_version="1.8.0", original_sklearn_version="0.0"))
            return load(path)
        with patch.object(joblib, "load", side_effect=incompatible), self.assertLogs("app.services.model_manager", level="ERROR"):
            manager = ModelManager()
            self.assertEqual(manager.preload_all()["sklearn"], 11)
        self.assertEqual(manager.get_status()["failed_programs"]["JOURNAL"], "load_failed")
        self.assertFalse(manager.get_status()["ready"])

    def test_invalid_journal_probabilities_rejected_at_startup_and_runtime(self):
        journal = self.loaded.get_sklearn_model("JOURNAL")
        load = joblib.load
        def with_patched_journal(path):
            return journal if Path(path).name == "journal_classifier.joblib" else load(path)
        for output in [[[float("nan"), 1.0]], [[0.8, 0.8]], [[-0.1, 1.1]], [[1.0, 0.0, 0.0]]]:
            with self.subTest(output=output), patch.object(journal, "predict_proba", return_value=np.array(output)):
                with patch.object(joblib, "load", side_effect=with_patched_journal), self.assertLogs("app.services.model_manager", level="ERROR"):
                    startup = ModelManager()
                    self.assertEqual(startup.preload_all()["sklearn"], 11)
                    self.assertEqual(startup.get_status()["failed_programs"]["JOURNAL"], "load_failed")
                manager = self.manager()
                manager._sklearn_models.pop("BSTM")
                with self.assertLogs("app.services.model_manager", level="ERROR"):
                    response, used = manager.predict_with_fallback(JournalAnalysisRequest(student_course="BSTM", journal_text=TEXT))
                self.assertEqual(used, "rules")
                self.assertEqual(manager.get_status()["failed_programs"]["JOURNAL"], "prediction_failed")
                self.assertTrue(np.isfinite(response.confidence_score))

    def test_explanation_uses_journal_weights_and_request_course_keywords(self):
        manager = self.manager()
        manager._sklearn_models.pop("BSTM")
        journal = manager.get_sklearn_model("JOURNAL")
        with patch.object(manager, "get_sklearn_model", wraps=manager.get_sklearn_model) as selected, self.client(manager) as client:
            response = client.post("/api/ml/explain", json={"student_course": "BSTM", "journal_text": "I implemented a Laravel API with database travel booking."})
            self.assertEqual(response.status_code, 200, response.text)
            selected.assert_any_call("JOURNAL")
            result = response.json()
            self.assertIn("travel", result["detected_course_tasks"])
            self.assertTrue(result["top_features"])
            classifier = journal.named_steps["classifier"]
            self.assertEqual(list(classifier.classes_), ["course_related", "unrelated"])
            vocabulary = journal.named_steps["vectorizer"].vocabulary_
            for item in result["top_features"]:
                expected = round(float(-classifier.coef_[0][vocabulary[item["feature"]]]), 4)
                self.assertEqual(item["importance_weight"], expected)

    def test_journal_is_not_a_student_course(self):
        with self.client(self.manager()) as client:
            for value in ["JOURNAL", "UNKNOWN", "../JOURNAL"]:
                response = client.post("/api/ml/analyze-journal", json={"student_course": value, "journal_text": TEXT})
                self.assertEqual(response.status_code, 422)

    def test_artifacts_and_registry_unchanged_after_startup_and_fallback(self):
        def fingerprints():
            return {path.relative_to(MODELS_DIR).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                    for path in MODELS_DIR.rglob("*") if path.is_file()}
        before = fingerprints()
        manager = ModelManager()
        manager.preload_all()
        for course in sorted(SUPPORTED_COURSES):
            manager._sklearn_models.pop(course)
            response, used = manager.predict_with_fallback(JournalAnalysisRequest(student_course=course, journal_text=TEXT))
            self.assertEqual(used, "sklearn")
            self.assertIn("JOURNAL", response.feedback)
        self.assertEqual(fingerprints(), before)


if __name__ == "__main__":
    unittest.main()
