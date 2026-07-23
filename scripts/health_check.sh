#!/bin/bash
#
# health_check.sh - Kiểm tra toàn bộ hệ thống Multi-Agent Manager
#
# Usage: ./scripts/health_check.sh
#
# Exit codes:
#   0 - Mọi thứ OK
#   1 - Có lỗi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }

FAILED=0

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     Multi-Agent Manager Health Check         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Check Prerequisites ───
echo -e "${CYAN}[1/5] Checking prerequisites...${NC}"

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
echo ""

# ─── 2. Check Project Structure ───
echo -e "${CYAN}[2/5] Checking project structure...${NC}"

check_file() {
    if [ -f "$PROJECT_DIR/$1" ]; then
        log_ok "File exists: $1"
    else
        log_error "Missing file: $1"
        FAILED=1
    fi
}

check_file "backend/core/orchestrator.py"
check_file "backend/core/git_worktree_manager.py"
check_file "backend/core/task_parser.py"
check_file "backend/server/server.js"
check_file "backend/server/database.js"
check_file "backend/server/task_queue.js"
check_file "frontend/app/page.tsx"
check_file "Makefile"
check_file "README.md"
echo ""

# ─── 3. Check Syntax ───
echo -e "${CYAN}[3/5] Checking syntax...${NC}"

if python3 -m py_compile "$PROJECT_DIR/backend/core/orchestrator.py" 2>&1; then
    log_ok "Python core syntax: OK"
else
    log_error "Python core syntax: FAILED"
    FAILED=1
fi

if python3 -m py_compile "$PROJECT_DIR/backend/core/integration_bridge.py" 2>&1; then
    log_ok "Python bridge syntax: OK"
else
    log_error "Python bridge syntax: FAILED"
    FAILED=1
fi

if cd "$PROJECT_DIR/backend/server" && node -e "require('./database'); require('./task_queue'); require('./server');" 2>&1; then
    log_ok "Node.js modules: OK"
else
    log_error "Node.js modules: FAILED"
    FAILED=1
fi
echo ""

# ─── 4. Check Backend Server ───
echo -e "${CYAN}[4/5] Checking backend server...${NC}"

if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:3001/api/health)
    log_ok "Backend server running on port 3001"
    log_info "  Response: $HEALTH"
elif lsof -i :3001 > /dev/null 2>&1; then
    log_warn "Port 3001 is in use but health check failed"
else
    log_warn "Backend server not running on port 3001"
    log_warn "  Start with: cd backend/server && npm run dev"
fi
echo ""

# ─── 5. Check Frontend ───
echo -e "${CYAN}[5/5] Checking frontend...${NC}"

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log_ok "Frontend running on port 3000"
elif lsof -i :3000 > /dev/null 2>&1; then
    log_warn "Port 3000 is in use but frontend check failed"
else
    log_warn "Frontend not running on port 3000"
    log_warn "  Start with: cd frontend && npm run dev"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
if [ $FAILED -eq 0 ]; then
    echo -e "║  ${GREEN}✅ All checks passed!${NC}                  ║"
else
    echo -e "║  ${RED}❌ $FAILED check(s) failed${NC}                ║"
fi
echo "╚══════════════════════════════════════════════╝"
echo ""

exit $FAILED
