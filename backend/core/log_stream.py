#!/usr/bin/env python3
"""
Log Stream (T2)
---------------
Spawn CLI process (opencode/freebuff), đọc stdout+stderr bằng 2 thread,
phát event theo schema WebSocket đã chốt, giữ ring buffer N dòng cuối.

Schema event (dict, sẵn sàng JSON-serialize để socket.io emit):

  log:
    {"type":"log","sessionId":str,"source":"opencode|freebuff|orchestrator",
     "taskId":str|None,"stream":"stdout|stderr","level":"debug|info|warn|error",
     "seq":int,"ts":float,"text":str}

  status:
    {"type":"status","sessionId":str,"source":str,"taskId":str|None,
     "state":"spawned|running|exited","exitCode":int|None,"seq":int,"ts":float}

Backpressure: ring buffer drop-oldest (collections.deque maxlen).
"""

from __future__ import annotations

import itertools
import queue
import re
import subprocess
import threading
import time
from collections import deque
from typing import Any, Callable, Deque, Dict, List, Optional

# ANSI escape sequences (CSI, OSC, và các ký tự điều khiển hay gặp ở TUI)
_ANSI_RE = re.compile(
    r"\x1B(?:\][^\x07\x1B]*(?:\x07|\x1B\\)|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])"
)

VALID_SOURCES = ("opencode", "freebuff", "orchestrator")
VALID_LEVELS = ("debug", "info", "warn", "error")


def strip_ansi(text: str) -> str:
    """Loại bỏ ANSI escape codes + carriage return thừa khỏi output CLI."""
    if not text:
        return ""
    return _ANSI_RE.sub("", text).replace("\r", "")


def classify_level(text: str, stream: str) -> str:
    """Suy ra log level từ nội dung dòng; stderr mặc định là 'error'."""
    low = text.lower()
    if "error" in low or "traceback" in low or "exception" in low:
        return "error"
    if "warn" in low:
        return "warn"
    if "debug" in low:
        return "debug"
    # stderr thường bị CLI dùng cho banner/progress (opencode in
    # "> build · <model>" ra stderr), nên không mặc định là error.
    return "warn" if stream == "stderr" else "info"


class LogStreamer:
    """
    Chạy 1 lệnh CLI và stream log ra callback theo schema đã chốt.

    Ví dụ:
        s = LogStreamer(["opencode", "run", "reply PIPELINE_OK"],
                        session_id="s1", source="opencode")
        events = []
        code = s.run(on_event=events.append)
    """

    def __init__(
        self,
        cmd: List[str],
        session_id: str,
        source: str = "opencode",
        task_id: Optional[str] = None,
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        buffer_size: int = 500,
        timeout: Optional[float] = None,
    ) -> None:
        if source not in VALID_SOURCES:
            raise ValueError(f"source must be one of {VALID_SOURCES}, got {source!r}")
        self.cmd = cmd
        self.session_id = session_id
        self.source = source
        self.task_id = task_id
        self.cwd = cwd
        self.env = env
        self.timeout = timeout
        self.buffer: Deque[Dict[str, Any]] = deque(maxlen=buffer_size)
        self.dropped = 0
        self._seq = itertools.count(1)
        self._proc: Optional[subprocess.Popen] = None
        self.exit_code: Optional[int] = None

    # ---------- event helpers ----------

    def _emit(self, event: Dict[str, Any], on_event: Optional[Callable]) -> None:
        if len(self.buffer) == self.buffer.maxlen:
            self.dropped += 1  # drop-oldest do deque maxlen
        self.buffer.append(event)
        if on_event is not None:
            on_event(event)

    def _log_event(self, stream: str, text: str) -> Dict[str, Any]:
        clean = strip_ansi(text).rstrip("\n")
        return {
            "type": "log",
            "sessionId": self.session_id,
            "source": self.source,
            "taskId": self.task_id,
            "stream": stream,
            "level": classify_level(clean, stream),
            "seq": next(self._seq),
            "ts": time.time(),
            "text": clean,
        }

    def _status_event(
        self, state: str, exit_code: Optional[int] = None
    ) -> Dict[str, Any]:
        return {
            "type": "status",
            "sessionId": self.session_id,
            "source": self.source,
            "taskId": self.task_id,
            "state": state,
            "exitCode": exit_code,
            "seq": next(self._seq),
            "ts": time.time(),
        }

    # ---------- main ----------

    def run(self, on_event: Optional[Callable[[Dict[str, Any]], None]] = None) -> int:
        """Spawn process, stream log, trả về exit code."""
        q: "queue.Queue[Optional[tuple]]" = queue.Queue()

        try:
            self._proc = subprocess.Popen(
                self.cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=1,
                text=True,
                cwd=self.cwd,
                env=self.env,
            )
        except (OSError, FileNotFoundError) as exc:
            self._emit(self._status_event("spawned"), on_event)
            self._emit(self._log_event("stderr", f"spawn failed: {exc}"), on_event)
            self._emit(self._status_event("exited", exit_code=127), on_event)
            self.exit_code = 127
            return 127

        self._emit(self._status_event("spawned"), on_event)

        def pump(pipe, stream_name: str) -> None:
            try:
                for line in iter(pipe.readline, ""):
                    q.put((stream_name, line))
            finally:
                try:
                    pipe.close()
                except Exception:
                    pass
                q.put(None)

        threads = [
            threading.Thread(target=pump, args=(self._proc.stdout, "stdout"), daemon=True),
            threading.Thread(target=pump, args=(self._proc.stderr, "stderr"), daemon=True),
        ]
        for t in threads:
            t.start()

        self._emit(self._status_event("running"), on_event)

        finished = 0
        deadline = time.time() + self.timeout if self.timeout else None
        while finished < 2:
            remaining = None if deadline is None else max(0.05, deadline - time.time())
            if deadline is not None and time.time() > deadline:
                self._proc.kill()
                self._emit(
                    self._log_event("stderr", f"timeout after {self.timeout}s"), on_event
                )
                break
            try:
                item = q.get(timeout=remaining if remaining is not None else 0.5)
            except queue.Empty:
                if self._proc.poll() is not None and q.empty():
                    break
                continue
            if item is None:
                finished += 1
                continue
            stream_name, line = item
            event = self._log_event(stream_name, line)
            if event["text"].strip() == "":
                continue  # bỏ dòng rỗng / chỉ chứa ANSI
            self._emit(event, on_event)

        self.exit_code = self._proc.wait()
        self._emit(self._status_event("exited", exit_code=self.exit_code), on_event)
        return self.exit_code

    def tail(self, n: int = 100) -> List[Dict[str, Any]]:
        """N event gần nhất trong ring buffer."""
        return list(self.buffer)[-n:]
