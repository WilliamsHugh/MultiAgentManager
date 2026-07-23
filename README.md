# 🤖 Multi-Agent Manager

Hệ thống Phối hợp Đa Tác nhân Phân tầng (Supervisor Pattern) kết hợp Git Worktree.

## 🏗️ Kiến Trúc

```
freebuff (Supervisor) ──JSON Plan──> Orchestrator Core (Python)
                                            │
                               ┌────────────┴────────────┐
                               │                         │
                         Git Worktree              Git Worktree
                               │                         │
                         opencode Dev1             opencode Dev2
                         (Frontend)                (Backend)
```

## 🚀 Quick Start

```bash
# 1. Setup environment
make setup

# 2. Start backend server
make dev-server

# 3. Start frontend (terminal mới)
make dev-frontend

# 4. Mở http://localhost:3000
```

## 📋 Components

| Component | Tech | Port | Description |
|-----------|------|------|-------------|
| Orchestrator Core | Python 3.12 | CLI | Điều phối freebuff + opencode |
| Backend Server | Node.js/Express | 3001 | REST API + WebSocket + SQLite |
| Frontend Dashboard | Next.js 15 | 3000 | UI quản lý task real-time |
| DevOps Scripts | Bash/Python | - | Git, cleanup, error recovery |

## 📁 Project Structure

```
MultiAgentManager/
├── backend/
│   ├── core/              # Python Orchestrator
│   │   ├── orchestrator.py
│   │   ├── git_worktree_manager.py
│   │   ├── freebuff_wrapper.py
│   │   └── task_parser.py
│   └── server/            # Node.js Server
│       ├── server.js
│       ├── database.js
│       └── task_queue.js
├── frontend/              # Next.js Dashboard
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── lib/
│       ├── socket.ts
│       └── api.ts
├── scripts/               # DevOps scripts
│   ├── setup.sh
│   ├── git_merge.sh
│   ├── cleanup.sh
│   ├── error_recovery.sh
│   └── test.sh
├── tests/                 # Test suites
│   ├── test_orchestrator.py
│   └── test_integration.py
├── docs/                  # Task documents
│   ├── TASK_1_BACKEND_CORE.md
│   ├── TASK_2_BACKEND_SERVER.md
│   ├── TASK_3_FRONTEND.md
│   └── TASK_4_DEVOPS.md
├── TEAM_STATUS.md         # Team tracking
├── Makefile
└── README.md
```

## 🔄 Workflow

1. **User** submits request via Dashboard
2. **freebuff** (Supervisor) analyzes and creates JSON plan
3. **Orchestrator** creates Git Worktrees for each task
4. **opencode workers** execute tasks in parallel
5. **Results** merged back to main branch
6. **Worktrees** cleaned up automatically

## 🧪 Testing

```bash
# Run all tests
make test

# Or directly
bash scripts/test.sh
```

## 📝 Task Documents

- [Task 1: Backend Core](./docs/TASK_1_BACKEND_CORE.md) - Python Orchestrator
- [Task 2: Backend Server](./docs/TASK_2_BACKEND_SERVER.md) - Node.js Server
- [Task 3: Frontend Dashboard](./docs/TASK_3_FRONTEND.md) - Next.js UI
- [Task 4: DevOps & Integration](./docs/TASK_4_DEVOPS.md) - Scripts & Tests
