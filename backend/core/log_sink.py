#!/usr/bin/env python3
"""
Log Sink (T2 — đường đi log event theo quyết định kiến trúc của PM)
-------------------------------------------------------------------
Python LogStreamer -> BatchingLogSink -> POST /api/logs/stream (Node)
-> Node broadcast socket.io room `session:<sessionId>`.

Ràng buộc PM đã chốt:
  1. Batch: flush mỗi 100ms HOẶC 50 event, cái nào tới trước.
  2. Node giữ nguyên `seq` — sink không đánh số lại.
  3. Bridge chết / Node down KHÔNG được chặn tiến trình CLI:
     drop event, tăng `dropped`, log cảnh báo ĐÚNG 1 LẦN, không retry loop.
  4. Ring buffer 500 để replay đặt ở Node; Python giữ buffer riêng cho tail().
"""

from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request
from typing import Any, Callable, Dict, List, Optional

DEFAULT_FLUSH_INTERVAL = 0.1   # 100 ms
DEFAULT_MAX_BATCH = 50
DEFAULT_MAX_QUEUE = 2000       # trần chống phình RAM khi Node down


class BatchingLogSink:
    """
    Gom event và đẩy theo batch sang Node. Thread-safe, non-blocking.

    Dùng như context manager:
        with BatchingLogSink(session_id="s1") as sink:
            LogStreamer(cmd, session_id="s1", source="opencode").run(
                on_event=sink.emit
            )
    """

    def __init__(
        self,
        session_id: str,
        base_url: str = "http://localhost:3001",
        flush_interval: float = DEFAULT_FLUSH_INTERVAL,
        max_batch: int = DEFAULT_MAX_BATCH,
        max_queue: int = DEFAULT_MAX_QUEUE,
        timeout: float = 5.0,
        transport: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        logger: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        self.session_id = session_id
        self.base_url = base_url.rstrip("/")
        self.url = f"{self.base_url}/api/logs/stream"
        self.flush_interval = flush_interval
        self.max_batch = max_batch
        self.max_queue = max_queue
        self.timeout = timeout
        self._transport = transport or self._http_post
        self._logger = logger

        self._pending: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._wake = threading.Event()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

        self.sent = 0
        self.dropped = 0
        self.failed_batches = 0
        self.degraded = False       # True khi transport hỏng -> chỉ drop, không retry
        self._warned = False

    # ---------- lifecycle ----------

    def start(self) -> "BatchingLogSink":
        if self._thread is None:
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()
        return self

    def close(self, flush: bool = True) -> None:
        self._stop.set()
        self._wake.set()
        if self._thread is not None:
            self._thread.join(timeout=self.timeout + self.flush_interval * 5)
            self._thread = None
        if flush:
            self._flush_once()

    def __enter__(self) -> "BatchingLogSink":
        return self.start()

    def __exit__(self, *exc: Any) -> None:
        self.close()

    # ---------- producer ----------

    def emit(self, event: Dict[str, Any]) -> None:
        """Callback truyền vào LogStreamer.run(on_event=...). Không bao giờ raise."""
        with self._lock:
            if len(self._pending) >= self.max_queue:
                self.dropped += 1
                self._warn_once("log sink queue full, dropping events")
                return
            self._pending.append(event)
            should_wake = len(self._pending) >= self.max_batch
        if should_wake:
            self._wake.set()

    # ---------- consumer ----------

    def _loop(self) -> None:
        while not self._stop.is_set():
            self._wake.wait(timeout=self.flush_interval)
            self._wake.clear()
            self._flush_once()
        self._flush_once()

    def _take(self) -> List[Dict[str, Any]]:
        with self._lock:
            if not self._pending:
                return []
            batch = self._pending[: self.max_batch]
            self._pending = self._pending[self.max_batch :]
            return batch

    def _flush_once(self) -> int:
        """Đẩy tối đa 1 batch. Trả về số event đã gửi thành công."""
        batch = self._take()
        if not batch:
            return 0
        if self.degraded:
            # Đã hỏng transport: xả sạch hàng đợi, không giữ lại (chống leak RAM)
            self.dropped += len(batch)
            with self._lock:
                self.dropped += len(self._pending)
                self._pending.clear()
            return 0
        payload = {"sessionId": self.session_id, "events": batch}
        try:
            self._transport(self.url, payload)
        except Exception as exc:  # noqa: BLE001 - không được chặn CLI vì bất kỳ lỗi nào
            self.failed_batches += 1
            self.dropped += len(batch)
            self.degraded = True   # ngừng thử lại, không retry loop
            with self._lock:       # xả phần còn lại, không tích tụ trong RAM
                self.dropped += len(self._pending)
                self._pending.clear()
            self._warn_once(f"log sink transport failed ({exc}); dropping further events")
            return 0
        self.sent += len(batch)
        return len(batch)

    def flush(self) -> int:
        """Đẩy hết mọi thứ đang chờ (dùng trong test / trước khi thoát)."""
        total = 0
        while True:
            n = self._flush_once()
            if n == 0:
                with self._lock:
                    empty = not self._pending
                if empty or self.degraded:
                    break
            total += n
        return total

    # ---------- helpers ----------

    def _http_post(self, url: str, payload: Dict[str, Any]) -> None:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url, data=data, method="POST",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            if resp.status >= 400:
                raise RuntimeError(f"HTTP {resp.status}")

    def _warn_once(self, message: str) -> None:
        if self._warned:
            return
        self._warned = True
        if self._logger:
            self._logger("warn", message)
        else:
            import sys
            print(f"[log_sink] WARN: {message}", file=sys.stderr)

    def stats(self) -> Dict[str, Any]:
        with self._lock:
            pending = len(self._pending)
        return {
            "sessionId": self.session_id,
            "sent": self.sent,
            "dropped": self.dropped,
            "pending": pending,
            "failedBatches": self.failed_batches,
            "degraded": self.degraded,
        }
