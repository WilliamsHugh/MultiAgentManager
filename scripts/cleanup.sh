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

# Clean up merged branches (only if main branch exists)
if git show-ref --verify refs/heads/main &>/dev/null; then
    for branch in $(git branch --merged main | grep -v "main" | grep -v "^\*" | tr -d ' '); do
        if [ -n "$branch" ] && ($CLEAN_ALL || [[ "$branch" == feature/* ]] || [[ "$branch" == task/* ]]); then
            log_info "Deleting merged branch: $branch"
            git branch -d "$branch" 2>/dev/null || log_warn "Could not delete $branch"
        fi
    done
else
    log_info "No main branch found, skipping branch cleanup"
fi

# Clean up worktrees
for wt_path in $(git worktree list --porcelain | grep "^worktree " | grep -v "^worktree $(pwd)" | sed 's/^worktree //'); do
    cleanup_worktree "$wt_path"
done

# Prune
git worktree prune
log_ok "🧹 Cleanup complete!"
