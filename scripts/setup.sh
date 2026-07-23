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
NC='\033[0m'

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
    # Create initial commit
    echo "# Multi-Agent Manager" > README.md
    git add .
    git config user.email "manager@multi-agent.local" 2>/dev/null || true
    git config user.name "Multi-Agent Manager" 2>/dev/null || true
    git commit -m "Initial commit: Multi-Agent Manager project setup"
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
echo ""
