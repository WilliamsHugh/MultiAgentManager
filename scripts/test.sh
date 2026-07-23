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
run_test "Python Core Unit Tests" "python3 tests/test_orchestrator.py -v" 2>/dev/null || {
    log_info "Python test file not found, checking syntax instead..."
    run_test "Python Syntax Check - orchestrator.py" "python3 -m py_compile backend/core/orchestrator.py"
    run_test "Python Syntax Check - task_parser.py" "python3 -m py_compile backend/core/task_parser.py"
    run_test "Python Syntax Check - git_worktree_manager.py" "python3 -m py_compile backend/core/git_worktree_manager.py"
    run_test "Python Syntax Check - freebuff_wrapper.py" "python3 -m py_compile backend/core/freebuff_wrapper.py"
}

# Node.js syntax check
if [ -f "backend/server/server.js" ]; then
    run_test "Node.js Syntax Check - server.js" "cd backend/server && node --check server.js"
    run_test "Node.js Syntax Check - database.js" "cd backend/server && node --check database.js"
    run_test "Node.js Syntax Check - task_queue.js" "cd backend/server && node --check task_queue.js"
fi

# Script syntax check
run_test "Shell Script Syntax - git_merge.sh" "bash -n scripts/git_merge.sh"
run_test "Shell Script Syntax - cleanup.sh" "bash -n scripts/cleanup.sh"
run_test "Shell Script Syntax - error_recovery.sh" "bash -n scripts/error_recovery.sh"
run_test "Shell Script Syntax - setup.sh" "bash -n scripts/setup.sh"
run_test "Shell Script Syntax - test.sh" "bash -n scripts/test.sh"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              Test Results                     ║"
echo "╠══════════════════════════════════════════════╣"
echo -e "║  ${GREEN}Passed: $PASS${NC}                                ║"
echo -e "║  ${RED}Failed: $FAIL${NC}                                ║"
echo "╚══════════════════════════════════════════════╝"

exit $FAIL
