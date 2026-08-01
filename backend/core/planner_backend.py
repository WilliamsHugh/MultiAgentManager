#!/usr/bin/env python3
"""
Planner Backends (T1)
---------------------
Tách interface planner khỏi orchestrator.

Kết quả điều tra freebuff v0.0.135 (bằng chứng thực tế):
  * `freebuff --help` -> Arguments: command (choices: "login") duy nhất.
    Options: -v/--version, --continue, --cwd, -h. KHÔNG có --print/--headless/-p.
  * `echo "reply PIPELINE_OK" | freebuff` -> chỉ in TUI banner + "Connecting…",
    exit 0, không trả nội dung nào parse được.
  * `strings index.js | grep process.env` -> chỉ CODEBUFF_POSTHOG_*,
    NEXT_PUBLIC_* (analytics). Không có env var bật headless/non-interactive.
  => KẾT LUẬN: freebuff KHÔNG có headless mode. FreebuffPlanner raise NotSupported.

Mặc định v1: OpencodePlanner (đã verify `opencode run "..."` trả stdout, exit 0).
"""

from __future__ import annotations

import json
import re
import subprocess
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from log_stream import strip_ansi


class PlannerError(Exception):
    """Lỗi chung khi planner chạy hoặc parse thất bại."""


class NotSupported(PlannerError):
    """Backend không hỗ trợ chế độ headless/programmatic."""


PLANNING_PROMPT = """You are a project manager. Analyze this request and output a JSON plan.

Request: {user_input}

Output ONLY valid JSON (no markdown, no explanation) with this structure:
{{
  "project_name": "string",
  "tasks": [
    {{
      "id": "task-1",
      "name": "string",
      "description": "string",
      "assigned_worker": "opencode",
      "worktree_path": "wt_<name>",
      "branch_name": "feature/<name>",
      "prompt": "detailed instructions for the developer",
      "dependencies": []
    }}
  ],
  "estimated_complexity": "low|medium|high"
}}"""


def extract_json(raw: str) -> Dict[str, Any]:
    """Lấy JSON object đầu tiên cân bằng ngoặc từ output CLI (đã strip ANSI)."""
    text = strip_ansi(raw)
    start = text.find("{")
    if start == -1:
        raise PlannerError(f"No JSON found in planner output: {text[:300]!r}")
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError as exc:
                    raise PlannerError(f"Invalid JSON from planner: {exc}") from exc
    raise PlannerError("Unbalanced JSON braces in planner output")


def validate_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """Kiểm tra plan có các field bắt buộc."""
    if not isinstance(plan, dict):
        raise PlannerError("Plan must be a JSON object")
    if "tasks" not in plan or not isinstance(plan["tasks"], list):
        raise PlannerError("Plan missing 'tasks' list")
    for i, task in enumerate(plan["tasks"]):
        for field in ("id", "name", "prompt"):
            if field not in task:
                raise PlannerError(f"tasks[{i}] missing required field '{field}'")
    plan.setdefault("project_name", "untitled")
    plan.setdefault("estimated_complexity", "medium")
    return plan


class PlannerBackend(ABC):
    """Interface cho backend lập kế hoạch (Step 1 của orchestrator)."""

    name: str = "abstract"

    @abstractmethod
    def analyze_request(self, user_input: str) -> Dict[str, Any]:
        """Trả về JSON plan đã validate."""

    @abstractmethod
    def is_available(self) -> bool:
        """Backend có chạy được ở chế độ headless không."""


class OpencodePlanner(PlannerBackend):
    """Planner mặc định v1 — dùng `opencode run <prompt>` (headless, verified)."""

    name = "opencode"

    def __init__(
        self,
        opencode_path: str = "opencode",
        model: Optional[str] = None,
        timeout: int = 300,
        cwd: Optional[str] = None,
    ) -> None:
        self.opencode_path = opencode_path
        self.model = model
        self.timeout = timeout
        self.cwd = cwd

    def _cmd(self, prompt: str) -> List[str]:
        cmd = [self.opencode_path, "run"]
        if self.model:
            cmd += ["-m", self.model]
        cmd.append(prompt)
        return cmd

    def is_available(self) -> bool:
        try:
            r = subprocess.run(
                [self.opencode_path, "--version"],
                capture_output=True, text=True, timeout=30,
            )
            return r.returncode == 0
        except (OSError, subprocess.SubprocessError):
            return False

    def analyze_request(self, user_input: str) -> Dict[str, Any]:
        prompt = PLANNING_PROMPT.format(user_input=user_input)
        try:
            result = subprocess.run(
                self._cmd(prompt),
                capture_output=True, text=True,
                timeout=self.timeout, cwd=self.cwd,
            )
        except subprocess.TimeoutExpired as exc:
            raise PlannerError(f"opencode planner timed out after {self.timeout}s") from exc
        if result.returncode != 0:
            raise PlannerError(
                f"opencode failed (code {result.returncode}): "
                f"{strip_ansi(result.stderr)[:500]}"
            )
        return validate_plan(extract_json(result.stdout))


class FreebuffPlanner(PlannerBackend):
    """
    Adapter optional. freebuff v0.0.135 KHÔNG có headless mode
    (xem docstring module để biết bằng chứng) -> luôn raise NotSupported.
    """

    name = "freebuff"

    REASON = (
        "freebuff CLI has no headless mode: argv only accepts the 'login' "
        "subcommand, stdin piping just renders the TUI, and no env var enables "
        "non-interactive output. Use OpencodePlanner for v1."
    )

    def __init__(self, freebuff_path: str = "freebuff") -> None:
        self.freebuff_path = freebuff_path

    def is_available(self) -> bool:
        return False

    def analyze_request(self, user_input: str) -> Dict[str, Any]:
        raise NotSupported(self.REASON)


_REGISTRY = {"opencode": OpencodePlanner, "freebuff": FreebuffPlanner}


def get_planner(name: str = "opencode", **kwargs: Any) -> PlannerBackend:
    """Factory: trả planner theo tên ('opencode' mặc định)."""
    try:
        cls = _REGISTRY[name]
    except KeyError:
        raise PlannerError(
            f"Unknown planner '{name}'. Available: {sorted(_REGISTRY)}"
        ) from None
    return cls(**kwargs)
