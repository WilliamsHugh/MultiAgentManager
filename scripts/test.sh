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
run_test "Python Syntax Check" "python3 -m py_compile backend/core/orchestrator.py && python3 -m py_compile backend/core/task_parser.py && python3 -m py_compile backend/core/git_worktree_manager.py && python3 -m py_compile backend/core/freebuff_wrapper.py"

# Node.js syntax check
if [ -f "backend/server/server.js" ]; then
    run_test "Node.js Syntax Check" "(cd backend/server && node --check server.js && node --check database.js && node --check task_queue.js)"
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
