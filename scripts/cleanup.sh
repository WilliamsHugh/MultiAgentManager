#!/bin/bash
#
# cleanup.sh - Dọn dẹp worktree và branch tạm thời
#
# Usage: ./scripts/cleanup.sh [--force] [--all] [--yes]
#   --force  Force remove worktrees with uncommitted changes
#   --all    Remove ALL merged branches (not just feature/* and task/*)
#   --yes    Skip confirmation prompt
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
SKIP_CONFIRM=false

for arg in "$@"; do
    case $arg in
        --force) FORCE=true ;;
        --all) CLEAN_ALL=true ;;
        --yes) SKIP_CONFIRM=true ;;
    esac
done

# Safety check: không bao giờ xóa main/master
SAFE_BRANCHES='^(\.|main|master|HEAD)$'

confirm() {
    if $SKIP_CONFIRM; then
        return 0
    fi
    echo -n "${YELLOW}Are you sure you want to proceed? [y/N] ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

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
    MERGED_BRANCHES=$(git branch --merged main | grep -v "main" | grep -v "\*" | tr -d ' ' || true)
    
    if [ -z "$MERGED_BRANCHES" ]; then
        log_info "No merged branches to clean up"
    else
        echo -e "${YELLOW}The following branches are merged and can be deleted:${NC}"
        echo "$MERGED_BRANCHES" | while read -r branch; do
            echo "  - $branch"
        done
        echo ""
        
        if confirm; then
            for branch in $MERGED_BRANCHES; do
                if [ -n "$branch" ] && ! echo "$branch" | grep -qE "$SAFE_BRANCHES"; then
                    if $CLEAN_ALL || [[ "$branch" == feature/* ]] || [[ "$branch" == task/* ]] || [[ "$branch" == phase/* ]]; then
                        log_info "Deleting merged branch: $branch"
                        git branch -d "$branch" 2>/dev/null || log_warn "Could not delete $branch"
                    fi
                fi
            done
        else
            log_info "Branch cleanup skipped"
        fi
    fi
else
    log_info "No main branch found, skipping branch cleanup"
fi

# Clean up worktrees (excluding current)
WT_COUNT=$(git worktree list --porcelain | grep "^worktree " | grep -v "^worktree $(pwd)" | wc -l)
if [ "$WT_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}Found $WT_COUNT worktree(s) to clean up${NC}"
    if confirm; then
        for wt_path in $(git worktree list --porcelain | grep "^worktree " | grep -v "^worktree $(pwd)" | sed 's/^worktree //'); do
            cleanup_worktree "$wt_path"
        done
    else
        log_info "Worktree cleanup skipped"
    fi
else
    log_info "No worktrees to clean up"
fi

# Prune
git worktree prune
log_ok "🧹 Cleanup complete!"
