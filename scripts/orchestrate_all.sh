#!/bin/bash
#
# orchestrate_all.sh - Master Orchestrator
# Điều phối 4 opencode employees song song trong Git Worktrees
#
# Usage: bash scripts/orchestrate_all.sh
#
# Warning: Uses --auto flag for opencode (auto-approves permissions)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

log_info()    { echo -e "${CYAN}[PM]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[PM]${NC} ✅ $1"; }
log_warn()    { echo -e "${YELLOW}[PM]${NC} ⚠️  $1"; }
log_error()   { echo -e "${RED}[PM]${NC} ❌ $1"; }
log_step()    { echo -e "${MAGENTA}[PM]${NC} ${BOLD}▶ $1${NC}"; }
log_emp()     { echo -e "${CYAN}[Employee $1]${NC} $2"; }

# ─── Signal Handler ───
declare -a EMP_PIDS=()
declare -a EMP_NAMES=()
CLEANUP_DONE=false

cleanup() {
    if [ "$CLEANUP_DONE" = true ]; then return; fi
    CLEANUP_DONE=true
    echo ""
    log_warn "Received interrupt signal! Cleaning up..."
    
    # Kill any remaining employee processes
    for pid in "${EMP_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Terminating employee PID $pid..."
            kill "$pid" 2>/dev/null || true
        fi
    done
    
    # Remove worktrees
    for wt in wt_core wt_server wt_frontend wt_devops; do
        git worktree remove --force "$wt" 2>/dev/null || true
    done
    
    log_info "Cleanup complete. Exiting."
    exit 1
}

trap cleanup SIGINT SIGTERM

# ─── Bước 0: Kiểm tra prerequisites ───
log_step "Bước 0: Kiểm tra môi trường..."

for cmd in git opencode node python3; do
    if ! command -v "$cmd" &>/dev/null; then
        log_error "Missing: $cmd"
        exit 1
    fi
done
log_ok "Tất cả tools đã sẵn sàng"

# ─── Bước 1: Git Setup ───
log_step "Bước 1: Thiết lập Git repository..."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "none")
if [ "$CURRENT_BRANCH" = "master" ]; then
    log_info "Renaming master -> main..."
    git branch -m master main
elif [ "$CURRENT_BRANCH" = "none" ] || ! git rev-parse HEAD &>/dev/null; then
    log_info "Initializing repository..."
    git checkout -b main
fi

# Configure git if not set
git config user.name "Multi-Agent Manager" 2>/dev/null || true
git config user.email "manager@multi-agent.local" 2>/dev/null || true

# Commit all current files
if git status --porcelain | grep -q .; then
    log_info "Committing project files..."
    # Ensure empty dirs have .gitkeep
    find . -type d -empty -not -path './.git/*' -exec touch {}/.gitkeep \; 2>/dev/null || true
    git add -A
    git commit -m "[Manager] Initial project setup - Multi-Agent Manager" || true
    log_ok "Initial commit created"
else
    log_info "Repository already clean"
fi

# ─── Bước 2: Tạo Git Worktrees cho 4 Employee ───
log_step "Bước 2: Tạo Git Worktrees cho 4 Employees..."

EMPLOYEES=(
    "wt_core:feature/core:Dev1 - Backend Core:docs/TASK_1_BACKEND_CORE.md:backend/core/"
    "wt_server:feature/server:Dev2 - Backend Server:docs/TASK_2_BACKEND_SERVER.md:backend/server/"
    "wt_frontend:feature/frontend:Dev3 - Frontend Dashboard:docs/TASK_3_FRONTEND.md:frontend/"
    "wt_devops:feature/devops:Dev4 - DevOps & Integration:docs/TASK_4_DEVOPS.md:scripts/:tests/"
)

for emp_info in "${EMPLOYEES[@]}"; do
    IFS=':' read -r wt_path branch_name emp_name task_file target_dir <<< "$emp_info"
    
    # Remove existing worktree if present
    if [ -d "$wt_path" ]; then
        git worktree remove --force "$wt_path" 2>/dev/null || true
    fi
    
    # Delete branch if exists
    git branch -D "$branch_name" 2>/dev/null || true
    
    log_info "Creating worktree for ${emp_name}..."
    git worktree add -b "$branch_name" "$wt_path" main 2>&1 | tail -1
    log_ok "Worktree created: ${wt_path} (branch: ${branch_name})"
done

log_ok "✅ All 4 Worktrees ready!"

# ─── Bước 3: Chạy 4 Opencode Employees Song Song ───
log_step "Bước 3: Khởi chạy 4 opencode employees song song..."
echo ""

run_employee() {
    local wt_path=$1
    local branch_name=$2
    local emp_name=$3
    local task_file=$4
    local target_dir=$5
    
    {
        # Create TASK.md in worktree from task document
        if [ -f "$PROJECT_DIR/$task_file" ]; then
            cp "$PROJECT_DIR/$task_file" "$PROJECT_DIR/$wt_path/TASK.md"
            echo "" >> "$PROJECT_DIR/$wt_path/TASK.md"
            echo "---" >> "$PROJECT_DIR/$wt_path/TASK.md"
            echo "Working directory: $(basename $wt_path)" >> "$PROJECT_DIR/$wt_path/TASK.md"
            echo "Target areas: ${target_dir:-all}" >> "$PROJECT_DIR/$wt_path/TASK.md"
        else
            echo "# ${emp_name}" > "$PROJECT_DIR/$wt_path/TASK.md"
            echo "" >> "$PROJECT_DIR/$wt_path/TASK.md"
            echo "Implement the assigned components." >> "$PROJECT_DIR/$wt_path/TASK.md"
            echo "Target: ${target_dir:-all}" >> "$PROJECT_DIR/$wt_path/TASK.md"
        fi
        
        echo "[Employee ${emp_name}] Starting..."
        
        # Run opencode with the task file
        cd "$PROJECT_DIR/$wt_path"
        timeout 600 opencode run "You are ${emp_name}. 
Your task is documented in TASK.md.
Read it carefully and implement ALL requirements in the working directory.
Focus on ${target_dir} if specified.
After completing all work, commit with: git add -A && git commit -m '[${emp_name}] Complete implementation'" \
            --auto \
            --dir "$PROJECT_DIR/$wt_path" \
            --print-logs 2>&1 || true
        
        # Auto-commit sau khi hoàn thành
        cd "$PROJECT_DIR/$wt_path"
        if git status --porcelain | grep -q .; then
            git add -A
            git commit -m "[${emp_name}] Implementation complete" 2>/dev/null || true
        fi
        
        echo "[Employee ${emp_name}] ✅ Completed"
    } &
    
    local pid=$!
    EMP_PIDS+=("$pid")
    EMP_NAMES+=("$emp_name")
    log_emp "$emp_name" "🚀 Started (PID: $pid, Worktree: $wt_path)"
}

# Launch all 4 employees in parallel
for emp_info in "${EMPLOYEES[@]}"; do
    IFS=':' read -r wt_path branch_name emp_name task_file target_dir <<< "$emp_info"
    run_employee "$wt_path" "$branch_name" "$emp_name" "$task_file" "$target_dir"
    sleep 1  # Small stagger to avoid output interleaving
done

# ─── Bước 4: Monitor Progress ───
log_step "Bước 4: Theo dõi tiến độ..."
echo ""

START_TIME=$(date +%s)

while true; do
    ACTIVE_COUNT=0
    for pid in "${EMP_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            ACTIVE_COUNT=$((ACTIVE_COUNT + 1))
        fi
    done
    
    ELAPSED=$(( $(date +%s) - START_TIME ))
    COMPLETED=$(( ${#EMP_PIDS[@]} - ACTIVE_COUNT ))
    
    echo -ne "\r${CYAN}[PM]${NC} ⏱️  ${ELAPSED}s | ✅ ${COMPLETED}/${#EMP_PIDS[@]} done | ⚡ ${ACTIVE_COUNT} running..."
    
    if [ "$ACTIVE_COUNT" -eq 0 ]; then
        break
    fi
    
    sleep 5
done

echo ""
echo ""
log_ok "All employees completed! (⏱️ ${ELAPSED}s)"

# Properly reap background processes
wait

# ─── Bước 5: Merge & Cleanup ───
log_step "Bước 5: Merge results to main and cleanup..."
echo ""

git checkout main 2>/dev/null || git checkout -b main
git pull --ff-only 2>/dev/null || true

SUCCESS_COUNT=0
FAIL_COUNT=0

for emp_info in "${EMPLOYEES[@]}"; do
    IFS=':' read -r wt_path branch_name emp_name task_file target_dir <<< "$emp_info"
    
    # Check if branch has commits
    BRANCH_COMMITS=$(git rev-list --count "$branch_name" 2>/dev/null || echo "0")
    if [ "$BRANCH_COMMITS" = "0" ] || [ "$BRANCH_COMMITS" = "" ]; then
        log_warn "No changes from ${emp_name}, skipping merge"
        continue
    fi
    
    log_info "Merging ${branch_name} -> main..."
    if git merge "$branch_name" --no-edit 2>/dev/null; then
        log_ok "✅ Merged: ${emp_name} (${branch_name})"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        log_warn "Merge conflict in ${branch_name}, skip and preserve branch..."
        git merge --abort 2>/dev/null || true
        log_info "Branch ${branch_name} preserved for manual merge"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

log_ok "🎉 Merge complete: ${SUCCESS_COUNT} merged, ${FAIL_COUNT} preserved"

# Cleanup worktrees
for emp_info in "${EMPLOYEES[@]}"; do
    IFS=':' read -r wt_path branch_name emp_name task_file target_dir <<< "$emp_info"
    log_info "Cleaning worktree: ${wt_path}..."
    git worktree remove --force "$wt_path" 2>/dev/null || true
done

git worktree prune 2>/dev/null || true
log_ok "🧹 Cleanup complete!"

# ─── Summary ───
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     Multi-Agent Orchestration Complete!      ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Employees : ${#EMP_PIDS[@]} executed in parallel           ║"
echo "║  Time      : ${ELAPSED}s                          ║"
echo "║  Merged    : ${SUCCESS_COUNT} branches merged to main        ║"
echo "║  Preserved : ${FAIL_COUNT} branches left for manual merge    ║"
echo "╚══════════════════════════════════════════════╝"
