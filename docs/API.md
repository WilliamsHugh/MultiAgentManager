# Multi-Agent Manager API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All auth endpoints return JWT tokens. Include the token in subsequent requests:
```
Authorization: Bearer <token>
```

### POST /api/auth/register
Create a new user account.

**Auth:** None | **Rate limit:** 5 per 15 min

**Body:**
```json
{ "username": "string (3-30 chars)", "password": "string (6-100 chars)" }
```

**Response (201):**
```json
{ "message": "User created successfully", "user": { "id": "uuid", "username": "string" }, "token": "jwt..." }
```

**Errors:** `409` Username exists, `422` Validation failed

### POST /api/auth/login
Authenticate and receive JWT token.

**Auth:** None | **Rate limit:** 5 per 15 min

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response (200):**
```json
{ "message": "Login successful", "user": { "id": "uuid", "username": "string" }, "token": "jwt..." }
```

**Note:** Uses constant-time password comparison to prevent timing attacks.

### POST /api/auth/logout
Revoke current JWT token.

**Auth:** Required | **Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "message": "Logged out successfully" }
```

### GET /api/auth/me
Get current authenticated user info.

**Auth:** Required

**Response (200):**
```json
{ "user": { "id": "uuid", "username": "string" } }
```

## System

### GET /api/health
Health check endpoint.

**Auth:** None

**Response (200):**
```json
{ "status": "ok", "timestamp": "2026-07-23T...", "uptime": 123.45 }
```

## Projects

### POST /api/projects
Create a new project.

**Auth:** Required | **Rate limit:** 10 per min

**Body:** `{ "name": "string (max 100 chars)" }`

**Response (201):** `{ "id": "uuid", "name": "string", "status": "pending", "created_at": "ISO8601" }`

### GET /api/projects
List all projects.

**Auth:** Optional

**Response (200):** `[{ "id": "uuid", "name": "string", ... }]`

## Tasks

### POST /api/tasks
Create a new task.

**Auth:** Required | **Rate limit:** 10 per min

**Body:**
```json
{
  "projectId": "uuid",
  "name": "string (max 200 chars)",
  "description": "string (max 2000 chars, optional)",
  "assignedWorker": "opencode",
  "worktreePath": "string (optional)",
  "branchName": "string (optional)",
  "prompt": "string (max 10000 chars)",
  "dependencies": ["string"] (optional)
}
```

**Response (201):** Task object

### GET /api/tasks
List all tasks.

**Auth:** Optional | **Query:** `?project_id=uuid&status=pending|running|done|error`

**Response (200):** `[Task]`

### PUT /api/tasks/:id/status
Update task status.

**Auth:** Required

**Body:** `{ "status": "running|done|error", "exit_code": 0 (optional) }`

### DELETE /api/tasks/:id
Delete a task.

**Auth:** Required

**Response (200):** `{ "success": true }`

**Note:** Also cancels the task in the queue and cleans up related logs/worktrees.

## Logs

### GET /api/tasks/:id/logs
Get logs for a specific task.

**Auth:** Optional | **Query:** `?limit=100&offset=0`

**Response (200):** `[{ "id": 1, "task_id": "uuid", "level": "info|error|warn", "message": "...", "timestamp": "ISO8601" }]`

### GET /api/logs/recent
Get recent logs across all tasks.

**Auth:** Optional | **Query:** `?limit=50`

## Queue

### GET /api/queue/stats
Get task queue statistics.

**Auth:** Optional

**Response (200):** `{ "queueLength": 0, "running": 0, "completed": 0, "failed": 0, "total": 0 }`

## Worktrees

### POST /api/worktrees
Create a worktree record.

**Auth:** Required

**Body:** `{ "task_id": "uuid", "path": "string", "branch_name": "string" }`

## Error Responses

All endpoints return errors in this format:
```json
{ "error": "Description", "details": [{ "field": "...", "message": "..." }] }
```

| Status | Meaning |
|--------|---------|
| 400 | Validation failed |
| 401 | Missing/invalid auth |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate username) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
