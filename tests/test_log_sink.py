#!/usr/bin/env python3
"""Tests cho BatchingLogSink (đường đi Python -> Node theo quyết định PM)."""

import sys
import threading
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "core"))

from log_sink import BatchingLogSink  # noqa: E402
from log_stream import LogStreamer  # noqa: E402


def make_event(seq, text="x"):
    return {
        "type": "log", "sessionId": "s", "source": "opencode", "taskId": None,
        "stream": "stdout", "level": "info", "seq": seq, "ts": 0.0, "text": text,
    }


class FakeTransport:
    def __init__(self, fail=False):
        self.batches = []
        self.fail = fail
        self.calls = 0
        self.lock = threading.Lock()

    def __call__(self, url, payload):
        with self.lock:
            self.calls += 1
            if self.fail:
                raise ConnectionRefusedError("node down")
            self.batches.append(payload)

    @property
    def events(self):
        return [e for b in self.batches for e in b["events"]]


class TestBatching(unittest.TestCase):
    def test_batches_not_one_request_per_line(self):
        t = FakeTransport()
        sink = BatchingLogSink("s1", transport=t, max_batch=50)
        for i in range(1, 121):
            sink.emit(make_event(i))
        sink.flush()
        self.assertEqual(len(t.events), 120)
        # 120 event / batch 50 => 3 request, KHÔNG phải 120
        self.assertEqual(t.calls, 3)
        self.assertEqual([len(b["events"]) for b in t.batches], [50, 50, 20])

    def test_payload_shape_and_seq_preserved(self):
        t = FakeTransport()
        sink = BatchingLogSink("sess-9", transport=t)
        for i in (7, 8, 9):
            sink.emit(make_event(i))
        sink.flush()
        payload = t.batches[0]
        self.assertEqual(set(payload), {"sessionId", "events"})
        self.assertEqual(payload["sessionId"], "sess-9")
        self.assertEqual([e["seq"] for e in payload["events"]], [7, 8, 9])

    def test_time_based_flush(self):
        t = FakeTransport()
        with BatchingLogSink("s", transport=t, flush_interval=0.05, max_batch=50) as sink:
            sink.emit(make_event(1))  # dưới ngưỡng 50 -> phải flush theo thời gian
            deadline = time.time() + 2
            while not t.events and time.time() < deadline:
                time.sleep(0.02)
        self.assertEqual(len(t.events), 1)

    def test_size_based_flush_triggers_early(self):
        t = FakeTransport()
        with BatchingLogSink("s", transport=t, flush_interval=30, max_batch=5) as sink:
            for i in range(5):
                sink.emit(make_event(i))
            deadline = time.time() + 2
            while not t.events and time.time() < deadline:
                time.sleep(0.02)
            self.assertEqual(len(t.events), 5)  # không phải chờ 30s


class TestFailureIsolation(unittest.TestCase):
    def test_transport_failure_never_raises_and_degrades(self):
        t = FakeTransport(fail=True)
        sink = BatchingLogSink("s", transport=t)
        for i in range(10):
            sink.emit(make_event(i))  # không được raise
        sink.flush()
        self.assertTrue(sink.degraded)
        self.assertEqual(sink.sent, 0)
        self.assertEqual(sink.dropped, 10)
        self.assertEqual(sink.failed_batches, 1)

    def test_no_retry_loop_after_failure(self):
        t = FakeTransport(fail=True)
        sink = BatchingLogSink("s", transport=t)
        for i in range(200):
            sink.emit(make_event(i))
        sink.flush()
        # đúng 1 lần thử duy nhất, rồi drop im lặng - không retry spam
        self.assertEqual(t.calls, 1)
        self.assertEqual(sink.dropped, 200)

    def test_warn_emitted_once(self):
        warns = []
        t = FakeTransport(fail=True)
        sink = BatchingLogSink("s", transport=t, logger=lambda lvl, m: warns.append(m))
        for i in range(100):
            sink.emit(make_event(i))
        sink.flush()
        sink.flush()
        self.assertEqual(len(warns), 1)

    def test_queue_cap_drops_instead_of_growing(self):
        t = FakeTransport()
        sink = BatchingLogSink("s", transport=t, max_queue=10)
        for i in range(50):
            sink.emit(make_event(i))
        self.assertEqual(sink.stats()["pending"], 10)
        self.assertEqual(sink.dropped, 40)


class TestEndToEndWithStreamer(unittest.TestCase):
    def test_streamer_events_reach_sink_in_order(self):
        t = FakeTransport()
        with BatchingLogSink("e2e", transport=t, flush_interval=0.05) as sink:
            code = LogStreamer(
                [sys.executable, "-c", "[print(i) for i in range(20)]"],
                session_id="e2e", source="opencode", task_id="T2",
            ).run(on_event=sink.emit)
        self.assertEqual(code, 0)
        evs = t.events
        seqs = [e["seq"] for e in evs]
        self.assertEqual(seqs, sorted(seqs))
        self.assertEqual(evs[0]["state"], "spawned")
        self.assertEqual(evs[-1]["state"], "exited")
        self.assertEqual(evs[-1]["exitCode"], 0)
        self.assertEqual(
            [e["text"] for e in evs if e["type"] == "log"],
            [str(i) for i in range(20)],
        )

    def test_cli_completes_even_when_node_is_down(self):
        t = FakeTransport(fail=True)
        with BatchingLogSink("down", transport=t, flush_interval=0.05) as sink:
            code = LogStreamer(
                [sys.executable, "-c", "print('still ran')"],
                session_id="down", source="opencode",
            ).run(on_event=sink.emit)
        self.assertEqual(code, 0)  # CLI KHÔNG bị chặn bởi bridge chết
        self.assertTrue(sink.degraded)


if __name__ == "__main__":
    unittest.main(verbosity=2)
