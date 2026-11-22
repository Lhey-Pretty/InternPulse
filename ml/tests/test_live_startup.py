"""Launch the real production entry point from another cwd on an unused local port."""

import ctypes
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.request
import urllib.error

ML_ROOT = Path(__file__).resolve().parents[1]


def peak_memory_mib(process):
    if sys.platform != "win32":
        status = Path(f"/proc/{process.pid}/status")
        if status.exists():
            for line in status.read_text().splitlines():
                if line.startswith("VmHWM:"):
                    return round(int(line.split()[1]) / 1024, 1)
        return None
    class Counters(ctypes.Structure):
        _fields_ = [("cb", ctypes.c_ulong), ("faults", ctypes.c_ulong)] + [(name, ctypes.c_size_t) for name in ("peak", "working", "quota_peak_paged", "quota_paged", "quota_peak_nonpaged", "quota_nonpaged", "pagefile", "peak_pagefile")]
    get_memory = ctypes.windll.psapi.GetProcessMemoryInfo
    get_memory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong]
    # Windows venv launchers may have a child interpreter; measure both.
    child_json = subprocess.check_output(["powershell", "-NoProfile", "-Command", f"(Get-CimInstance Win32_Process -Filter 'ParentProcessId = {process.pid}').ProcessId | ConvertTo-Json"], text=True).strip()
    children = json.loads(child_json) if child_json else []
    if isinstance(children, int):
        children = [children]
    open_process = ctypes.windll.kernel32.OpenProcess
    open_process.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
    open_process.restype = ctypes.c_void_p
    close_handle = ctypes.windll.kernel32.CloseHandle
    close_handle.argtypes = [ctypes.c_void_p]
    total = 0
    for pid in [process.pid, *children]:
        handle = open_process(0x0400 | 0x0010, False, pid)
        if handle:
            try:
                counters = Counters()
                counters.cb = ctypes.sizeof(counters)
                if get_memory(handle, ctypes.byref(counters), counters.cb):
                    total += counters.peak
            finally:
                close_handle(handle)
    return round(total / 1024**2, 1) if total else None


class LiveStartupTest(unittest.TestCase):
    def test_real_entrypoint_and_http_endpoints(self):
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        environment = dict(os.environ, ML_PORT=str(port), PYTHONDONTWRITEBYTECODE="1", PYTHONUNBUFFERED="1")
        environment.pop("ML_CALLBACK_TOKEN", None)
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with tempfile.TemporaryDirectory() as directory:
            log_path = Path(directory) / "startup.log"
            with log_path.open("w+b") as log:
                start = time.monotonic()
                process = subprocess.Popen([sys.executable, "-B", str(ML_ROOT / "run.py")], cwd=directory, env=environment, stdout=log, stderr=subprocess.STDOUT)
                try:
                    base = f"http://127.0.0.1:{port}"
                    while time.monotonic() - start < 60:
                        if process.poll() is not None:
                            self.fail("Production process exited before becoming ready")
                        try:
                            with opener.open(base + "/health", timeout=2) as response:
                                health = json.load(response)
                                break
                        except (urllib.error.URLError, TimeoutError):
                            time.sleep(0.1)
                    else:
                        self.fail("Production service did not become healthy within 60 seconds")
                    startup_seconds = round(time.monotonic() - start, 2)
                    self.assertEqual(health["status"], "healthy")
                    self.assertEqual(health["model_governance"]["sklearn_models_loaded"], 11)
                    journal = {"student_course": "BSIT", "journal_text": "I implemented the API and debugged SQL queries."}
                    requests = {
                        "/api/ml/skill-match": {"student_skills": ["SQL"], "required_skills": ["SQL"]},
                        "/api/ml/recommend-internships": {"student_course": "BSIT", "student_skills": ["SQL"], "postings": [{"id": 1, "title": "Developer", "required_skills": ["SQL"]}]},
                        "/api/ml/analyze-journal": journal,
                        "/api/journal/analyze": {**journal, "journal_entry_id": 1},
                        "/api/ml/batch-analyze": {"entries": [{**journal, "id": 1}]},
                        "/api/ml/analyze-journal/dual": journal,
                        "/api/ml/explain": journal,
                    }
                    for endpoint, body in requests.items():
                        with self.subTest(endpoint=endpoint):
                            request = urllib.request.Request(base + endpoint, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
                            with opener.open(request, timeout=20) as response:
                                self.assertEqual(response.status, 200)
                                self.assertIsInstance(json.load(response), dict)
                    with opener.open(base + "/api/ml/metrics/BSIT", timeout=10) as response:
                        self.assertEqual(response.status, 200)
                    print(f"Live validation: startup={startup_seconds}s, model_load={health['model_governance']['startup_seconds']}s, peak_working_set={peak_memory_mib(process)} MiB", flush=True)
                finally:
                    if sys.platform == "win32" and process.poll() is None:
                        # Stop the exact test process tree, including any venv launcher child.
                        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], check=True, capture_output=True)
                    else:
                        process.terminate()
                    try:
                        process.wait(timeout=10)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
                    log.seek(0)
                    output = log.read().decode(errors="replace")
                    if "Application startup complete" not in output:
                        print(output, flush=True)
                self.assertIn("Application startup complete", output)
                self.assertNotIn("Started reloader", output)
                self.assertNotIn("WatchFiles", output)


if __name__ == "__main__":
    unittest.main()
