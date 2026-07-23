#!/usr/bin/env python3
"""
Unit tests cho Multi-Agent Orchestrator Core.
"""

import sys
import os
import unittest
import json
import tempfile
from pathlib import Path

# Thêm backend/core vào path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "core"))

from task_parser import TaskParser, Task


class TestTaskParser(unittest.TestCase):
    """Test TaskParser operations."""
    
    def setUp(self):
        self.valid_plan = {
            "project_name": "Test Project",
            "tasks": [
                {
                    "id": "task-1",
                    "name": "Frontend UI",
                    "description": "Build the frontend UI",
                    "assigned_worker": "opencode",
                    "worktree_path": "wt_frontend",
                    "branch_name": "feature/frontend",
                    "prompt": "Create a React app",
                    "dependencies": []
                },
                {
                    "id": "task-2",
                    "name": "Backend API",
                    "description": "Build the backend API",
                    "assigned_worker": "opencode",
                    "worktree_path": "wt_backend",
                    "branch_name": "feature/backend",
                    "prompt": "Create an Express API",
                    "dependencies": []
                }
            ]
        }
    
    def test_parse_valid_plan(self):
        """Test parsing valid plan."""
        tasks = TaskParser.parse_plan(self.valid_plan)
        self.assertEqual(len(tasks), 2)
        self.assertEqual(tasks[0].name, "Frontend UI")
        self.assertEqual(tasks[1].worktree_path, "wt_backend")
    
    def test_parse_plan_no_tasks(self):
        """Test parsing plan without tasks raises error."""
        with self.assertRaises(ValueError):
            TaskParser.parse_plan({"project_name": "Test"})
    
    def test_parse_plan_missing_fields(self):
        """Test parsing task with missing required fields."""
        invalid_plan = {
            "tasks": [
                {
                    "id": "task-1",
                    "name": "Test Task"
                    # Missing description, prompt
                }
            ]
        }
        with self.assertRaises(ValueError) as context:
            TaskParser.parse_plan(invalid_plan)
        self.assertIn("missing required fields", str(context.exception))
    
    def test_task_to_dict(self):
        """Test Task to dict conversion."""
        tasks = TaskParser.parse_plan(self.valid_plan)
        task_dict = tasks[0].to_dict()
        self.assertEqual(task_dict["name"], "Frontend UI")
        self.assertEqual(task_dict["status"], "pending")
    
    def test_task_from_dict(self):
        """Test Task from dict creation."""
        data = {
            "id": "test-1",
            "name": "Test",
            "description": "Test desc",
            "assigned_worker": "opencode",
            "worktree_path": "wt_test",
            "branch_name": "feature/test",
            "prompt": "Do something",
            "dependencies": []
        }
        task = Task.from_dict(data)
        self.assertEqual(task.name, "Test")
        self.assertEqual(task.status, "pending")
    
    def test_plan_to_json(self):
        """Test plan serialization to JSON."""
        tasks = TaskParser.parse_plan(self.valid_plan)
        json_str = TaskParser.plan_to_json(tasks, "Test")
        parsed = json.loads(json_str)
        self.assertEqual(parsed["project_name"], "Test")
        self.assertEqual(len(parsed["tasks"]), 2)


class TestTaskModel(unittest.TestCase):
    """Test Task dataclass."""
    
    def test_task_default_status(self):
        """Test default status is pending."""
        task = Task(
            id="test",
            name="Test",
            description="Test",
            assigned_worker="opencode",
            worktree_path="wt_test",
            branch_name="feature/test",
            prompt="Test prompt"
        )
        self.assertEqual(task.status, "pending")
    
    def test_task_with_custom_status(self):
        """Test custom status."""
        task = Task(
            id="test", name="Test", description="Test",
            assigned_worker="opencode", worktree_path="wt_test",
            branch_name="feature/test", prompt="Test prompt",
            status="running"
        )
        self.assertEqual(task.status, "running")


if __name__ == "__main__":
    unittest.main()
