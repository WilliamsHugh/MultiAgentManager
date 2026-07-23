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
    echo ""
    echo "Examples:"
    echo "  $0 wt_frontend"
    echo "  $0 wt_backend feature/backend"
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
    
    # Save changes
    STASH_NAME="auto-stash: error recovery $(date +%Y%m%d_%H%M%S)"
    log_info "Stashing uncommitted changes..."
    git stash save "$STASH_NAME"
    log_ok "Changes stashed as: $STASH_NAME"
fi

# Step 3: Check for merge conflicts
if git diff --cached --quiet 2>/dev/null; then
    log_info "No merge conflicts detected"
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
log_info ""
log_info "📋 Recovery Summary:"
log_info "  Worktree: $WORKTREE_PATH"
log_info "  Branch:   $CURRENT_BRANCH"
log_info "  Status:   Preserved for debugging"
log_info ""
log_info "To retry with opencode:"
log_info "  opencode --worktree $WORKTREE_PATH"
log_info ""

log_ok "✅ Error recovery complete!"
