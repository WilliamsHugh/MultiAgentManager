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
        [ -n "$branch" ] && merge_branch "$branch"
    done
fi

log_ok "🎉 Merge complete!"
