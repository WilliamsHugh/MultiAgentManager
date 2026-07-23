#!/usr/bin/env python3
"""
Integration tests cho toàn bộ hệ thống Multi-Agent Manager.
"""

import sys
import os
import json
import subprocess
import tempfile
import unittest
from pathlib import Path


class TestSystemIntegration(unittest.TestCase):
    """Integration tests cho toàn bộ hệ thống."""

    @classmethod
    def setUpClass(cls):
        """Thiết lập môi trường test."""
        cls.project_root = Path(__file__).parent.parent
        cls.test_dir = tempfile.mkdtemp(prefix="ma-test-")

        # Initialize test git repo with main branch
        subprocess.run(["git", "init"], cwd=cls.test_dir, capture_output=True)
        subprocess.run(
            ["git", "checkout", "-b", "main"],
            cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.email", "test@test.com"],
            cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"],
            cwd=cls.test_dir, capture_output=True
        )

        # Create initial commit on main
        (Path(cls.test_dir) / "README.md").write_text("# Test Repo")
        subprocess.run(
            ["git", "add", "."], cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],
            cwd=cls.test_dir, capture_output=True
        )

        # Create shared worktree for commit test
        cls.wt_path = os.path.join(cls.test_dir, "wt_commit_test")
        result = subprocess.run(
            ["git", "worktree", "add", "-b", "commit-test-branch",
             cls.wt_path, "main"],
            cwd=cls.test_dir, capture_output=True, text=True
        )
        if result.returncode != 0:
            raise RuntimeError(f"Failed to create worktree: {result.stderr}")

    @classmethod
    def tearDownClass(cls):
        """Dọn dẹp sau test."""
        import shutil

        # Remove worktree first
        subprocess.run(
            ["git", "worktree", "remove", "--force", cls.wt_path],
            cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "worktree", "prune"],
            cwd=cls.test_dir, capture_output=True
        )

        shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_git_worktree_create(self):
        """Test tạo git worktree."""
        wt_path = os.path.join(self.test_dir, "wt_create_test")
        result = subprocess.run(
            [
                "git", "worktree", "add", "-b", "create-test-branch",
                wt_path, "main"
            ],
            cwd=self.test_dir,
            capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0)

        # Verify worktree exists
        result = subprocess.run(
            ["git", "worktree", "list"],
            cwd=self.test_dir,
            capture_output=True, text=True
        )
        self.assertIn("wt_create_test", result.stdout)

        # Cleanup
        subprocess.run(["git", "worktree", "remove", "--force", wt_path],
                       cwd=self.test_dir, capture_output=True)

    def test_git_worktree_commit(self):
        """Test commit trong worktree (uses setUpClass worktree)."""
        # Tạo file trong worktree
        (Path(self.wt_path) / "test.txt").write_text("Hello World")

        # Commit
        result = subprocess.run(
            ["git", "add", "."], cwd=self.wt_path, capture_output=True
        )
        self.assertEqual(result.returncode, 0)

        result = subprocess.run(
            ["git", "commit", "-m", "Test commit"],
            cwd=self.wt_path, capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0)

    def test_python_modules_import(self):
        """Test import các Python modules."""
        sys.path.insert(0, str(self.project_root / "backend" / "core"))

        try:
            from task_parser import TaskParser, Task
            self.assertTrue(True, "Modules imported successfully")
        except ImportError as e:
            self.fail(f"Failed to import modules: {e}")

    def test_task_parser_with_git(self):
        """Test TaskParser hoạt động với git integration."""
        sys.path.insert(0, str(self.project_root / "backend" / "core"))
        from task_parser import TaskParser, Task

        plan = {
            "project_name": "Git Test",
            "tasks": [
                {
                    "id": "git-task-1",
                    "name": "Git Integration Test",
                    "description": "Test task",
                    "assigned_worker": "opencode",
                    "worktree_path": "wt_git_test",
                    "branch_name": "feature/git-test",
                    "prompt": "Test git integration",
                    "dependencies": []
                }
            ]
        }

        tasks = TaskParser.parse_plan(plan)
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].worktree_path, "wt_git_test")


if __name__ == "__main__":
    unittest.main()
