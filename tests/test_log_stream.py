#!/usr/bin/env python3
"""Unit tests cho T2 (log_stream) và T1 (planner_backend)."""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "core"))

from log_stream import LogStreamer, classify_level, strip_ansi  # noqa: E402
from planner_backend import (  # noqa: E402
    FreebuffPlanner, NotSupported, OpencodePlanner, PlannerError,
    extract_json, get_planner, validate_plan,
)


class TestStripAnsi(unittest.TestCase):
    def test_removes_color_codes(self):
        self.assertEqual(strip_ansi("\x1b[31mERROR\x1b[0m"), "ERROR")

    def test_removes_osc_and_cr(self):
        self.assertEqual(strip_ansi("\x1b]0;title\x07abc\r"), "abc")

    def test_plain_passthrough(self):
        self.assertEqual(strip_ansi("hello"), "hello")

    def test_empty(self):
        self.assertEqual(strip_ansi(""), "")


class TestClassifyLevel(unittest.TestCase):
    def test_stderr_defaults_warn_not_error(self):
        # CLI hay in banner/progress ra stderr -> không mặc định error
        self.assertEqual(classify_level("> build · model", "stderr"), "warn")

    def test_stderr_with_error_keyword(self):
        self.assertEqual(classify_level("ERROR: nope", "stderr"), "error")

    def test_stdout_defaults_info(self):
        self.assertEqual(classify_level("something", "stdout"), "info")

    def test_warn_detected(self):
        self.assertEqual(classify_level("WARN: deprecated", "stdout"), "warn")

    def test_error_detected_in_stdout(self):
        self.assertEqual(classify_level("Traceback (most recent)", "stdout"), "error")


class TestLogStreamerSchema(unittest.TestCase):
    def test_full_lifecycle_events(self):
        s = LogStreamer(
            [sys.executable, "-c", "print('hello'); print('world')"],
            session_id="sess-1", source="opencode", task_id="t1",
        )
        events = []
        code = s.run(on_event=events.append)

        self.assertEqual(code, 0)
        states = [e["state"] for e in events if e["type"] == "status"]
        self.assertEqual(states, ["spawned", "running", "exited"])

        logs = [e for e in events if e["type"] == "log"]
        self.assertEqual([l["text"] for l in logs], ["hello", "world"])

        for e in logs:
            self.assertEqual(
                set(e), {"type", "sessionId", "source", "taskId", "stream",
                         "level", "seq", "ts", "text"})
            self.assertEqual(e["sessionId"], "sess-1")
            self.assertEqual(e["source"], "opencode")
            self.assertEqual(e["taskId"], "t1")
            self.assertEqual(e["stream"], "stdout")
            self.assertEqual(e["level"], "info")

        seqs = [e["seq"] for e in events]
        self.assertEqual(seqs, sorted(seqs))
        self.assertEqual(len(set(seqs)), len(seqs))
        json.dumps(events)  # phải serialize được cho socket.io

    def test_stderr_captured_and_exit_code(self):
        s = LogStreamer(
            [sys.executable, "-c",
             "import sys; sys.stderr.write('boom\\n'); sys.exit(3)"],
            session_id="s", source="orchestrator",
        )
        events = []
        code = s.run(on_event=events.append)
        self.assertEqual(code, 3)
        errs = [e for e in events if e.get("stream") == "stderr"]
        self.assertEqual(errs[0]["text"], "boom")
        self.assertEqual(errs[0]["level"], "warn")
        exited = [e for e in events if e.get("state") == "exited"][0]
        self.assertEqual(exited["exitCode"], 3)

    def test_ansi_stripped_from_stream(self):
        s = LogStreamer(
            [sys.executable, "-c", r"print('\x1b[32mgreen\x1b[0m')"],
            session_id="s", source="opencode",
        )
        s.run()
        logs = [e for e in s.buffer if e["type"] == "log"]
        self.assertEqual(logs[0]["text"], "green")

    def test_ring_buffer_drops_oldest(self):
        s = LogStreamer(
            [sys.executable, "-c", "[print(i) for i in range(50)]"],
            session_id="s", source="opencode", buffer_size=10,
        )
        s.run()
        self.assertEqual(len(s.buffer), 10)
        self.assertGreater(s.dropped, 0)
        self.assertEqual(s.buffer[-1]["state"], "exited")

    def test_spawn_failure_yields_127(self):
        s = LogStreamer(["/nonexistent/binary-xyz"], session_id="s", source="opencode")
        code = s.run()
        self.assertEqual(code, 127)
        self.assertEqual(s.buffer[-1]["state"], "exited")

    def test_invalid_source_rejected(self):
        with self.assertRaises(ValueError):
            LogStreamer(["true"], session_id="s", source="bogus")

    def test_tail(self):
        s = LogStreamer([sys.executable, "-c", "[print(i) for i in range(5)]"],
                        session_id="s", source="opencode")
        s.run()
        self.assertEqual(len(s.tail(3)), 3)


class TestExtractJson(unittest.TestCase):
    def test_extracts_from_noise(self):
        raw = 'blah\n\x1b[32m{"tasks": [], "project_name": "x"}\x1b[0m\ntrailing'
        self.assertEqual(extract_json(raw)["project_name"], "x")

    def test_nested_braces_and_strings(self):
        raw = 'x {"a": {"b": "}"}, "tasks": []} y'
        self.assertEqual(extract_json(raw)["a"]["b"], "}")

    def test_no_json_raises(self):
        with self.assertRaises(PlannerError):
            extract_json("nothing here")

    def test_invalid_json_raises(self):
        with self.assertRaises(PlannerError):
            extract_json('{"a": ,}')


class TestValidatePlan(unittest.TestCase):
    def test_valid(self):
        plan = validate_plan({"tasks": [{"id": "1", "name": "n", "prompt": "p"}]})
        self.assertEqual(plan["project_name"], "untitled")

    def test_missing_tasks(self):
        with self.assertRaises(PlannerError):
            validate_plan({})

    def test_task_missing_field(self):
        with self.assertRaises(PlannerError):
            validate_plan({"tasks": [{"id": "1"}]})


class TestPlanners(unittest.TestCase):
    def test_freebuff_raises_not_supported(self):
        p = FreebuffPlanner()
        self.assertFalse(p.is_available())
        with self.assertRaises(NotSupported):
            p.analyze_request("build me a thing")

    def test_opencode_cmd_shape(self):
        p = OpencodePlanner(model="deepseek/x")
        self.assertEqual(p._cmd("hi")[:4], ["opencode", "run", "-m", "deepseek/x"])

    def test_factory_default(self):
        self.assertIsInstance(get_planner(), OpencodePlanner)

    def test_factory_unknown(self):
        with self.assertRaises(PlannerError):
            get_planner("gpt9")


class TestOrchestratorPlannerInjection(unittest.TestCase):
    """Orchestrator phải dùng PlannerBackend inject được, không hard-code freebuff."""

    def test_injected_planner_used(self):
        import inspect
        import orchestrator as orch_mod

        sig = inspect.signature(orch_mod.Orchestrator.__init__)
        self.assertIn("planner", sig.parameters)
        self.assertNotIn("freebuff_path", sig.parameters)
        self.assertEqual(sig.parameters["planner_name"].default, "opencode")
        src = inspect.getsource(orch_mod.Orchestrator.run)
        self.assertIn("self.planner.analyze_request", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
