# 🛠️ TASK 4: DevOps & Integration

**Phụ trách:** Dev 4  
**Worktree:** `wt_devops`  
**Công nghệ:** Bash, Python, Git, GitHub Actions

---

## 📋 Mục Tiêu

Xây dựng **DevOps & Integration** layer - các script và công cụ hỗ trợ vận hành hệ thống:
1. Git merge & cleanup automation
2. Error recovery & workspace management
3. Integration testing framework
4. CI/CD pipeline configuration
5. Project-wide documentation

---

## 📁 File Cần Tạo

### 1. `scripts/setup.sh`

```bash
#!/bin/bash
#
# setup.sh - Thiết lập môi trường dự án Multi-Agent Manager
#
# Usage: ./scripts/setup.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔══════════════════════════════════════════════╗"
echo "║   Multi-Agent Manager - Environment Setup    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Check Prerequisites ───
echo -e "\n${CYAN}Checking prerequisites...${NC}"

check_command() {
    if command -v "$1" &>/dev/null; then
        log_ok "$1: $($1 --version 2>&1 | head -1)"
        return 0
    else
        log_error "$1 is not installed"
        return 1
    fi
}

check_command "node"
check_command "npm"
check_command "python3"
check_command "git"
check_command "freebuff" || log_warn "freebuff not found - install from https://freebuff.com"
check_command "opencode" || log_warn "opencode not found - install from https://opencode.com"

# ─── Install Dependencies ───
echo -e "\n${CYAN}Installing dependencies...${NC}"

# Backend Server
if [ -f "$PROJECT_DIR/backend/server/package.json" ]; then
    log_info "Installing backend server dependencies..."
    cd "$PROJECT_DIR/backend/server"
    npm install --silent
    log_ok "Backend server dependencies installed"
fi

# Frontend
if [ -f "$PROJECT_DIR/frontend/package.json" ]; then
    log_info "Installing frontend dependencies..."
    cd "$PROJECT_DIR/frontend"
    npm install --silent
    log_ok "Frontend dependencies installed"
fi

# ─── Create Data Directories ───
echo -e "\n${CYAN}Creating data directories...${NC}"
mkdir -p "$PROJECT_DIR/backend/server/data"
mkdir -p "$PROJECT_DIR/data"
log_ok "Data directories created"

# ─── Git Hooks ───
echo -e "\n${CYAN}Setting up Git hooks...${NC}"
HOOKS_DIR="$PROJECT_DIR/.git/hooks"

if [ -d "$HOOKS_DIR" ]; then
    # Pre-commit hook
    cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit checks..."
EOF
    chmod +x "$HOOKS_DIR/pre-commit"
    log_ok "Git hooks configured"
fi

# ─── Initial Git Setup ───
echo -e "\n${CYAN}Initializing Git repository...${NC}"
if [ ! -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    git init
    git checkout -b main
    log_ok "Git repository initialized"
else
    log_info "Git repository already exists"
fi

# ─── Summary ───
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║            Setup Complete!                    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Start server: cd backend/server && npm start ║"
echo "║  Start UI:     cd frontend && npm run dev     ║"
echo "║  Run tests:    ./scripts/test.sh              ║"
echo "╚══════════════════════════════════════════════╝"
```

### 2. `scripts/git_merge.sh`

```bash
#!/bin/bash
#
# git_merge.sh - Hợp nhất các branch từ worktree về main
#
# Usage: ./scripts/git_merge.sh [branch_name]
#   - Nếu không có branch_name, merge tất cả branch đã hoàn thành
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_DIR"

# Ensure we're on main
git checkout main 2>/dev/null || git checkout -b main

# Pull latest
git pull --ff-only 2>/dev/null || true

merge_branch() {
    local branch=$1
    log_info "Merging branch: $branch -> main"
    
    if git merge "$branch" --no-edit 2>/dev/null; then
        log_ok "✅ Merged: $branch"
        return 0
    else
        log_error "❌ Merge conflict in $branch"
        git merge --abort 2>/dev/null || true
        return 1
    fi
}

# Merge specific branch or all feature branches
if [ $# -ge 1 ]; then
    merge_branch "$1"
else
    # Find all feature branches that don't exist in main
    for branch in $(git branch --list 'feature/*' 'task/*' 'wt_*'); do
        branch=$(echo "$branch" | tr -d ' *')
        merge_branch "$branch"
    done
fi

log_ok "🎉 Merge complete!"
```

### 3. `scripts/cleanup.sh`

```bash
#!/bin/bash
#
# cleanup.sh - Dọn dẹp worktree và branch tạm thời
#
# Usage: ./scripts/cleanup.sh [--force] [--all]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_DIR"

FORCE=false
CLEAN_ALL=false

for arg in "$@"; do
    case $arg in
        --force) FORCE=true ;;
        --all) CLEAN_ALL=true ;;
    esac
done

cleanup_worktree() {
    local path=$1
    
    if [ ! -d "$path" ]; then
        log_warn "Worktree not found: $path"
        return
    fi
    
    log_info "Removing worktree: $path"
    
    if $FORCE; then
        git worktree remove --force "$path" 2>/dev/null || {
            log_warn "Force remove failed, trying manual cleanup..."
            rm -rf "$path"
            git worktree prune
        }
    else
        git worktree remove "$path" 2>/dev/null || {
            log_warn "Cannot remove $path - has uncommitted changes"
            log_info "Use --force to force remove"
        }
    fi
}

# List all worktrees
log_info "Current worktrees:"
git worktree list

echo ""

# Clean up merged branches
for branch in $(git branch --merged main | grep -v "main" | grep -v "^\*" | tr -d ' '); do
    if $CLEAN_ALL || [[ "$branch" == feature/* ]] || [[ "$branch" == task/* ]]; then
        log_info "Deleting merged branch: $branch"
        git branch -d "$branch" 2>/dev/null || log_warn "Could not delete $branch"
    fi
done

# Clean up worktrees
for wt_path in $(git worktree list --porcelain | grep "^worktree " | grep -v "^worktree $(pwd)" | sed 's/^worktree //'); do
    cleanup_worktree "$wt_path"
done

# Prune
git worktree prune
log_ok "🧹 Cleanup complete!"
```

### 4. `scripts/error_recovery.sh`

```bash
#!/bin/bash
#
# error_recovery.sh - Khôi phục khi worker gặp lỗi
#
# Usage: ./scripts/error_recovery.sh <worktree_path> [branch_name]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

WORKTREE_PATH="${1:-}"
BRANCH_NAME="${2:-}"

if [ -z "$WORKTREE_PATH" ]; then
    log_error "Usage: $0 <worktree_path> [branch_name]"
    exit 1
fi

cd "$PROJECT_DIR"

log_info "🔄 Starting error recovery for: $WORKTREE_PATH"

# Step 1: Check current state
if [ ! -d "$WORKTREE_PATH" ]; then
    log_error "Worktree directory not found: $WORKTREE_PATH"
    exit 1
fi

log_info "Checking worktree state..."
cd "$WORKTREE_PATH"

# Step 2: Check git status
GIT_STATUS=$(git status --porcelain)
if [ -n "$GIT_STATUS" ]; then
    log_warn "Uncommitted changes detected"
    echo "$GIT_STATUS" | head -20
    
    # Offer to stash
    log_info "Stashing uncommitted changes..."
    git stash save "auto-stash: error recovery $(date +%Y%m%d_%H%M%S)"
    log_ok "Changes stashed"
fi

# Step 3: Check for merge conflicts
if git diff --cached --quiet 2>/dev/null; then
    log_info "No merge conflicts"
fi

# Step 4: Get branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
log_info "Current branch: $CURRENT_BRANCH"

# Step 5: Try to commit any partial work
if [ -n "$GIT_STATUS" ]; then
    log_info "Creating recovery commit..."
    git add .
    git commit -m "[RECOVERY] Partial work - $(date +%Y-%m-%d)" || true
    log_ok "Recovery commit created"
fi

# Step 6: Show summary
cd "$PROJECT_DIR"
log_info "Recovery summary:"
log_info "  Worktree: $WORKTREE_PATH"
log_info "  Branch: $CURRENT_BRANCH"
log_info "  Error worktree preserved for debugging"

log_ok "✅ Error recovery complete!"
log_info "Worktree preserved at: $WORKTREE_PATH"
log_info "To retry: opencode --worktree $WORKTREE_PATH"
```

### 5. `tests/test_orchestrator.py`

```python
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
```

### 6. `tests/test_integration.py`

```python
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
        
        # Initialize test git repo
        subprocess.run(["git", "init"], cwd=cls.test_dir, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@test.com"],
            cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"],
            cwd=cls.test_dir, capture_output=True
        )
        
        # Create initial commit
        (Path(cls.test_dir) / "README.md").write_text("# Test Repo")
        subprocess.run(
            ["git", "add", "."], cwd=cls.test_dir, capture_output=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],
            cwd=cls.test_dir, capture_output=True
        )
    
    @classmethod
    def tearDownClass(cls):
        """Dọn dẹp sau test."""
        import shutil
        shutil.rmtree(cls.test_dir, ignore_errors=True)
    
    def test_git_worktree_create(self):
        """Test tạo git worktree."""
        result = subprocess.run(
            [
                "git", "worktree", "add", "-b", "test-branch",
                os.path.join(self.test_dir, "wt_test"), "main"
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
        self.assertIn("wt_test", result.stdout)
    
    def test_git_worktree_commit(self):
        """Test commit trong worktree."""
        wt_path = os.path.join(self.test_dir, "wt_test")
        
        # Tạo file trong worktree
        (Path(wt_path) / "test.txt").write_text("Hello World")
        
        # Commit
        result = subprocess.run(
            ["git", "add", "."], cwd=wt_path, capture_output=True
        )
        self.assertEqual(result.returncode, 0)
        
        result = subprocess.run(
            ["git", "commit", "-m", "Test commit"],
            cwd=wt_path, capture_output=True, text=True
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


if __name__ == "__main__":
    unittest.main()
```

### 7. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-backend-core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Run core tests
        run: |
          python3 tests/test_orchestrator.py

  test-backend-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: |
          cd backend/server
          npm install
      - name: Run server tests
        run: |
          cd backend/server
          npm test || echo "No tests yet"

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint Python
        run: |
          pip install flake8
          flake8 backend/core/ tests/ --max-line-length=100
```

### 8. `scripts/test.sh`

```bash
#!/bin/bash
#
# test.sh - Chạy toàn bộ test suite
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cd "$PROJECT_DIR"

PASS=0
FAIL=0

run_test() {
    local name=$1
    local cmd=$2
    
    echo ""
    log_info "Running: $name"
    log_info "Command: $cmd"
    echo ""
    
    if eval "$cmd"; then
        log_ok "✅ $name passed"
        PASS=$((PASS + 1))
    else
        log_error "❌ $name failed"
        FAIL=$((FAIL + 1))
    fi
    echo ""
}

echo "╔══════════════════════════════════════════════╗"
echo "║       Multi-Agent Manager - Test Suite        ║"
echo "╚══════════════════════════════════════════════╝"

# Python Core tests
run_test "Python Core Unit Tests" "python3 tests/test_orchestrator.py -v"

# Python Integration tests
run_test "Python Integration Tests" "python3 tests/test_integration.py -v"

# Python syntax check all
run_test "Python Syntax Check" "python3 -m py_compile backend/core/orchestrator.py && python3 -m py_compile backend/core/task_parser.py && python3 -m py_compile backend/core/git_worktree_manager.py 2>&1 && python3 -m py_compile backend/core/freebuff_wrapper.py"

# Node.js syntax check
if [ -f "backend/server/server.js" ]; then
    run_test "Node.js Syntax Check" "cd backend/server && node --check server.js && node --check database.js && node --check task_queue.js"
fi

# Script syntax check
run_test "Shell Script Syntax Check" "bash -n scripts/git_merge.sh && bash -n scripts/cleanup.sh && bash -n scripts/error_recovery.sh && bash -n scripts/setup.sh"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              Test Results                     ║"
echo "╠══════════════════════════════════════════════╣"
echo -e "║  ${GREEN}Passed: $PASS${NC}                                ║"
echo -e "║  ${RED}Failed: $FAIL${NC}                                ║"
echo "╚══════════════════════════════════════════════╝"

exit $FAIL
```

### 9. `Makefile`

```makefile
.PHONY: help setup test clean dev-server dev-frontend

help: ## Hiển thị help này
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Thiết lập môi trường phát triển
	@bash scripts/setup.sh

test: ## Chạy tất cả tests
	@bash scripts/test.sh

cleanup: ## Dọn dẹp worktree
	@bash scripts/cleanup.sh

dev-server: ## Chạy backend server (dev mode)
	@cd backend/server && npm run dev

dev-frontend: ## Chạy frontend dashboard (dev mode)
	@cd frontend && npm run dev

install: ## Cài đặt tất cả dependencies
	@cd backend/server && npm install
	@cd frontend && npm install

lint: ## Kiểm tra syntax
	@python3 -m py_compile backend/core/*.py 2>&1 || true
	@cd backend/server && node --check server.js 2>&1 || true

git-worktree-list: ## Liệt kê các worktrees
	@git worktree list
```

### 10. `README.md`

```markdown
# 🤖 Multi-Agent Manager

Hệ thống Phối hợp Đa Tác nhân Phân tầng (Supervisor Pattern) kết hợp Git Worktree.

## 🏗️ Kiến Trúc

```
freebuff (Supervisor) ──JSON Plan──> Orchestrator Core (Python)
                                            │
                               ┌────────────┴────────────┐
                               │                         │
                         Git Worktree              Git Worktree
                               │                         │
                         opencode Dev1             opencode Dev2
                         (Frontend)                (Backend)
```

## 🚀 Quick Start

```bash
# 1. Setup environment
make setup

# 2. Start backend server
make dev-server

# 3. Start frontend (terminal mới)
make dev-frontend

# 4. Mở http://localhost:3000
```

## 📋 Components

| Component | Tech | Port | Description |
|-----------|------|------|-------------|
| Orchestrator Core | Python 3.12 | - | Điều phối freebuff + opencode |
| Backend Server | Node.js/Express | 3001 | REST API + WebSocket + SQLite |
| Frontend Dashboard | Next.js 15 | 3000 | UI quản lý task real-time |
| DevOps Scripts | Bash/Python | - | Git, cleanup, error recovery |

## 📁 Project Structure

```
MultiAgentManager/
├── backend/core/       # Python Orchestrator
├── backend/server/     # Node.js Server
├── frontend/           # Next.js Dashboard
├── scripts/            # DevOps scripts
├── tests/              # Test suites
├── docs/               # Task documents
└── TEAM_STATUS.md      # Team tracking
```

## 📝 Task Documents

- [Task 1: Backend Core](./docs/TASK_1_BACKEND_CORE.md)
- [Task 2: Backend Server](./docs/TASK_2_BACKEND_SERVER.md)
- [Task 3: Frontend Dashboard](./docs/TASK_3_FRONTEND.md)
- [Task 4: DevOps & Integration](./docs/TASK_4_DEVOPS.md)

## 🔄 Workflow

1. User submits request via Dashboard
2. freebuff analyzes and creates JSON plan
3. Orchestrator creates Git Worktrees for each task
4. opencode workers execute tasks in parallel
5. Results merged back to main
6. Worktrees cleaned up automatically
```

---

## 🎯 Yêu Cầu Hoàn Thành

1. ✅ Tạo đủ các file trong `scripts/`
2. ✅ Tạo test files trong `tests/`
3. ✅ Tạo `.github/workflows/ci.yml`
4. ✅ Chạy `bash scripts/test.sh` thành công
5. ✅ Makefile hoạt động (make help, make test)
6. ✅ README.md hoàn chỉnh

---

## 📤 Giao Tiếp Với Các Dev Khác

- **Nhận từ Dev 1**: Gọi scripts khi cần merge/cleanup
- **Nhận từ Dev 2**: Webhook khi task hoàn thành
- **Gửi cho tất cả**: CI pipeline status, test results

---

## 🔗 Phụ Thuộc

- Task này **độc lập** (có thể làm cuối)
- Cần toàn bộ project structure hoàn chỉnh

---

## 📝 Hướng Dẫn Kiểm Thử

```bash
# Chạy tất cả tests
make test

# Kiểm tra syntax
make lint

# Dọn dẹp worktree
make cleanup
```

*Happy coding! 🚀*

---
Working directory: wt_devops
Target areas: scripts/:tests/
