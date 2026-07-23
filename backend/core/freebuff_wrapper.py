"""
Freebuff CLI Wrapper
Đóng gọi lệnh freebuff CLI, capture output, parse JSON plan.
"""

import subprocess
import json
import re
from typing import Optional, Dict, Any, Callable


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
    
    def stream_logs(self, user_input: str, callback: Callable) -> Dict[str, Any]:
        """
        Gọi freebuff và stream logs real-time qua callback.
        
        Args:
            user_input: Yêu cầu từ người dùng
            callback: Function callback nhận log (data: dict) -> None
        
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
