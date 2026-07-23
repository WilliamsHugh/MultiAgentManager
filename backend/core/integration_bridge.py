#!/usr/bin/env python3
"""
Integration Bridge
------------------
Kết nối Python Orchestrator Core với Node.js Backend Server.
Module này đóng vai trò cầu nối, cho phép Orchestrator giao tiếp
với Server qua REST API để:
  - Submit plan (tasks) từ Orchestrator lên Server
  - Fetch task status từ Server
  - Push logs real-time vào Server database
  - Lấy queue stats từ Server
"""

import json
import urllib.request
import urllib.error
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass


class BridgeError(Exception):
    """Custom exception for Bridge operations."""
    pass


@dataclass
class BridgeConfig:
    """Cấu hình kết nối tới Backend Server."""
    host: str = "localhost"
    port: int = 3001
    protocol: str = "http"
    timeout: int = 10  # seconds
    retry_count: int = 3
    retry_delay: float = 1.0  # seconds

    @property
    def base_url(self) -> str:
        return f"{self.protocol}://{self.host}:{self.port}"


class IntegrationBridge:
    """
    Bridge để Orchestrator giao tiếp với Node.js Server.
    
    Sử dụng:
        bridge = IntegrationBridge()
        
        # Gửi plan từ freebuff lên server
        plan = {...}  # JSON plan từ freebuff
        project = bridge.submit_plan("My Project", plan)
        
        # Tạo task và theo dõi
        task = bridge.create_task(project_id, task_data)
        
        # Push logs
        bridge.push_log(task_id, "info", "Task started")
    """
    
    def __init__(self, config: Optional[BridgeConfig] = None):
        self.config = config or BridgeConfig()
        self._healthy = False
        self._check_connection()
    
    def _check_connection(self) -> bool:
        """Kiểm tra kết nối tới Server."""
        try:
            result = self._request("GET", "/api/health")
            self._healthy = result.get("status") == "ok"
            return self._healthy
        except Exception:
            self._healthy = False
            return False
    
    @property
    def is_healthy(self) -> bool:
        """Trạng thái kết nối tới Server."""
        return self._healthy
    
    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict] = None,
        retry: bool = True
    ) -> Dict[str, Any]:
        """
        Gửi HTTP request tới Server.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            path: URL path (ví dụ: /api/tasks)
            body: Request body (sẽ serialize thành JSON)
            retry: Có retry khi thất bại không
        
        Returns:
            Dict: Response body parsed từ JSON
        
        Raises:
            BridgeError: Nếu request thất bại sau tất cả retries
        """
        url = f"{self.config.base_url}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "MultiAgent-Bridge/1.0"
        }
        
        last_error = None
        
        for attempt in range(self.config.retry_count if retry else 1):
            try:
                req = urllib.request.Request(
                    url,
                    data=data,
                    headers=headers,
                    method=method
                )
                
                # Localhost - không cần SSL context
                with urllib.request.urlopen(
                    req,
                    timeout=self.config.timeout
                ) as response:
                    response_body = response.read().decode("utf-8")
                    if response_body:
                        return json.loads(response_body)
                    return {}
                    
            except urllib.error.HTTPError as e:
                error_body = e.read().decode("utf-8") if e.fp else ""
                last_error = BridgeError(
                    f"HTTP {e.code} on {method} {path}: {error_body}"
                )
            except urllib.error.URLError as e:
                last_error = BridgeError(
                    f"Connection failed on {method} {path}: {e.reason}"
                )
            except json.JSONDecodeError as e:
                last_error = BridgeError(
                    f"Invalid JSON response from {path}: {e}"
                )
            except Exception as e:
                last_error = BridgeError(
                    f"Unexpected error on {method} {path}: {str(e)}"
                )
            
            if retry and attempt < self.config.retry_count - 1:
                time.sleep(self.config.retry_delay)
        
        raise last_error if last_error else BridgeError(f"Request failed: {method} {path}")
    
    # ─── Health ───
    
    def health_check(self) -> Dict[str, Any]:
        """Kiểm tra sức khỏe server."""
        result = self._request("GET", "/api/health", retry=False)
        self._healthy = result.get("status") == "ok"
        return result
    
    # ─── Projects ───
    
    def create_project(self, name: str) -> Dict[str, Any]:
        """
        Tạo project mới trên Server.
        
        Args:
            name: Tên project
        
        Returns:
            Dict: Project object từ server
        """
        return self._request("POST", "/api/projects", {"name": name})
    
    def get_projects(self) -> List[Dict[str, Any]]:
        """Lấy danh sách tất cả projects."""
        return self._request("GET", "/api/projects")
    
    # ─── Tasks ───
    
    def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Tạo task mới trên Server.
        
        Args:
            task_data: Task data (projectId, name, description, prompt, ...)
        
        Returns:
            Dict: Task object từ server
        """
        return self._request("POST", "/api/tasks", task_data)
    
    def get_tasks(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lấy danh sách tasks.
        
        Args:
            project_id: Optional - lọc theo project
        """
        path = f"/api/tasks?project_id={project_id}" if project_id else "/api/tasks"
        return self._request("GET", path)
    
    def get_task(self, task_id: str) -> Dict[str, Any]:
        """Lấy chi tiết một task."""
        return self._request("GET", f"/api/tasks/{task_id}")
    
    def update_task_status(
        self,
        task_id: str,
        status: str,
        exit_code: Optional[int] = None
    ) -> Dict[str, Any]:
        """Cập nhật trạng thái task."""
        body = {"status": status}
        if exit_code is not None:
            body["exit_code"] = exit_code
        return self._request("PUT", f"/api/tasks/{task_id}/status", body)
    
    def delete_task(self, task_id: str) -> Dict[str, Any]:
        """Xóa một task."""
        return self._request("DELETE", f"/api/tasks/{task_id}")
    
    # ─── Logs ───
    
    def push_log(
        self,
        task_id: str,
        level: str,
        message: str,
        source: str = "orchestrator"
    ) -> Dict[str, Any]:
        """
        Push log entry vào Server bằng cách update task status.
        
        Ghi log thông qua API update task status (kèm exit_code).
        Log chi tiết được quản lý bởi server khi worker chạy.
        
        Args:
            task_id: ID của task
            level: log level (info, error, warn)
            message: Nội dung log
            source: Nguồn log (orchestrator, worker, system)
        
        Returns:
            Dict: Task object từ server
        """
        # Dùng update status để ghi nhận log từ orchestrator
        status_map = {
            "info": "running",
            "warn": "running",
            "error": "error"
        }
        task_status = status_map.get(level, "running")
        return self.update_task_status(task_id, task_status)
    
    # ─── Queue Stats ───
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Lấy queue stats từ server."""
        return self._request("GET", "/api/queue/stats")
    
    # ─── Worktrees ───
    
    def create_worktree_record(
        self,
        task_id: str,
        path: str,
        branch_name: str
    ) -> Dict[str, Any]:
        """Tạo worktree record trên server."""
        return self._request(
            "POST", "/api/worktrees",
            {"task_id": task_id, "path": path, "branch_name": branch_name}
        )
    
    # ─── Submit Full Plan ───
    
    def submit_plan(
        self,
        project_name: str,
        plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submit toàn bộ plan từ freebuff lên Server.
        
        Quy trình:
        1. Tạo project
        2. Tạo từng task trong plan
        3. Trả về kết quả
        
        Args:
            project_name: Tên project
            plan: JSON plan từ freebuff (chứa tasks list)
        
        Returns:
            Dict: { "project": Project, "tasks": [Task, ...] }
        """
        # 1. Tạo project
        project = self.create_project(project_name)
        
        # 2. Tạo các tasks
        created_tasks = []
        for task_data in plan.get("tasks", []):
            task_payload = {
                "projectId": project["id"],
                "name": task_data.get("name", "Unnamed Task"),
                "description": task_data.get("description", ""),
                "assignedWorker": task_data.get("assigned_worker", "opencode"),
                "worktreePath": task_data.get("worktree_path", ""),
                "branchName": task_data.get("branch_name", ""),
                "prompt": task_data.get("prompt", ""),
                "dependencies": task_data.get("dependencies", [])
            }
            task = self.create_task(task_payload)
            
            # Tạo worktree record
            if task_data.get("worktree_path"):
                self.create_worktree_record(
                    task["id"],
                    task_data["worktree_path"],
                    task_data.get("branch_name", "")
                )
            
            created_tasks.append(task)
        
        return {
            "project": project,
            "tasks": created_tasks
        }


def create_bridge(
    host: str = "localhost",
    port: int = 3001,
    timeout: int = 5
) -> IntegrationBridge:
    """
    Factory function - tạo IntegrationBridge instance.
    
    Args:
        host: Server hostname
        port: Server port
        timeout: Request timeout seconds
    
    Returns:
        IntegrationBridge instance (có thể không kết nối được server)
        Kiểm tra bridge.is_healthy để biết trạng thái kết nối
    """
    config = BridgeConfig(host=host, port=port, timeout=timeout)
    bridge = IntegrationBridge(config)
    
    if not bridge.is_healthy:
        print(f"⚠️  Cannot connect to server at {host}:{port}")
        print(f"   Make sure the backend server is running:")
        print(f"   cd backend/server && npm run dev")
    
    return bridge
