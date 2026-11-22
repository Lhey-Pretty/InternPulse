"""Production contract, security and model-readiness regression checks."""

import asyncio
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import joblib
from fastapi.testclient import TestClient

import app.main as main
from app.config import BASE_DIR, MODELS_DIR, allowed_origins
from app.models.schemas import JournalAnalysisRequest, SUPPORTED_COURSES
from app.request_limits import RequestLimitsMiddleware, MAX_BODY_BYTES
from app.services.model_manager import ModelManager, REQUIRED_MODEL_CODES
from app.services.model_registry import ModelRegistry
import run

JOURNAL = {"student_course": "BSIT", "journal_text": "I implemented a Laravel API and debugged the database queries."}


class APIProductionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_context = TestClient(main.app, raise_server_exceptions=False)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_context.__exit__(None, None, None)

    def test_all_inference_endpoints(self):
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(self.client.get("/health").json()["model_governance"]["sklearn_models_loaded"], 12)
        requests = {
            "/api/ml/skill-match": {"student_skills": ["PHP", "SQL"], "required_skills": ["PHP"]},
            "/api/ml/recommend-internships": {"student_course": "BSIT", "student_skills": ["PHP"], "postings": [{"id": 1, "title": "Developer", "required_course": "BSIT", "required_skills": ["PHP"]}]},
            "/api/ml/analyze-journal": JOURNAL,
            "/api/journal/analyze": {**JOURNAL, "journal_entry_id": 1},
            "/api/ml/batch-analyze": {"entries": [{**JOURNAL, "id": 1}]},
            "/api/ml/analyze-journal/dual": JOURNAL,
            "/api/ml/explain": JOURNAL,
        }
        for endpoint, body in requests.items():
            with self.subTest(endpoint=endpoint):
                response = self.client.post(endpoint, json=body)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertIsInstance(response.json(), dict)
        self.assertEqual(self.client.get("/api/ml/metrics/BSIT").status_code, 200)
        self.assertEqual(self.client.get("/api/ml/skills-by-course/BSIT").status_code, 200)
        self.assertEqual(self.client.post("/api/ml/skill-match", json=requests["/api/ml/skill-match"]).json()["match_percentage"], 100)
        expected_keys = {"journal_entry_id", "is_course_related", "confidence_score", "detected_tasks", "flag_level", "feedback", "model_used"}
        self.assertEqual(set(self.client.post("/api/journal/analyze", json={**JOURNAL, "journal_entry_id": 1}).json()), expected_keys)

    def test_validation_and_limits(self):
        invalid = [
            ("/api/ml/analyze-journal", {**JOURNAL, "student_course": "UNKNOWN"}),
            ("/api/ml/analyze-journal", {**JOURNAL, "journal_text": " "}),
            ("/api/ml/analyze-journal", {**JOURNAL, "journal_text": "x" * 10001}),
            ("/api/ml/analyze-journal", {**JOURNAL, "preferred_model": "anything"}),
            ("/api/journal/analyze", {**JOURNAL, "student_course": "../../private"}),
            ("/api/ml/batch-analyze", {"entries": []}),
            ("/api/ml/batch-analyze", {"entries": [JOURNAL] * 51}),
            ("/api/ml/batch-analyze", {"entries": [{**JOURNAL, "journal_text": "x" * 10000}] * 11}),
            ("/api/ml/batch-analyze", {"entries": [{**JOURNAL, "student_course": "UNKNOWN"}]}),
            ("/api/ml/skill-match", {"student_skills": ["a"] * 101, "required_skills": []}),
            ("/api/ml/skill-match", {"student_skills": ["a" * 129], "required_skills": []}),
            ("/api/ml/recommend-internships", {"student_course": "BSIT", "student_skills": [], "postings": [{"id": 1, "title": "Job", "required_skills": ["a"] * 100}] * 11}),
        ]
        for endpoint, body in invalid:
            with self.subTest(endpoint=endpoint, case=list(body)):
                response = self.client.post(endpoint, json=body)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertNotIn('"input"', response.text)
        self.assertEqual(self.client.post("/api/ml/analyze-journal", content="{broken").status_code, 422)
        self.assertEqual(self.client.post("/api/ml/analyze-journal", content=b"x" * (MAX_BODY_BYTES + 1)).status_code, 413)
        self.assertEqual(self.client.get("/api/ml/metrics/..%5Cprivate").status_code, 422)
        self.assertEqual(self.client.get("/api/ml/metrics/UNKNOWN").status_code, 404)

    def test_management_is_closed(self):
        self.assertEqual(self.client.post("/api/ml/optimize-hyperparameters", json={"program_code": "BSIT"}).status_code, 403)
        self.assertEqual(self.client.post("/api/ml/models/BSIT/activate?model_type=sklearn&version=1").status_code, 403)
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.client.get("/api/ml/models").status_code, 503)
        token = secrets.token_urlsafe(24)
        with patch.dict(os.environ, {"ML_ADMIN_TOKEN": token}):
            self.assertEqual(self.client.get("/api/ml/models").status_code, 401)
            self.assertEqual(self.client.get("/api/ml/models", headers={"X-ML-Admin-Token": "invalid"}).status_code, 401)
            self.assertEqual(self.client.get("/api/ml/models", headers={"X-ML-Admin-Token": token}).status_code, 200)

    def test_callback_contract_and_authentication(self):
        url = "http://127.0.0.1:8000/api/ml/callback"
        token = secrets.token_urlsafe(24)
        body = {**JOURNAL, "journal_entry_id": 1, "callback_url": url}
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.client.post("/api/journal/analyze", json=body).status_code, 503)
        with patch.dict(os.environ, {"ML_CALLBACK_TOKEN": token, "ML_CALLBACK_ALLOWED_URLS": url}):
            self.assertEqual(self.client.post("/api/journal/analyze", json=body).status_code, 401)
            headers = {"X-ML-Callback-Token": token}
            with patch.object(main, "_send_laravel_callback") as callback:
                response = self.client.post("/api/journal/analyze", json=body, headers=headers)
                self.assertEqual(response.status_code, 200)
                callback.assert_called_once_with(url, response.json())
            for rejected in ["http://169.254.169.254/latest/meta-data", url + "?token=hidden", "file:///etc/passwd", "http://user:password@127.0.0.1:8000/api/ml/callback", "http://[invalid"]:
                self.assertEqual(self.client.post("/api/journal/analyze", json={**body, "callback_url": rejected}, headers=headers).status_code, 400)

    def test_safe_internal_errors_and_batch_deadline(self):
        with self.assertLogs("internpulse_ml", level="ERROR"), patch.object(main, "calculate_skill_match", side_effect=RuntimeError("private internal detail")):
            response = self.client.post("/api/ml/skill-match", json={"student_skills": [], "required_skills": []})
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json(), {"detail": "Internal inference error"})
        with patch("app.services.batch_processor.BATCH_TIMEOUT_SECONDS", -1.0):
            response = self.client.post("/api/ml/batch-analyze", json={"entries": [JOURNAL]})
            self.assertEqual(response.status_code, 504)
        with self.assertLogs("app.services.batch_processor", level="WARNING"), patch("app.services.batch_processor.get_model_manager") as get_manager:
            get_manager.return_value.predict_with_fallback.side_effect = RuntimeError("private internal detail")
            result = self.client.post("/api/ml/batch-analyze", json={"entries": [JOURNAL]}).json()
            self.assertEqual(result["failure_count"], 1)
            self.assertNotIn("private internal detail", json.dumps(result))

    def test_degraded_health_with_rules_available(self):
        with tempfile.TemporaryDirectory() as directory:
            manager = ModelManager(Path(directory))
            with self.assertLogs("app.services.model_manager", level="ERROR"):
                manager.preload_all()
            with patch.object(main, "get_model_manager", return_value=manager):
                response = self.client.get("/health")
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()["status"], "degraded")
            request = JournalAnalysisRequest(**JOURNAL, preferred_model="sklearn")
            response, used = manager.predict_with_fallback(request, "sklearn")
            self.assertEqual(used, "rules")
            self.assertIsNotNone(response)
        with patch.object(main, "_DATASETS_READY", False):
            self.assertEqual(self.client.get("/health").status_code, 503)

    def test_inference_has_no_training_imports(self):
        self.client.post("/api/ml/analyze-journal", json={**JOURNAL, "preferred_model": "pytorch"})
        for package in ["torch", "transformers", "pandas", "sentence_transformers", "optuna"]:
            self.assertIsNone(importlib.util.find_spec(package), package)
            self.assertNotIn(package, sys.modules)
        for module in ["app.services.hyperparameter_optimizer", "app.services.pytorch_training_service", "app.services.training_queue", "train_all_classifiers"]:
            self.assertNotIn(module, sys.modules)


class ModelLoadingTests(unittest.TestCase):
    def test_actual_models_and_read_only_startup(self):
        with patch.object(ModelRegistry, "_save", side_effect=AssertionError("Startup must not write")):
            manager = ModelManager()
            self.assertEqual(manager.preload_all(), {"sklearn": 12, "pytorch": 0})
        self.assertTrue(manager.get_status()["ready"])
        self.assertIsNotNone(manager.get_sklearn_model("JOURNAL"))
        for course in SUPPORTED_COURSES:
            response, used = manager.predict_with_fallback(JournalAnalysisRequest(student_course=course, journal_text=JOURNAL["journal_text"]))
            self.assertEqual(used, "sklearn")
            self.assertGreaterEqual(response.confidence_score, 0)
            self.assertLessEqual(response.confidence_score, 1)

    def test_corrupt_wrong_type_and_missing_models(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for course in REQUIRED_MODEL_CODES:
                shutil.copyfile(MODELS_DIR / f"{course.lower()}_classifier.joblib", root / f"{course.lower()}_classifier.joblib")
            (root / "bsit_classifier.joblib").write_bytes(b"corrupt")
            joblib.dump({"training_metadata": True}, root / "beed_classifier.joblib")
            (root / "bscpe_classifier.joblib").unlink()
            manager = ModelManager(root)
            with self.assertLogs("app.services.model_manager", level="ERROR"):
                self.assertEqual(manager.preload_all()["sklearn"], 9)
            status = manager.get_status()
            self.assertFalse(status["ready"])
            self.assertEqual(status["failed_programs"]["BSIT"], "load_failed")
            self.assertEqual(status["failed_programs"]["BEED"], "load_failed")
            self.assertEqual(status["failed_programs"]["BSCPE"], "missing")

    def test_registry_path_escape_and_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "model_registry.json").write_text('{"bad": {}}', encoding="utf-8")
            with self.assertLogs("app.services.model_registry", level="WARNING"):
                self.assertTrue(ModelManager(root).registry.load_failed)
            (root / "model_registry.json").write_text(json.dumps({"BSIT_sklearn": [{"program_code": "BSIT", "model_type": "sklearn", "version": 1, "is_active": True, "model_path": "../outside.joblib"}]}), encoding="utf-8")
            manager = ModelManager(root)
            with self.assertRaises(ValueError):
                manager._model_path("BSIT")

    def test_prediction_failure_degrades_health(self):
        manager = ModelManager()
        manager.preload_all()
        manager._sklearn_models["BSIT"] = MagicMock()
        manager._sklearn_models["BSIT"].predict.side_effect = RuntimeError("model failure")
        with self.assertLogs("app.services.model_manager", level="ERROR"):
            response, used = manager.predict_with_fallback(JournalAnalysisRequest(**JOURNAL))
        self.assertEqual(used, "sklearn")
        self.assertIn("JOURNAL", response.feedback)
        self.assertEqual(manager.get_status()["failed_programs"]["BSIT"], "prediction_failed")
        self.assertFalse(manager.get_status()["ready"])


class ConfigurationTests(unittest.TestCase):
    def test_no_reload_and_configurable_port(self):
        for value, expected in [(None, 8002), ("8123", 8123)]:
            environment = {} if value is None else {"ML_PORT": value}
            with patch.dict(os.environ, environment, clear=True), patch.object(run.uvicorn, "run") as start, patch.object(run.logging, "basicConfig"):
                run.main()
                self.assertEqual(start.call_args.kwargs["port"], expected)
                self.assertEqual(start.call_args.kwargs["host"], "127.0.0.1")
                self.assertEqual(start.call_args.kwargs["workers"], 1)
                self.assertFalse(start.call_args.kwargs["reload"])
                self.assertEqual(start.call_args.kwargs["app_dir"], str(BASE_DIR))

    def test_cors_is_explicit_and_without_credentials(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(allowed_origins(), [])
        with patch.dict(os.environ, {"ML_ALLOWED_ORIGINS": "*"}):
            with self.assertRaises(ValueError):
                allowed_origins()
        with patch.dict(os.environ, {"ML_ALLOWED_ORIGINS": "https://internpulse.example"}):
            origins = allowed_origins()
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        app = FastAPI()
        app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False)
        with TestClient(app) as client:
            response = client.get("/", headers={"Origin": origins[0]})
            self.assertEqual(response.headers["access-control-allow-origin"], origins[0])
            self.assertNotIn("access-control-allow-credentials", response.headers)
            self.assertNotIn("access-control-allow-origin", client.get("/", headers={"Origin": "https://unknown.example"}).headers)

    def test_callback_delivery_header_and_no_redirects(self):
        token = secrets.token_urlsafe(24)
        with patch.dict(os.environ, {"ML_CALLBACK_TOKEN": token}), patch.object(main.urllib.request, "build_opener") as build:
            build.return_value.open.return_value.__enter__.return_value.status = 200
            main._send_laravel_callback("http://127.0.0.1/callback", {"journal_entry_id": 1})
            request = build.return_value.open.call_args.args[0]
            self.assertEqual(request.get_header("X-ml-callback-token"), token)
            self.assertEqual(build.return_value.open.call_args.kwargs["timeout"], 10.0)
            self.assertIsInstance(build.call_args.args[1], main._NoCallbackRedirects)
            self.assertIsNone(build.call_args.args[1].redirect_request(None, None, 302, "redirect", {}, "http://external.example"))


class MiddlewareTests(unittest.IsolatedAsyncioTestCase):
    async def test_busy_limit_keeps_health_available(self):
        called = []
        async def app(scope, receive, send):
            called.append(scope["path"])
        middleware = RequestLimitsMiddleware(app)
        middleware.active = 4
        output = []
        async def receive():
            return {"type": "http.request", "body": b""}
        async def send(message):
            output.append(message)
        await middleware({"type": "http", "path": "/api/ml/analyze-journal"}, receive, send)
        self.assertEqual(output[0]["status"], 503)
        await middleware({"type": "http", "path": "/health"}, receive, send)
        self.assertEqual(called, ["/health"])

    async def test_slow_and_oversized_streamed_bodies(self):
        async def app(scope, receive, send):
            self.fail("Invalid body must not reach application")
        middleware = RequestLimitsMiddleware(app)
        output = []
        async def send(message):
            output.append(message)
        async def slow_receive():
            await asyncio.sleep(1)
        with patch("app.request_limits.BODY_TIMEOUT_SECONDS", 0.01):
            await middleware({"type": "http", "path": "/test"}, slow_receive, send)
        self.assertEqual(output[0]["status"], 408)
        self.assertEqual(middleware.active, 0)
        output.clear()
        messages = iter([{"type": "http.request", "body": b"x" * MAX_BODY_BYTES, "more_body": True}, {"type": "http.request", "body": b"x", "more_body": False}])
        async def streamed_receive():
            return next(messages)
        await middleware({"type": "http", "path": "/test"}, streamed_receive, send)
        self.assertEqual(output[0]["status"], 413)
        self.assertEqual(middleware.active, 0)


if __name__ == "__main__":
    unittest.main()
