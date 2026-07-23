# 🧠 TASK 1: Backend Core - Python Orchestrator

**Phụ trách:** Dev 1  
**Worktree:** `wt_core`  
**Công nghệ:** Python 3.12, subprocess, threading, json, re

---

## 📋 Mục Tiêu

Xây dựng **Orchestrator Core** bằng Python - trái tim của hệ thống Multi-Agent. Module này chịu trách nhiệm:
1. Gọi freebuff CLI để phân tích yêu cầu → nhận JSON Plan
2. Quản lý Git Worktree (tạo, xóa, commit)
3. Phân phối task cho các opencode workers
4. Theo dõi tiến độ và tổng hợp kết quả

---

## 📁 File Cần Tạo

### 1. `backend/core/git_worktree_manager.py`

**Class: `GitWorktreeManager`**

```python
"""
Git Worktree Manager
Quản lý việc tạo, xóa, và đồng bộ các Git Worktree.
Mỗi worker (opencode) sẽ có một Worktree riêng biệt.
"""

import subprocess
import os
from pathlib import Path
from typing import List, Optional


class GitWorktreeError(Exception):
    """Custom exception for Git Worktree operations."""
    pass


class GitWorktreeManager:
    """
    Quản lý Git Worktree cho Multi-Agent system.
    
    Attributes:
        repo_path (Path): Đường dẫn tới repository gốc
        worktrees (dict): Dict quản lý các worktree đang active
    """
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.base_worktree_dir = self.repo_path / ".git" / "worktrees"
        self._ensure_repo()
    
    def _ensure_repo(self) -> None:
        """Kiểm tra và đảm bảo đang ở trong Git repository."""
        result = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=self.repo_path,
            capture_output=True, text=True
        )
        if result.returncode != 0:
            raise GitWorktreeError("Not a git repository")
    
    def create_worktree(
        self, 
        branch_name: str, 
        worktree_path: str, 
        base_branch: str = "main"
    ) -> str:
        """
        Tạo một Worktree mới với branch riêng.
        
        Args:
            branch_name: Tên branch cho worktree
            worktree_path: Đường dẫn thư mục worktree
            base_branch: Branch gốc để tạo từ đó (default: main)
        
        Returns:
            str: Đường dẫn tuyệt đối tới worktree đã tạo
        
        Raises:
            GitWorktreeError: Nếu lệnh git thất bại
        """
        full_path = self.repo_path / worktree_path
        
        # Kiểm tra branch đã tồn tại chưa
        branch_check = subprocess.run(
            ["git", "branch", "--list", branch_name],
            cwd=self.repo_path,
            capture_output=True, text=True
        )
        
        if branch_check.stdout.strip():
            # Branch đã tồn tại - chỉ add worktree
            cmd = ["git", "worktree", "add", str(full_path), branch_name]
        else:
            # Tạo branch mới từ base_branch
            cmd = [
                "git", "worktree", "add", "-b", branch_name,
                str(full_path), base_branch
            ]
        
        result = subprocess.run(
            cmd, cwd=self.repo_path, capture_output=True, text=True
        )
        
        if result.returncode != 0:
            raise GitWorktreeError(
                f"Failed to create worktree: {result.stderr.strip()}"
            )
        
        print(f"✅ Created worktree: {branch_name} -> {full_path}")
        return str(full_path)
    
    def commit_worktree(self, worktree_path: str, message: str) -> bool:
        """
        Commit thay đổi trong worktree.
        
        Args:
            worktree_path: Đường dẫn thư mục worktree
            message: Message cho commit
        
        Returns:
            bool: True nếu commit thành công
        """
        # Git add
        add_result = subprocess.run(
            ["git", "add", "."],
            cwd=worktree_path,
            capture_output=True, text=True
        )
        
        if add_result.returncode != 0:
            print(f"⚠️ Git add failed: {add_result.stderr}")
            return False
        
        # Check if there's anything to commit
        diff_result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            cwd=worktree_path,
            capture_output=True
        )
        
        if diff_result.returncode == 0:
            print("ℹ️ No changes to commit")
            return True
        
        # Git commit
        commit_result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=worktree_path,
            capture_output=True, text=True
        )
        
        if commit_result.returncode != 0:
            print(f"⚠️ Git commit failed: {commit_result.stderr}")
            return False
        
        print(f"✅ Committed: {message}")
        return True
    
    def merge_branch(self, branch_name: str, target_branch: str = "main") -> bool:
        """
        Merge branch từ worktree vào target branch.
        
        Args:
            branch_name: Branch nguồn cần merge
            target_branch: Branch đích (default: main)
        
        Returns:
            bool: True nếu merge thành công
        """
        # Checkout target branch
        subprocess.run(
            ["git", "checkout", target_branch],
            cwd=self.repo_path,
            capture_output=True
        )
        
        # Pull latest
        subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=self.repo_path,
            capture_output=True
        )
        
        # Merge
        result = subprocess.run(
            ["git", "merge", branch_name, "--no-edit"],
            cwd=self.repo_path,
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"⚠️ Merge failed: {result.stderr}")
            return False
        
        print(f"✅ Merged {branch_name} -> {target_branch}")
        return True
    
    def remove_worktree(self, worktree_path: str) -> bool:
        """
        Xóa worktree sau khi hoàn thành.
        
        Args:
            worktree_path: Đường dẫn worktree cần xóa
        
        Returns:
            bool: True nếu xóa thành công
        """
        result = subprocess.run(
            ["git", "worktree", "remove", worktree_path],
            cwd=self.repo_path,
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            print(f"⚠️ Failed to remove worktree: {result.stderr}")
            return False
        
        print(f"✅ Removed worktree: {worktree_path}")
        return True
    
    def list_worktrees(self) -> List[dict]:
        """
        Liệt kê tất cả worktree đang active.
        
        Returns:
            List[dict]: Danh sách worktree với thông tin chi tiết
        """
        result = subprocess.run(
            ["git", "worktree", "list", "--porcelain"],
            cwd=self.repo_path,
            capture_output=True, text=True
        )
        
        if result.returncode != 0:
            raise GitWorktreeError(f"Failed to list worktrees")
        
        worktrees = []
        current = {}
        for line in result.stdout.strip().split("\n"):
            if line.startswith("worktree "):
                if current:
                    worktrees.append(current)
                current = {"path": line[9:]}
            elif line.startswith("HEAD "):
                current["head"] = line[5:]
            elif line.startswith("branch "):
                current["branch"] = line[7:]
            elif line == "":
                if current:
                    worktrees.append(current)
                    current = {}
        
        if current:
            worktrees.append(current)
        
        return worktrees
```

### 2. `backend/core/freebuff_wrapper.py`

**Class: `FreebuffWrapper`**

```python
"""
Freebuff CLI Wrapper
Đóng gọi lệnh freebuff CLI, capture output, parse JSON plan.
"""

import subprocess
import json
import re
import tempfile
from typing import Optional, Dict, Any


class FreebuffError(Exception):
    """Custom exception for Freebuff operations."""
    pass


class FreebuffWrapper:
    """
    Wrapper cho Freebuff CLI.
    
    Quản lý việc gọi freebuff, capture real-time output,
    và parse kết quả trả về.
    """
    
    def __init__(self, freebuff_path: str = "freebuff"):
        self.freebuff_path = freebuff_path
        self._check_available()
    
    def _check_available(self) -> None:
        """Kiểm tra freebuff CLI có sẵn không."""
        result = subprocess.run(
            ["which", self.freebuff_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            raise FreebuffError(
                f"Freebuff CLI not found at '{self.freebuff_path}'"
            )
    
    def analyze_request(self, user_input: str) -> Dict[str, Any]:
        """
        Gửi yêu cầu đến freebuff và nhận JSON plan.
        
        Args:
            user_input: Yêu cầu từ người dùng (text)
        
        Returns:
            Dict: JSON plan chứa danh sách task và thông tin liên quan
        
        Raises:
            FreebuffError: Nếu freebuff trả về lỗi hoặc không parse được JSON
        """
        # Tạo prompt yêu cầu freebuff trả về JSON
        prompt = self._build_planning_prompt(user_input)
        
        # Gọi freebuff CLI
        result = subprocess.run(
            [self.freebuff_path, prompt],
            capture_output=True, text=True, timeout=300  # 5 phút timeout
        )
        
        if result.returncode != 0:
            raise FreebuffError(
                f"Freebuff failed with code {result.returncode}: "
                f"{result.stderr[:500]}"
            )
        
        # Parse output
        plan = self._parse_json_output(result.stdout)
        return plan
    
    def _build_planning_prompt(self, user_input: str) -> str:
        """
        Xây dựng prompt yêu cầu freebuff xuất JSON.
        
        Args:
            user_input: Yêu cầu gốc từ người dùng
        
        Returns:
            str: Prompt hoàn chỉnh
        """
        return f"""You are a project manager. Analyze this request and output a JSON plan.

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
    
    def _parse_json_output(self, raw_output: str) -> Dict[str, Any]:
        """
        Parse JSON từ output của freebuff.
        
        Args:
            raw_output: Raw text output từ freebuff CLI
        
        Returns:
            Dict: Parsed JSON plan
        
        Raises:
            FreebuffError: Nếu không parse được JSON
        """
        # Dùng regex để tìm JSON block
        json_pattern = r'(\{[\s\S]*\})'
        match = re.search(json_pattern, raw_output)
        
        if not match:
            raise FreebuffError(
                "No JSON found in freebuff output. Raw output: "
                f"{raw_output[:300]}"
            )
        
        try:
            plan = json.loads(match.group(1))
            return plan
        except json.JSONDecodeError as e:
            raise FreebuffError(f"Failed to parse JSON plan: {e}")
    
    def stream_logs(self, user_input: str, callback) -> Dict[str, Any]:
        """
        Gọi freebuff và stream logs real-time qua callback.
        
        Args:
            user_input: Yêu cầu từ người dùng
            callback: Function callback nhận log (data: str) -> None
        
        Returns:
            Dict: JSON plan sau khi hoàn thành
        """
        prompt = self._build_planning_prompt(user_input)
        
        raw_output = ""
        
        with subprocess.Popen(
            [self.freebuff_path, prompt],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        ) as process:
            
            # Stream stdout
            for line in process.stdout:
                raw_output += line
                callback({"level": "info", "message": line.strip()})
            
            # Stream stderr
            for line in process.stderr:
                callback({"level": "error", "message": line.strip()})
        
        return self._parse_json_output(raw_output)
```

### 3. `backend/core/task_parser.py`

```python
"""
Task Parser
Chuyển đổi JSON plan thành các task có thể thực thi.
"""

import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class Task:
    """Đại diện cho một task trong hệ thống."""
    id: str
    name: str
    description: str
    assigned_worker: str
    worktree_path: str
    branch_name: str
    prompt: str
    dependencies: List[str] = field(default_factory=list)
    status: str = "pending"  # pending | running | done | error
    
    def to_dict(self) -> Dict[str, Any]:
        """Chuyển task thành dict."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Task":
        """Tạo task từ dict."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


class TaskParser:
    """
    Parser chuyển JSON plan thành danh sách Task objects.
    Hỗ trợ validation và xử lý lỗi.
    """
    
    @staticmethod
    def parse_plan(plan_data: Dict[str, Any]) -> List[Task]:
        """
        Parse JSON plan thành list Task objects.
        
        Args:
            plan_data: Dict từ freebuff output
        
        Returns:
            List[Task]: Danh sách task đã parse
        
        Raises:
            ValueError: Nếu plan_data không hợp lệ
        """
        if "tasks" not in plan_data:
            raise ValueError("Plan data must contain 'tasks' key")
        
        tasks = []
        for task_data in plan_data["tasks"]:
            task = TaskParser._validate_and_create(task_data)
            tasks.append(task)
        
        return tasks
    
    @staticmethod
    def _validate_and_create(task_data: Dict[str, Any]) -> Task:
        """
        Validate và tạo Task từ dict.
        
        Args:
            task_data: Dict chứa thông tin task
        
        Returns:
            Task: Task object đã validated
        
        Raises:
            ValueError: Nếu thiếu field bắt buộc
        """
        required_fields = ["id", "name", "description", "prompt"]
        missing = [f for f in required_fields if f not in task_data]
        
        if missing:
            raise ValueError(
                f"Task missing required fields: {', '.join(missing)}"
            )
        
        return Task.from_dict(task_data)
    
    @staticmethod
    def plan_to_json(tasks: List[Task], project_name: str = "unnamed") -> str:
        """
        Chuyển list Task thành JSON string.
        
        Args:
            tasks: Danh sách task
            project_name: Tên dự án
        
        Returns:
            str: JSON string
        """
        return json.dumps({
            "project_name": project_name,
            "tasks": [t.to_dict() for t in tasks]
        }, indent=2, ensure_ascii=False)
```

### 4. `backend/core/orchestrator.py`

**Class: `Orchestrator`** - Main controller

```python
#!/usr/bin/env python3
"""
Multi-Agent Orchestrator Core
--------------------------------
Main controller cho hệ thống Multi-Agent.
Phối hợp freebuff (Supervisor) và opencode (Workers) 
thông qua Git Worktree isolation.
"""

import sys
import os
import json
import time
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable

# Thêm thư mục hiện tại vào path
sys.path.insert(0, str(Path(__file__).parent))

from git_worktree_manager import GitWorktreeManager, GitWorktreeError
from freebuff_wrapper import FreebuffWrapper, FreebuffError
from task_parser import TaskParser, Task


class Orchestrator:
    """
    Orchestrator chính - Điều phối toàn bộ hệ thống Multi-Agent.
    
    Quy trình:
    1. Nhận yêu cầu từ người dùng
    2. Gọi freebuff để lập kế hoạch
    3. Tạo Git Worktree cho mỗi task
    4. Phân phối task cho opencode workers (song song)
    5. Theo dõi tiến độ
    6. Merge kết quả về main
    7. Dọn dẹp worktree
    """
    
    def __init__(
        self,
        repo_path: str = ".",
        freebuff_path: str = "freebuff",
        opencode_path: str = "opencode",
        workers_count: int = 4
    ):
        self.repo_path = Path(repo_path).resolve()
        self.git_manager = GitWorktreeManager(str(self.repo_path))
        self.freebuff = FreebuffWrapper(freebuff_path)
        self.opencode_path = opencode_path
        self.workers_count = workers_count
        
        # Trạng thái
        self.tasks: List[Task] = []
        self.results: Dict[str, Dict[str, Any]] = {}
        self.logs: List[Dict[str, str]] = []
        self._running = False
        self._on_log: Optional[Callable] = None
    
    def on_log(self, callback: Callable) -> None:
        """Đăng ký callback nhận log real-time."""
        self._on_log = callback
    
    def _log(self, level: str, message: str) -> None:
        """Ghi log và gọi callback nếu có."""
        log_entry = {"level": level, "message": message}
        self.logs.append(log_entry)
        if self._on_log:
            self._on_log(log_entry)
        print(f"[{level.upper()}] {message}")
    
    def run(self, user_input: str) -> bool:
        """
        Chạy toàn bộ quy trình Multi-Agent.
        
        Args:
            user_input: Yêu cầu từ người dùng
        
        Returns:
            bool: True nếu tất cả task hoàn thành thành công
        """
        self._running = True
        self._log("info", f"🚀 Starting Multi-Agent workflow for: {user_input}")
        
        try:
            # Bước 1: Freebuff Planning
            self._log("info", "📋 Step 1: Calling freebuff for planning...")
            plan = self.freebuff.analyze_request(user_input)
            self.tasks = TaskParser.parse_plan(plan)
            self._log(
                "info", 
                f"✅ Plan received: {len(self.tasks)} tasks created"
            )
            
            # Bước 2: Create Worktrees
            self._log("info", "🌿 Step 2: Creating Git Worktrees...")
            if not self._create_all_worktrees():
                raise RuntimeError("Failed to create worktrees")
            
            # Bước 3: Parallel Execution
            self._log(
                "info", 
                f"⚡ Step 3: Executing {len(self.tasks)} tasks in parallel..."
            )
            self._execute_tasks()
            
            # Bước 4: Merge Results
            self._log("info", "🔄 Step 4: Merging results to main...")
            self._merge_all()
            
            # Bước 5: Cleanup
            self._log("info", "🧹 Step 5: Cleaning up worktrees...")
            self._cleanup_all()
            
            self._log("info", "✅ All tasks completed successfully!")
            return True
            
        except Exception as e:
            self._log("error", f"❌ Workflow failed: {str(e)}")
            return False
        finally:
            self._running = False
    
    def _create_all_worktrees(self) -> bool:
        """
        Tạo worktree cho tất cả task.
        
        Returns:
            bool: True nếu tất cả thành công
        """
        success = True
        for task in self.tasks:
            try:
                self.git_manager.create_worktree(
                    task.branch_name,
                    task.worktree_path
                )
                task.status = "ready"
            except GitWorktreeError as e:
                self._log("error", f"Failed to create worktree for {task.id}: {e}")
                task.status = "error"
                success = False
        return success
    
    def _execute_tasks(self) -> None:
        """
        Thực thi các task song song bằng opencode.
        Mỗi task chạy trong một thread riêng.
        """
        threads = []
        
        for task in self.tasks:
            if task.status != "ready":
                continue
            
            thread = threading.Thread(
                target=self._execute_single_task,
                args=(task,),
                name=f"worker-{task.id}"
            )
            threads.append(thread)
            thread.start()
            self._log("info", f"▶️ Started task: {task.name} (thread: {thread.name})")
        
        # Chờ tất cả thread hoàn thành
        for thread in threads:
            thread.join()
    
    def _execute_single_task(self, task: Task) -> None:
        """
        Thực thi một task bằng opencode CLI.
        
        Args:
            task: Task cần thực thi
        """
        task.status = "running"
        worktree_full_path = str(self.repo_path / task.worktree_path)
        
        # Tạo prompt cho opencode
        prompt = f"""
You are working in directory: {worktree_full_path}
Your task: {task.name}
Description: {task.description}

Instructions:
{task.prompt}

Please implement this task completely. 
After implementation, commit your changes with message: "[Dev] {task.name}"
"""
        
        try:
            # Gọi opencode CLI
            process = subprocess.Popen(
                [self.opencode_path, prompt],
                cwd=worktree_full_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Stream output real-time
            for line in process.stdout:
                self._log("info", f"[{task.name}] {line.strip()}")
            
            for line in process.stderr:
                self._log("error", f"[{task.name}] {line.strip()}")
            
            process.wait()
            
            if process.returncode == 0:
                # Commit thay đổi
                self.git_manager.commit_worktree(
                    worktree_full_path,
                    f"[Dev] {task.name}"
                )
                task.status = "done"
                self._log("info", f"✅ Task completed: {task.name}")
            else:
                task.status = "error"
                self._log(
                    "error", 
                    f"❌ Task failed (code {process.returncode}): {task.name}"
                )
                
        except Exception as e:
            task.status = "error"
            self._log("error", f"❌ Task exception: {task.name} - {str(e)}")
    
    def _merge_all(self) -> None:
        """Merge tất cả branch hoàn thành vào main."""
        for task in self.tasks:
            if task.status == "done":
                self.git_manager.merge_branch(task.branch_name)
    
    def _cleanup_all(self) -> None:
        """Dọn dẹp tất cả worktree."""
        for task in self.tasks:
            try:
                self.git_manager.remove_worktree(
                    str(self.repo_path / task.worktree_path)
                )
            except GitWorktreeError as e:
                self._log("warn", f"Cleanup warning for {task.id}: {e}")


def main():
    """Entry point - CLI interface."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Multi-Agent Orchestrator - Điều phối Freebuff + Opencode"
    )
    parser.add_argument(
        "input",
        nargs="?",
        help="Yêu cầu từ người dùng (hoặc đọc từ file nếu bỏ qua)"
    )
    parser.add_argument(
        "--input-file",
        help="Đọc yêu cầu từ file"
    )
    parser.add_argument(
        "--repo",
        default=".",
        help="Đường dẫn tới Git repository (default: current dir)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Số lượng worker tối đa (default: 4)"
    )
    
    args = parser.parse_args()
    
    # Đọc input
    user_input = args.input
    if args.input_file:
        with open(args.input_file, "r") as f:
            user_input = f.read()
    
    if not user_input:
        print("❌ Vui lòng cung cấp yêu cầu (input hoặc --input-file)")
        sys.exit(1)
    
    # Chạy orchestrator
    orchestrator = Orchestrator(
        repo_path=args.repo,
        workers_count=args.workers
    )
    
    success = orchestrator.run(user_input)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
```

### 5. `backend/core/requirements.txt`

```
# Python dependencies for Multi-Agent Orchestrator Core
# No external dependencies needed - uses only standard library:
# - subprocess (CLI management)
# - threading (parallel execution)
# - json (plan parsing)
# - re (regex parsing)
# - dataclasses (task model)
# - pathlib (path management)
# - argparse (CLI interface)
```

---

## 🎯 Yêu Cầu Hoàn Thành

1. ✅ Tạo đủ 5 file trong `backend/core/`
2. ✅ Code Python thuần (không dependencies ngoài)
3. ✅ Xử lý lỗi cho tất cả Git operations
4. ✅ Thread-safe logging
5. ✅ CLI interface qua argparse
6. ✅ Viết unit test trong `tests/test_orchestrator.py`
7. ✅ Kiểm thử với `python3 backend/core/orchestrator.py --help`

---

## 📤 Giao Tiếp Với Các Dev Khác

- **Gửi cho Dev 2**: JSON plan qua file `data/plan.json` và Socket.IO event `plan-ready`
- **Gửi cho Dev 3**: Stream logs qua WebSocket endpoint (nếu server đã chạy)
- **Gửi cho Dev 4**: Gọi Git scripts khi cần merge/cleanup

---

## 🔗 Phụ Thuộc

- Task này **độc lập** (có thể làm trước)
- Dev 2 cần task này hoàn thành để biết API contract
- Dev 3 cần task này để biết JSON structure hiển thị

---

## 📝 Hướng Dẫn Kiểm Thử

```bash
# Kiểm tra syntax
python3 -m py_compile backend/core/orchestrator.py
python3 -m py_compile backend/core/git_worktree_manager.py

# Chạy help
python3 backend/core/orchestrator.py --help

# Chạy thử với input mẫu (nếu ở trong git repo)
# python3 backend/core/orchestrator.py "Create a simple hello world app" --repo /path/to/repo
```

*Happy coding! 🚀*
