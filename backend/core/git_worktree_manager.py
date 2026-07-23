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
