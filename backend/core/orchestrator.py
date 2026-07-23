#!/usr/bin/env python3
"""
Multi-Agent Orchestrator Core
--------------------------------
Main controller cho hệ thống Multi-Agent.
Phối hợp freebuff (Supervisor) và opencode (Workers) 
thông qua Git Worktree isolation.
"""

import sys
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
        
        Sử dụng threading để đọc stdout và stderr đồng thời
        tránh deadlock khi pipe buffer đầy.
        
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
            
            # Đọc stdout và stderr đồng thời để tránh deadlock
            stdout_lines = []
            stderr_lines = []
            
            def read_stream(stream, lines, level):
                for line in stream:
                    lines.append(line)
                    self._log(level, f"[{task.name}] {line.strip()}")
            
            stdout_thread = threading.Thread(
                target=read_stream,
                args=(process.stdout, stdout_lines, "info"),
                daemon=True
            )
            stderr_thread = threading.Thread(
                target=read_stream,
                args=(process.stderr, stderr_lines, "error"),
                daemon=True
            )
            
            stdout_thread.start()
            stderr_thread.start()
            
            try:
                process.wait(timeout=600)  # 10 phút timeout
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                raise TimeoutError(f"Task {task.name} timed out after 10 minutes")
            finally:
                # Luôn join threads để cleanup
                stdout_thread.join(timeout=5)
                stderr_thread.join(timeout=5)
            
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
        """
        Dọn dẹp worktree - chỉ xóa worktree của task đã hoàn thành.
        Giữ nguyên worktree của task bị lỗi để debug.
        """
        for task in self.tasks:
            if task.status != "done":
                self._log(
                    "warn",
                    f"⏸️  Preserving worktree for failed task {task.id}: "
                    f"{task.worktree_path}"
                )
                continue
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
