# 🔄 Phase 2.3: CI/CD Pipeline & DevOps

**Worktree:** `wt_cicd`
**Branch:** `phase/2.3-cicd`
**Target dirs:** `.github/`, `scripts/`
**Based on commit:** `05cb0ad` (Phase 2.1)

---

## 🎯 Mục Tiêu

Sửa CI/CD pipeline, tạo health check script, tích hợp error recovery.

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: Fix CI Pipeline

**File:** `.github/workflows/ci.yml`

**Rules:**
- Thay thế dòng `npm test || echo "No tests yet"` bằng `npm test` thực tế
- Thêm job test-frontend (build Next.js)
- Thêm integration test job chạy Python + Node.js cùng lúc

**Cấu trúc CI mới:**

```yaml
name: CI

on:
  push:
    branches: [main, 'phase/**']
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
          python-version: '3.12'
      - name: Run core tests
        run: |
          python3 tests/test_orchestrator.py
          python3 tests/test_integration.py

  test-backend-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd backend/server && npm ci
      - name: Run server tests
        run: cd backend/server && npm test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Build frontend
        run: cd frontend && npm run build

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint Python
        run: |
          pip install flake8
          flake8 backend/core/ tests/ --max-line-length=100
      - name: Lint Shell
        run: |
          sudo apt-get install -y shellcheck
          shellcheck scripts/*.sh

  integration:
    needs: [test-backend-core, test-backend-server, test-frontend, lint]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python + Node.js
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
        - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install all deps
        run: |
          cd backend/server && npm ci
          cd ../../frontend && npm ci
      - name: Start server & test
        run: |
          cd backend/server && node server.js &
          sleep 2
          curl -f http://localhost:3001/api/health
          kill %1
```

### Task 2: Create Health Check Script

**File:** `scripts/health_check.sh`

**Rules:**
- Script kiểm tra toàn bộ hệ thống
- Kiểm tra: Node.js, npm, Python, Git, port 3000, port 3001
- Exit code 0 nếu tất cả OK, 1 nếu có lỗi

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

FAILED=0

# Check prerequisites
check_cmd() {
    if command -v "$1" &>/dev/null; then
        log_ok "$1: $($1 --version 2>&1 | head -1)"
    else
        log_error "$1 is not installed"
        FAILED=1
    fi
}

check_cmd node
check_cmd npm
check_cmd python3
check_cmd git

# Check backend server
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    log_ok "Backend server running on port 3001"
else
    log_warn "Backend server not running on port 3001"
    log_warn "  Start with: cd backend/server && npm run dev"
fi

# Check frontend
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log_ok "Frontend running on port 3000"
else
    log_warn "Frontend not running on port 3000"
    log_warn "  Start with: cd frontend && npm run dev"
fi

# Check test suite
echo ""
echo "--- Running health tests ---"
cd "$PROJECT_DIR"

if python3 -m py_compile backend/core/*.py 2>&1; then
    log_ok "Python syntax: OK"
else
    log_error "Python syntax: FAILED"
    FAILED=1
fi

exit $FAILED
```

### Task 3: Integrate Error Recovery

**Files:** `scripts/error_recovery.sh`, `backend/core/orchestrator.py`

**Rules:**
- Thêm hook trong `orchestrator.py` để gọi `error_recovery.sh` khi task bị lỗi
- Trong `orchestrator.py`, method `_execute_single_task`: khi `task.status = "error"`, gọi script

**Changes in orchestrator.py:**
```python
import subprocess

# Trong method _execute_single_task, thêm vào catch block:
if task.status == "error":
    recovery_script = str(self.repo_path / "scripts" / "error_recovery.sh")
    subprocess.Popen(
        [recovery_script, task.worktree_path, task.branch_name],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
```

### Task 4: Fix Cleanup Script Safety

**File:** `scripts/cleanup.sh`

**Rules:**
- Thêm confirmation prompt trước khi xóa branch
- Thêm `--yes` flag để skip confirmation
- Chỉ xóa branch đã merged vào main
- Thêm safety check không xóa main/master branch

---

## 🧪 Kiểm Tra

```bash
cd /home/hughwilliams/projects/MultiAgentManager
bash scripts/test.sh
bash scripts/health_check.sh
```

All tests must pass.

## 🔗 Phụ Thuộc

- Độc lập với các worktree khác
- Chỉ sửa files trong `.github/`, `scripts/`, `backend/core/orchestrator.py`
