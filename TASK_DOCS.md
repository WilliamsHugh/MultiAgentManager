# 📚 Phase 3.2: Documentation & API Docs

**Worktree:** `wt_docs`
**Branch:** `phase/3.2-docs`
**Target dirs:** `docs/`, `README.md`
**Based on commit:** `3c3c320` (main)

---

## 🎯 Mục Tiêu

Cập nhật documentation cho toàn bộ dự án sau Phase 2.1-2.3 và thêm API documentation mới.

## 📋 Nhiệm Vụ Chi Tiết

### Task 1: Cập nhật README.md

**File:** `README.md`

**Rules:**
- Thêm badges cho test status
- Cập nhật project structure với các file mới
- Thêm API documentation section
- Thêm authentication section
- Cập nhật quick start guide

### Task 2: Tạo API.md

**File mới:** `docs/API.md`

**Rules:**
- Document tất cả REST API endpoints
- Format: markdown table với method, path, auth required, description, request body, response

```markdown
# API Documentation

## Authentication

### POST /api/auth/register
Create a new user account.

- **Auth:** None
- **Body:** `{ "username": "string", "password": "string" }`
- **Response:** `{ "message": "...", "user": {...}, "token": "jwt..." }`

### POST /api/auth/login
Login and receive JWT token.

- **Auth:** None
- **Body:** `{ "username": "string", "password": "string" }`
- **Response:** `{ "message": "...", "user": {...}, "token": "jwt..." }`

### POST /api/auth/logout
Revoke current JWT token.

- **Auth:** Required
- **Response:** `{ "message": "Logged out successfully" }`

### GET /api/auth/me
Get current user info.

- **Auth:** Required
- **Response:** `{ "user": { "id": "uuid", "username": "string" } }`

## System

### GET /api/health
Health check endpoint.

- **Auth:** None
- **Response:** `{ "status": "ok", "timestamp": "ISO8601", "uptime": 123 }`

## Projects

### POST /api/projects
Create a new project.

- **Auth:** Required
- **Body:** `{ "name": "string" }`
- **Response:** `{ "id": "uuid", "name": "string" }`

### GET /api/projects
List all projects.

- **Auth:** Optional
- **Response:** `[ { "id": "uuid", "name": "string", ... } ]`

## Tasks

### POST /api/tasks
Create a new task.

- **Auth:** Required
- **Body:** `{ "projectId": "uuid", "name": "string", "description": "string", "prompt": "string", ... }`
- **Response:** `{ "id": "uuid", "status": "pending", ... }`

### GET /api/tasks
List all tasks (filter by project_id or status).

- **Auth:** Optional
- **Query:** `?project_id=uuid&status=pending|running|done|error`
- **Response:** `[ { "id": "uuid", ... } ]`

## Logs

### GET /api/tasks/:id/logs
Get logs for a specific task.

- **Auth:** Optional
- **Query:** `?limit=100&offset=0`
- **Response:** `[ { "id": 1, "level": "info", "message": "...", ... } ]`

## Queue

### GET /api/queue/stats
Get task queue statistics.

- **Auth:** Optional
- **Response:** `{ "queueLength": 0, "running": 0, "completed": 0, ... }`
```

### Task 3: Cập nhật docs/CHANGELOG.md

**File mới:** `docs/CHANGELOG.md`

**Rules:**
- Ghi lại tất cả các thay đổi từ Phase 1 đến Phase 2.3
- Format theo Keep a Changelog

```markdown
# Changelog

## [Phase 2.3] - 2026-07-23
### Added
- ErrorBoundary component (error.tsx)
- Loading skeleton states with animate-pulse
- Health check script (scripts/health_check.sh)
- Error recovery integration in orchestrator.py
- CORS origin whitelist

### Changed
- CI pipeline: 5 jobs with real tests
- Cleanup script: confirmation prompt + safety checks
- Removed unused lucide-react dependency
- Improved frontend error handling (Connection Error UI)

### Fixed
- Race condition in task queue (cancelTask + guards)
- DEP0190 shell:true deprecation warning
- DELETE endpoint now actually removes from DB
```

### Task 4: Cập nhật Makefile

**File:** `Makefile`

**Rules:**
- Thêm `make health` target chạy health_check.sh
- Thêm `make docs` target

```makefile
health: ## Kiểm tra sức khỏe hệ thống
	@bash scripts/health_check.sh

docs: ## Mở API documentation
	@cat docs/API.md | less
```

---

## 🧪 Kiểm Tra

```bash
cd /home/hughwilliams/projects/MultiAgentManager
make health
make test
```

---

## 🔗 Phụ Thuộc

- Độc lập - có thể làm song song với Agent B3 và C3
- Nên đợi Agent B3 và C3 hoàn thành để cập nhật API docs chính xác
