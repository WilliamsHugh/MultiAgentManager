# 🚀 MultiAgentManager — Feature Specification

> **Document Type:** Feature Analysis  
> **Phase:** 2 — Design & Analysis  
> **Status:** 📝 Draft  
> **Version:** 1.0  
> **Last Updated:** July 2026  

---

## 1. Executive Summary

MultiAgentManager — **Your Command Center for AI** — là dashboard tập trung cho phép bạn **quản lý, giám sát và phối hợp** nhiều AI agents trong thời gian thực. Bạn đưa ra yêu cầu, hệ thống tự động phân chia công việc cho các agents chuyên biệt — mỗi agent làm việc độc lập trong môi trường riêng, không lo conflict code.

---

## 2. Core Features

### 2.1 Agent Orchestration Engine

| Feature | Mô tả | Priority |
|---------|-------|----------|
| **Multi-Agent Task Decomposition** | Bạn nói ý tưởng — hệ thống tự động chia nhỏ thành từng bước, giao cho agent phù hợp nhất | 🏆 P0 |
| **Parallel Execution** | Nhiều agent cùng làm việc một lúc, không chờ đợi — hoàn thành nhanh hơn | 🏆 P0 |
| **Git Worktree Isolation** | Mỗi agent có không gian làm việc riêng (sandbox), code sạch sẽ, không sợ đụng nhau | 🏆 P0 |
| **Result Merging** | Tự động gộp kết quả từ tất cả agent — không cần merge tay | 🏆 P0 |
| **Error Recovery** | Hệ thống phát hiện lỗi và thử lại tự động — bạn không phải canh chừng | ⭐ P1 |

**Cách hoạt động:**

1. **Bạn gửi yêu cầu** — gõ tự nhiên, không cần cú pháp đặc biệt
2. **AI Project Manager phân tích** — hiểu ý bạn, lập kế hoạch chi tiết
3. **Tạo môi trường riêng** — mỗi agent có workspace cách ly, không lo chồng chéo
4. **Các developers AI thực thi** — chạy song song, bạn theo dõi real-time
5. **Kết quả được hợp nhất** — tự động gộp về, dọn dẹp không gian làm việc

### 2.2 Real-Time Monitoring Dashboard

| Feature | Mô tả | Priority |
|---------|-------|----------|
| **Global Terminal** | Consolidated log stream của tất cả agents | 🏆 P0 |
| **Floating Agent Windows** | Desktop-style windows cho mỗi agent, có thể kéo/thả, đóng/mở | 🏆 P0 |
| **Live Status Badges** | Trạng thái trực quan: **Amber** (`#F59E0B`, pending) → **Iris** (`#6366F1`, running) → **Emerald** (`#10B981`, done) → **Danger** (`#EF4444`, error) — theo brand color palette | 🏆 P0 |
| **Stats Overview** | Total/Running/Done/Error counters | 🏆 P0 |
| **Queue Metrics** | Queue depth, worker utilization, completion rate | ⭐ P1 |
| **Agent Resource Monitor** | RAM/CPU usage per agent process | 🌟 P2 |

**Dashboard Layout:**
```
┌──────────────────────────────────────────────────────┐
│ 🔌 Connected  │  Model: 🤖Auto  │  Queue: 3/4/12    │
├────────────┬─────────────────────────────────────────┤
│   SIDEBAR  │         AGENT CANVAS (Desktop-style)    │
│            │                                         │
│ 📋 Agents  │  ┌─────┐ ┌─────┐ ┌──────────────────┐  │
│  ├─ Dev-1  │  │Agent│ │Agent│ │  Global Terminal │  │
│  ├─ Dev-2  │  │  #1  │ │  #2  │  ┌────────────┐  │  │
│  ├─ Dev-3  │  └─────┘ └─────┘  │  │ log stream │  │  │
│  └─ Dev-4  │          ┌─────┐  │  │ real-time  │  │  │
│            │          │Agent│  │  └────────────┘  │  │
│ 📊 Stats   │          │  #3  │  └──────────────────┘  │
│  ●Total: 4 │          └─────┘                        │
│  ●Run: 2   │                                         │
│  ●Done: 1  │     Input: [______________________] [▶] │
│  ●Err: 0   │                                         │
└────────────┴─────────────────────────────────────────┘
```

### 2.3 Real-Time Communication

Kênh giao tiếp real-time qua **Socket.IO**:

| Event | Direction | Payload | Mục đích |
|-------|-----------|---------|----------|
| `task:created` | Server → Client | `{ id, name, status }` | Task mới |
| `task:started` | Server → Client | `{ id, status: 'running' }` | Bắt đầu chạy |
| `task:log` | Server → Client | `{ taskId, level, message }` | Log từng dòng |
| `log:global` | Server → Client | `{ taskId, level, message }` | Log tổng hợp |
| `task:completed` | Server → Client | `{ id, status: 'done' }` | Hoàn thành |
| `task:failed` | Server → Client | `{ taskId, error }` | Thất bại |
| `task:updated` | Server → Client | Task object | Bất kỳ thay đổi |
| `task:awaiting-manager` | Server → Client | `{ id }` | Chờ AI PM xử lý |

### 2.4 Task Queue & Worker Management

| Feature | Mô tả | Priority |
|---------|-------|----------|
| **Configurable Concurrency** | Max workers (default: 4), auto-scale | 🏆 P0 |
| **Dependency Resolution** | Tự động sắp xếp task theo dependency DAG | 🏆 P0 |
| **Task Cancellation** | Hủy task đang chạy, cleanup resources | 🏆 P0 |
| **Queue Persistence** | SQLite persistence — recover sau crash | ⭐ P1 |
| **Priority Queue** | Task ưu tiên cao được xử lý trước | 🌟 P2 |
| **Scheduled Execution** | Lên lịch chạy task vào thời điểm cụ thể | 🌟 P2 |

### 2.5 AI Model Integration

| Model | Provider | Status | Notes |
|-------|----------|--------|-------|
| **Auto** | Auto-detect | ✅ Active | Recommended — tự động chọn model tốt nhất |
| **GPT-4** | OpenAI | ✅ Active | |
| **GPT-4o** | OpenAI | ✅ Active | |
| **Claude 3.5 Sonnet** | Anthropic | ✅ Active | |
| **DeepSeek V4** | DeepSeek | ✅ Active | |
| **Gemini 2.0** | Google | ✅ Active | |

### 2.6 Security & Authentication

| Feature | Mô tả | Priority |
|---------|-------|----------|
| **JWT Authentication** | Login/register/logout with bcrypt | ✅ Active |
| **Rate Limiting** | API: 100/min, Submit: 10/min, Auth: 5/15min | ✅ Active |
| **CORS Whitelist** | Origin validation | ✅ Active |
| **Input Validation** | express-validator cho tất cả endpoints | ✅ Active |
| **Path Traversal Protection** | Whitelist-based path checking cho file browser | ✅ Active |
| **Timing Attack Protection** | Dummy bcrypt hash cho user không tồn tại | ✅ Active |
| **Role-Based Access Control** | Admin/User roles | 🌟 P2 |

### 2.7 Project File Browser

| Feature | Mô tả | Priority |
|---------|-------|----------|
| **Directory Listing** | Browse filesystem với sorting (dirs first) | 🏆 P0 |
| **Project Selection** | Chọn folder làm project, auto-detect git repo | 🏆 P0 |
| **Tree View** | Hierarchical file tree visualization | 🌟 P2 |
| **File Lock Indicator** | Hiển thị file nào đang bị agent nào chiếm | 🌟 P2 |

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js + React + TypeScript | 15 / 19 / 5 |
| **Backend** | Node.js + Express | 20+ |
| **Real-Time** | Socket.IO | 4.8+ |
| **Database** | SQLite (better-sqlite3) | - |
| **Orchestrator** | Python | 3.12 |
| **Styling** | Tailwind CSS | 4.0 |
| **Auth** | JWT + bcryptjs | - |
| **CI/CD** | GitHub Actions | - |

---

## 4. Agent Lifecycle

```
┌──────────┐
│  PENDING │  ← Task vừa được tạo, chờ manager AI phân tích
└────┬─────┘
     ↓
┌──────────┐
│  QUEUED  │  ← Đã có plan, chờ worker slot (max 4 concurrent)
└────┬─────┘
     ↓
┌──────────┐
│  RUNNING │  ← opencode worker đang thực thi
│          │  ├─ Stream logs real-time
│          │  └─ Có thể cancel bất kỳ lúc nào
└────┬─────┘
     ↓
┌─────┴──────┐
│            │
↓            ↓
┌───────┐  ┌───────┐
│  DONE │  │ ERROR │  ← Kết thúc với exit code
└───────┘  └───────┘
     │         │
     └── Merge vào main + Cleanup worktree
```

---

## 5. Feature Roadmap

### Phase 1 — Foundation ✅
- [x] Python Orchestrator Core
- [x] Express Server + Socket.IO
- [x] Frontend Dashboard (Next.js)
- [x] Git Worktree integration
- [x] Task Queue with parallel execution
- [x] DevOps scripts (setup, cleanup, test, CI/CD)

### Phase 2 — Enhancement 🔄 (Current)
- [ ] **Agent Metrics** — RAM/CPU usage per agent
- [ ] **Dependency Graph** — Visual DAG của task dependencies
- [ ] **Auto-Scaling Workers** — Tự động tăng/giảm workers dựa trên system load
- [ ] **Command Center** — Bulk actions (Run All, Cancel All, Retry Failed)
- [ ] **File Lock Visualization** — Hiển thị file nào đang bị agent nào chiếm
- [ ] **System Health Dashboard** — Health check widgets

### Phase 3 — Advanced 📋 (Planned)
- [ ] **Multi-Project Support** — Quản lý nhiều projects song song
- [ ] **Custom Agent Roles** — User-defined agent behaviors
- [ ] **Agent Templates** — Pre-configured agent profiles
- [ ] **Audit Log** — Full history với search/filter
- [ ] **Webhook Integration** — GitHub/GitLab/Slack webhook triggers
- [ ] **Team Collaboration** — Multiple users, shared workspaces
- [ ] **Onboarding Templates** — Guided setup for new users, progressive disclosure
- [ ] **Docker/Kubernetes** — Containerized deployment

### Phase 4 — Enterprise 🚀 (Future)
- [ ] **SSO / OAuth** — Google, GitHub, GitLab login
- [ ] **On-Premise VPC** — Air-gapped deployment
- [ ] **Usage Analytics** — Team usage, cost tracking
- [ ] **Custom AI Models** — Bring your own LLM
- [ ] **Public REST API** — For external tools & CI/CD integration
- [ ] **SLA Monitoring** — Uptime, latency, error budgets
- [ ] **Jira/Linear Integration** — Issue tracking sync
- [ ] **VS Code Extension** — In-editor agent management
- [ ] **GitHub Copilot API** — Hybrid AI workflow

---

## 6. Brand Alignment

MultiAgentManager features map directly to the **3 Messaging Pillars** defined in the brand kit:

| Pillar | How Features Deliver |
|--------|---------------------|
| **Command Without Complexity** | Single dashboard, natural language input, one-click submit, auto task decomposition, Git Worktree isolation (zero config) |
| **Your Agents, Your Rules** | Floating windows per agent, cancel/retry controls, model selector, project file browser, task queue management |
| **Built for Everyone** | Open-source (MIT), self-hosted, progressive disclosure, multi-model support (Auto/GPT-4/Claude/DeepSeek/Gemini), responsive UI |

All UI components adhere to the design system: **Iris** (`#6366F1`) for primary actions, **Emerald** (`#10B981`) for success states, **Amber** (`#F59E0B`) for warnings, **Inter** font family, and dark mode design tokens.

---

## 7. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Task Completion Rate** | ≥ 95% | completed / total tasks |
| **Average Task Duration** | < 5 min | Sum duration / completed tasks |
| **Concurrent Workers** | 4-8 agents | Max running at peak |
| **System Uptime** | ≥ 99.9% | Health check endpoint |
| **Dashboard Load Time** | < 2s | Next.js build metrics |
| **Log Streaming Latency** | < 500ms | Socket.IO event timing |

---

## 8. Dependencies & Integration Points

| Integration | Type | Status | Notes |
|-------------|------|--------|-------|
| **Freebuff CLI** | External | ✅ Active | AI Project Manager |
| **Opencode CLI** | External | ✅ Active | AI Developer |
| **Git** | System | ✅ Active | Worktree management |
| **Socket.IO** | Library | ✅ Active | Real-time events |
| **REST API** | Internal | ✅ Active | CRUD operations |
| **WebSocket** | Internal | ✅ Active | Log streaming |
| **SQLite** | Database | ✅ Active | Task/log persistence |

---

*This document serves as the feature milestone for MultiAgentManager development. All Phase 2 features must be reviewed and approved before implementation begins.*
