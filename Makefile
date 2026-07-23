.PHONY: help setup test clean dev-server dev-frontend install lint

help: ## Hiển thị help này
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | sort | \
	awk 'BEGIN {FS = ":.*## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Thiết lập môi trường phát triển
	@bash scripts/setup.sh

test: ## Chạy tất cả tests
	@bash scripts/test.sh

cleanup: ## Dọn dẹp worktree
	@bash scripts/cleanup.sh

dev-server: ## Chạy backend server (dev mode)
	@cd backend/server && npm run dev

dev-frontend: ## Chạy frontend dashboard (dev mode)
	@cd frontend && npm run dev

install: ## Cài đặt tất cả dependencies
	@cd backend/server && npm install
	@cd frontend && npm install

lint: ## Kiểm tra syntax
	@python3 -m py_compile backend/core/*.py 2>&1 || true
	@cd backend/server && node --check server.js 2>&1 || true

git-worktree-list: ## Liệt kê các worktrees
	@git worktree list

status: ## Hiển thị trạng thái dự án
	@echo "=== Git Status ===" && git status --short; echo "" && echo "=== Worktrees ===" && git worktree list 2>/dev/null || echo "No worktrees"; echo "" && echo "=== Project Structure ===" && find . -maxdepth 3 -not -path './node_modules/*' -not -path './.git/*' -not -path './frontend/node_modules/*' -not -path './backend/server/node_modules/*' 2>/dev/null | sort
