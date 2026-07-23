"""
Task Parser
Chuyển đổi JSON plan thành các task có thể thực thi.
"""

import json
from typing import List, Dict, Any
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
