# 🧩 MultiAgentManager — Solution Architecture

> **Document Type:** Solution Analysis  
> **Phase:** 2 — Design & Analysis  
> **Status:** 📝 Draft  
> **Version:** 1.0  
> **Last Updated:** July 2026  

---

## 1. Problem Statement

### 1.1 The Challenge

Bạn và team của bạn ngày nay phải đối mặt với **3 vấn đề lớn** khi sử dụng AI agents:

| Problem | Mô tả | Hệ quả |
|---------|-------|--------|
| **🔄 Tool Fragmentation** | Phải chuyển đổi giữa nhiều công cụ AI khác nhau, mỗi công cụ một giao diện | Mất context, giảm productivity |
| **🧠 Cognitive Overload** | Phải tự quản lý task dependencies, code conflicts, agent coordination | Mental fatigue, errors |
| **🔒 No Unified Control** | Không có centralized dashboard để giám sát và điều khiển tất cả agents | Mất visibility, khó debug |

### 1.2 Current Solutions Gap

```
                    Có Dashboard?    Multi-Agent?    Self-Hosted?    Code Isolation?
GitHub Copilot          ✅              ❌              ❌              ❌
Cursor                  ✅              ❌              ❌              ❌
AutoGPT                 ❌              ✅              ✅              ❌
LangChain               ❌              ✅              ✅              ❌
Replit                  ✅              ❌              ❌              ❌
MultiAgentManager       ✅              ✅              ✅              ✅ (Git Worktree)
```

> **Khoảng trống thị trường:** Không có giải pháp nào kết hợp được **dashboard real-time** + **multi-agent orchestration** + **self-hosted** + **code isolation** trong một sản phẩm duy nhất.

---

## 2. The Solution: MultiAgentManager

### 2.1 Value Proposition

> **"Your Command Center for AI"**

MultiAgentManager là **layer điều hành tập trung** giúp người dùng quản lý, phối hợp và tối ưu hóa công việc với nhiều AI agents thông qua một giao diện thống nhất.

### 2.2 Three Pillars (from Brand Kit)

| Pillar | Core Message | How We Deliver |
|--------|-------------|----------------|
| **Command Without Complexity** | Complexity belongs to the system, not to you | Single dashboard, natural language input, one-click workflows |
| **Your Agents, Your Rules** | Delegate with confidence | Customizable agent behaviors, audit logs, override capabilities |
| **Built for Everyone** | Low floor, high ceiling | No prerequisites, progressive disclosure, open-source community |

### 2.3 Key Differentiators

| Điểm khác biệt | MultiAgentManager | Đối thủ |
|----------------|-------------------|---------|
| **Git Worktree Isolation** | ✅ Mỗi agent có branch riêng, zero code conflict | ❌ Agents share same workspace |
| **Real-Time Dashboard** | ✅ Desktop-style floating windows, global terminal, stats | ❌ CLI-only hoặc basic UI |
| **Supervisor Pattern** | ✅ freebuff (AI PM) tự động phân rã task | ❌ User phải tự chia task |
| **Self-Hosted** | ✅ MIT License, full source code | ❌ Vendor lock-in (Copilot, Cursor) |
| **Multi-Model** | ✅ GPT-4, Claude, DeepSeek, Gemini + auto-detect | ❌ Single model provider |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     USER INTERFACE                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Next.js Dashboard (Port 3000)             │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────────┐ │ │
│  │  │ Sidebar │ │ Floating │ │   Global Terminal    │ │ │
│  │  │  Task   │ │ Windows  │ │   (Log Stream)       │ │ │
│  │  │  List   │ │ Per Agent│ │                      │ │ │
│  │  └─────────┘ └──────────┘ └──────────────────────┘ │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │ Socket.IO + REST API               │
├──────────────────────┼──────────────────────────────────┤
│                      ▼                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Backend Server (Port 3001)                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │ │
│  │  │ Express  │ │Socket.IO │ │     Task Queue       │ │ │
│  │  │ REST API │ │Real-Time │ │  (max 4 concurrent)  │ │ │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │ │
│  │  ┌──────────┐ ┌───────────────────────────────────┐ │ │
│  │  │  Auth    │ │         SQLite Database           │ │ │
│  │  │ (JWT)    │ │  (projects, tasks, logs, users)   │ │ │
│  │  └──────────┘ └───────────────────────────────────┘ │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │                                    │
├──────────────────────┼──────────────────────────────────┤
│                      ▼                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          Python Orchestrator Core                     │ │
│  │                                                      │ │
│  │  1. Freebuff Wrapper (AI Planning)                    │ │
│  │     └─ Gọi freebuff CLI → JSON Plan                  │ │
│  │                                                      │ │
│  │  2. Git Worktree Manager                             │ │
│  │     └─ Tạo branch riêng cho mỗi agent               │ │
│  │                                                      │ │
│  │  3. Task Executor                                    │ │
│  │     └─ Phân phối task → opencode workers            │ │
│  │                                                      │ │
│  │  4. Integration Bridge (Python ↔ Node.js)            │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
Step 1: Submit
┌──────┐     Socket.IO      ┌──────────┐
│ User │ ──────────────────▶│  Server  │
└──────┘   "task:submit"    └────┬─────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Create Project + Task   │
                    │  Save to SQLite          │
                    │  Add to TaskQueue        │
                    └────────────┬────────────┘
                                 │
Step 2: Orchestrate              ▼
                    ┌─────────────────────────┐
                    │  Python Orchestrator     │
                    │  ├─ freebuff: analyze    │
                    │  ├─ Create worktrees    │
                    │  └─ Execute tasks       │
                    └────────────┬────────────┘
                                 │
Step 3: Monitor       Socket.IO events
                    ┌────────────▼────────────┐
                    │  Real-Time Dashboard     │
                    │  ├─ task:started         │
                    │  ├─ task:log (stream)   │
                    │  ├─ task:completed       │
                    │  └─ task:failed          │
                    └─────────────────────────┘
                                 │
Step 4: Complete                  ▼
                    ┌─────────────────────────┐
                    │  Merge to main branch    │
                    │  Cleanup worktrees       │
                    │  Notify user             │
                    └─────────────────────────┘
```

### 3.3 Module Breakdown

| Module | Tech | Chức năng | Files |
|--------|------|-----------|-------|
| **Orchestrator Core** | Python 3.12 | Điều phối freebuff + opencode + Git Worktree | `backend/core/*.py` |
| **Backend Server** | Node.js/Express | REST API + WebSocket + SQLite + Task Queue | `backend/server/*.js` |
| **Frontend Dashboard** | Next.js 15 | UI quản lý task real-time | `frontend/app/*.tsx` |
| **Integration Bridge** | Python | Kết nối Python ↔ Node.js | `backend/core/integration_bridge.py` |
| **DevOps Scripts** | Bash/Python | Git, cleanup, error recovery | `scripts/*.sh` |
| **CI/CD** | GitHub Actions | Build, test, lint, integration | `.github/workflows/ci.yml` |

---

## 4. Use Cases

### 4.1 Solo Developer: Automate Repetitive Tasks

> *"Tôi mệt mỏi với việc viết unit tests, chỉnh sửa CSS, và fix lint errors mỗi ngày."*

**Solution:**
1. Mở dashboard, chọn project folder
2. Nhập: *"Add unit tests for all API routes, fix lint warnings, and update Button component to use brand colors"*
3. MultiAgentManager tự động:
   - freebuff phân tích → 3 tasks
   - opencode-1: viết API tests
   - opencode-2: fix lint warnings
   - opencode-3: update Button component
4. Dashboard hiển thị 3 floating windows với log real-time
5. Kết quả được merge vào main, worktrees cleanup

**Saves:** ~2-3 hours manual work

### 4.2 Small Team: Parallel Feature Development

> *"Team 5 người, cần ship 3 features cùng lúc nhưng không muốn conflict code."*

**Solution:**
1. Nhập mô tả 3 features
2. MultiAgentManager tạo 3 worktrees riêng biệt
3. 3 opencode agents chạy song song
4. Mỗi agent có:
   - Worktree riêng (git branch độc lập)
   - Floating window riêng (log + status)
   - Tự động commit khi hoàn thành
5. Team review kết quả → merge từng branch

**Benefit:** Zero code conflict, real-time progress tracking

### 4.3 CI/CD Pipeline: Automated Code Review

> *"Mỗi pull request cần được review code, chạy tests, và kiểm tra security."*

**Solution:**
1. GitHub webhook → MultiAgentManager
2. Tự động tạo agents:
   - Agent 1: Code review (lint, best practices)
   - Agent 2: Security scan (dependencies, OWASP)
   - Agent 3: Performance audit
3. Kết quả post back lên PR comment
4. Dashboard log cho full transparency

**Integration:** REST API + Webhook

### 4.4 Enterprise: Compliance & Audit

> *"Cần đảm bảo mọi AI-generated code đều được audit và tuân thủ quy định."*

**Solution:**
1. Self-hosted deployment (in-house VPC)
2. All agent actions logged:
   - Which agent changed what file?
   - What prompt was used?
   - What was the result?
3. Full audit log với search/filter
4. Option to approve/reject before merge

**Benefit:** Full compliance, no data leaves premises

---

## 5. Integration Capabilities

### 5.1 Current Integrations

| Integration | Type | Details |
|-------------|------|---------|
| **Git** | System | Worktree create/remove/merge/commit |
| **GitHub** | CI/CD | GitHub Actions workflow |
| **Slack** | Notification | Via webhook (Team tier) |
| **Discord** | Community | Open-source community support |

### 5.2 Planned Integrations

| Integration | Priority | Timeline |
|-------------|----------|----------|
| **GitHub/GitLab Webhook** | ⭐ P1 | Phase 3 |
| **Docker/Kubernetes** | ⭐ P1 | Phase 3 (FEATURE.md: Advanced) |
| **Slack Bot** | 🌟 P2 | Phase 3 |
| **Jira/Linear** | 🌟 P2 | Phase 4 (FEATURE.md: Enterprise) |
| **VS Code Extension** | 🌟 P2 | Phase 4 (FEATURE.md: Enterprise) |
| **GitHub Copilot API** | 🔮 P3 | Phase 4 (FEATURE.md: Enterprise) |

---

## 6. Comparison with Alternatives

| Tiêu chí | MultiAgentManager | GitHub Copilot | AutoGPT | LangChain | Replit |
|----------|-------------------|----------------|---------|-----------|--------|
| **Multi-Agent** | ✅ Có sẵn | ❌ | ✅ Cơ bản | ✅ Framework | ❌ |
| **Dashboard UI** | ✅ Desktop-style | ❌ CLI | ❌ CLI | ❌ CLI | ✅ IDE |
| **Self-Hosted** | ✅ MIT License | ❌ | ✅ | ✅ | ❌ |
| **Code Isolation** | ✅ Git Worktree | ❌ | ❌ | ❌ | ✅ Repl |
| **AI Model Choice** | ✅ Multi-model | ❌ Codex only | ✅ GPT only | ✅ Multi | ❌ Limited |
| **Real-Time Logs** | ✅ WebSocket | ❌ | ❌ | ❌ | ✅ Console |
| **Team Features** | ✅ RBAC + Audit | ❌ | ❌ | ❌ | ✅ Teams |
| **Open Source** | ✅ MIT | ❌ | ✅ MIT | ✅ MIT | ❌ |
| **Learning Curve** | 📘 Low | 📘 Low | 📙 Medium | 📕 High | 📘 Low |

---

## 7. Technical Decisions & Trade-offs

| Decision | Lựa chọn | Lý do | Trade-off |
|----------|---------|-------|-----------|
| **Git Worktree isolation** | Mỗi agent branch riêng | Zero code conflict, familiar git workflow | Disk space (mỗi worktree = full copy) |
| **Python Orchestrator** | Standard library | Zero dependencies, portable | Thiếu type safety của typed languages |
| **SQLite (not PostgreSQL)** | File-based DB | Zero setup, portable, good for self-host | Không phù hợp cho large-scale multi-server |
| **Socket.IO (not SSE)** | Bi-directional | Client events (submit, join, leave) | Heavier than SSE |
| **Next.js (not Vite)** | SSR + App Router | SEO, file-based routing, server components | Build complexity |
| **Tailwind CSS (not styled-components)** | Utility-first | Fast prototyping, consistent design tokens | HTML có thể dài hơn |

---

## 8. Performance & Scalability

### 8.1 Benchmarks (Estimated)

| Metric | Current | Target |
|--------|---------|--------|
| **Concurrent Agents** | 4 | 25 (Team tier) |
| **Log Stream Latency** | < 200ms | < 100ms |
| **Dashboard Load Time** | < 2s | < 1s |
| **Task Queue Throughput** | 10 tasks/min | 50 tasks/min |
| **Max Active Projects** | 10 | 100+ |
| **Database Size (1M logs)** | ~200MB | Efficient indexing |

### 8.2 Scaling Strategy

```
Single Server (Self-Hosted)
  └─ 4-8 workers, SQLite, ~10 projects
  
Horizontal Scale (Cloud)
  └─ Multiple orchestrator nodes, PostgreSQL, ~100 projects
  
Enterprise Cluster (On-Premise)
  └─ Kubernetes, auto-scaling, distributed queue, 1000+ projects
```

---

## 9. Security Architecture

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Transport** | HTTPS/WSS | TLS termination |
| **Authentication** | JWT + bcrypt | express-jwt, bcryptjs |
| **Rate Limiting** | express-rate-limit | API: 100/min, Auth: 5/15min |
| **Input Validation** | express-validator | All POST/PUT endpoints |
| **CORS** | Origin whitelist | Configurable via env |
| **Path Traversal** | Path whitelist + resolve | File browser endpoint |
| **SQL Injection** | Parameterized queries | better-sqlite3 prepared statements |
| **Timing Attack** | Dummy hash comparison | Login endpoint |

---

## 10. Monitoring & Observability

| Component | Tool/Method | Metrics |
|-----------|-------------|---------|
| **Health Check** | `/api/health` endpoint | Status, uptime, timestamp |
| **Log Aggregation** | Global Terminal + DB | All task logs, searchable |
| **Queue Metrics** | `/api/queue/stats` | Queue depth, running, completed, failed |
| **System Health** | `scripts/health_check.sh` | CPU, RAM, disk, services |
| **CI/CD Status** | GitHub Actions | Build, test, lint results |
| **Error Recovery** | `scripts/error_recovery.sh` | Auto-detect + fix common issues |

---

## 11. Deployment Options

### 11.1 Self-Hosted (Quick Start)

```bash
git clone https://github.com/your-org/MultiAgentManager.git
cd MultiAgentManager
make setup       # Install dependencies
make dev-server  # Start backend (port 3001)
make dev-frontend # Start frontend (port 3000)
```

### 11.2 Docker (Planned)

```dockerfile
FROM node:20-alpine
# Backend + Frontend in one container
# Or docker-compose with separate services
```

### 11.3 Cloud Hosted (Pro + Enterprise)

- Managed by MultiAgentManager team
- Auto-scaling, auto-updates
- Backup & disaster recovery
- 99.9% uptime SLA

---

## 12. Success Stories (Vision)

> *"MultiAgentManager giúp tôi giảm thời gian code từ 8 tiếng xuống còn 2 tiếng. Tôi chỉ cần mô tả ý tưởng, hệ thống lo phần còn lại."*  
> — **Solo Developer**, Community Edition

> *"Với MultiAgentManager, team 5 người của chúng tôi có thể ship 3 features cùng lúc mà không bao giờ conflict code. Dashboard real-time giúp PM biết chính xác tiến độ từng agent."*  
> — **Tech Lead**, Team Edition

> *"Self-hosted deployment cho phép chúng tôi giữ toàn bộ dữ liệu trong VPC. Audit log đáp ứng đầy đủ compliance requirements."*  
> — **CTO**, Enterprise Edition

---

*This document serves as the solution milestone for MultiAgentManager. The architecture decisions and trade-offs documented here guide all future implementation phases.*
