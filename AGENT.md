# AGENT.md - MultiAgentManager Agent Architecture

## Overview

MultiAgentManager operates on a **phase-based orchestration model** where:
1. **freebuff** (Agent Manager) is the central coordinator
2. **opencode** (Developer Agent) handles implementation, testing, and debugging
3. **Phase-based execution** ensures 100% completion and zero bugs before moving to next phase
4. User commands trigger phase planning and delegation

This document defines the agent ecosystem, phase workflow, responsibilities, and communication protocol.

---

## 1. AGENT HIERARCHY (Multi-Agent Scale)

```
┌─────────────────────────────────────────────────┐
│   USER / EXTERNAL INPUT                         │
│   (e.g. "Implement user authentication")        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
       ┌───────────────────────────────────────┐
       │       freebuff (Agent Manager)        │
       │  ─ Parse user requirements            │
       │  ─ Create phase-based plan            │
       │  ─ Resource monitoring (RAM, CPU)     │
       │  ─ Spawn/manage multiple agents       │
       │  ─ Task scheduling & load balancing   │
       │  ─ Coordinate error fixes             │
       │  ─ Validate 100% completion           │
       │  ─ Report to user                     │
       └───────────────┬───────────────────────┘
                       │
       ┌───────────────┼───────────────┬────────────┐
       │               │               │            │
       ▼               ▼               ▼            ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │opencode-1│  │opencode-2│  │opencode-3│  │opencode-N│
    │(CLI#1)   │  │(CLI#2)   │  │(CLI#3)   │  │(CLI#N)   │
    │Process 1 │  │Process 2 │  │Process 3 │  │Process N │
    │RAM: 512MB│  │RAM: 512MB│  │RAM: 512MB│  │RAM: 512MB│
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

**Dynamic Agent Count:**
- Minimum: 1 opencode agent (fallback)
- Maximum: `floor(available_ram / 512MB)` (configurable)
- Default: `floor(available_ram / 1GB)` = moderate parallelism
- User can set: `multiagent --max-agents=4` to limit

---

## 2. freebuff (AGENT MANAGER)

### Role & Responsibilities

**freebuff** is the central orchestrator and single entry point for all user requests. It:

- **Understands user requirements** — Parses natural language input
- **Creates phase-based plan** — Breaks project into sequential phases with clear milestones
- **Delegates to opencode** — Sends implementation specs to opencode agent
- **Monitors phase progress** — Tracks completion status and bug fixes in real-time
- **Coordinates debugging** — Directs opencode to fix issues and validates fixes
- **Ensures quality gates** — Validates 100% phase completion + zero known bugs before moving forward
- **Reports to user** — Provides clear progress updates and waits for user approval before next phase

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Requirement Parsing** | Understand user goals and break into phases |
| **Phase Planning** | Create detailed, sequential phases with clear acceptance criteria |
| **Resource Monitoring** | Track system RAM, CPU, available processes |
| **Agent Spawning** | Dynamically create opencode agents based on available resources |
| **Task Scheduling** | Queue and distribute tasks across multiple agents |
| **Load Balancing** | Assign tasks to agents with available capacity |
| **Multi-Agent Communication** | Send specs to multiple agents and receive reports |
| **Result Aggregation** | Combine outputs from parallel agents into coherent phase result |
| **Progress Tracking** | Maintain real-time status of all agents and tasks |
| **Bug Management** | Track bugs reported by any agent and coordinate fixes |
| **Quality Validation** | Verify 100% completion and zero critical bugs before phase sign-off |
| **State Persistence** | Store multi-agent states, task queues, and audit logs |
| **User Reporting** | Generate clear reports with parallel execution details |

### freebuff Example Workflow

**User Input:**
```
"Implement user authentication system with JWT"
```

**freebuff Processing:**
1. Parse intent: `FEATURE_REQUEST` → Authentication System
2. Create phase plan:
   - **Phase 1:** Backend (JWT service + endpoints)
   - **Phase 2:** Frontend (Login UI + token storage)
   - **Phase 3:** Testing (Security & edge cases)
   - **Phase 4:** Documentation (API + user guide)

3. Current phase = Phase 1
4. Send spec to opencode with detailed requirements
5. Wait for opencode to report completion
6. Check if all requirements met + no critical bugs
   - If issues → Ask opencode to fix
   - If complete → Report to user "Phase 1 ✅ Complete. Ready for Phase 2?"
7. Wait for user command to proceed

### Phase-Based Execution Model (Multi-Agent)

```
User Request
    ↓
[freebuff] Creates Phase Plan
    ├─ Breaks each phase into parallel subtasks
    └─ Assesses RAM requirements
    ↓
[freebuff] Resource Check & Agent Spawning
    ├─ Check available system RAM
    ├─ Calculate max agents: floor(available_ram / 512MB)
    └─ Spawn N opencode agents (opencode-1, opencode-2, ..., opencode-N)
    ↓
Loop Until All Phases Complete:
    ├─ [freebuff] Sends Phase Spec + Task Queue → All Agents
    ├─ [freebuff] Load Balances Tasks Across Agents
    │   ├─ Agent 1 → Task A (JWT service)
    │   ├─ Agent 2 → Task B (Auth middleware)
    │   ├─ Agent 3 → Task C (Login endpoint)
    │   └─ Agent N → Task X (Auth tests)
    │
    ├─ [Multiple Agents] Work in Parallel
    │   ├─ opencode-1 implements & tests Task A
    │   ├─ opencode-2 implements & tests Task B
    │   ├─ opencode-3 implements & tests Task C
    │   └─ opencode-N implements & tests Task X
    │
    ├─ [Multiple Agents] Report Progress Simultaneously
    │   ├─ opencode-1 → 50% complete, tests running
    │   ├─ opencode-2 → 80% complete, all tests pass
    │   ├─ opencode-3 → blocked on issue #5
    │   └─ opencode-N → 100% complete, awaiting validation
    │
    ├─ [freebuff] Aggregates Progress
    │   ├─ Phase overall: 82% complete
    │   ├─ Blocking issues: 1 (from agent-3)
    │   └─ Agent capacity: 75% utilized
    │
    ├─ [freebuff] Handles Blockers
    │   └─ If any agent blocked → coordinate fixes
    │       ├─ Ask agent-3 to fix issue
    │       ├─ Allow other agents to continue
    │       └─ Merge results when all agents done
    │
    ├─ [freebuff] Waits for All Agents Complete
    │   └─ When all agents report done → validate phase quality
    │
    ├─ [freebuff] Validates Completion (100% + 0 bugs)
    │   ├─ Merge code from all agents
    │   ├─ Aggregate test results
    │   ├─ Check total coverage
    │   └─ Report to User
    │
    └─ If User Approves → Move to Next Phase
    
[freebuff] Cleans up & Terminates Agents
    ├─ Kill all opencode processes gracefully
    ├─ Archive phase results
    └─ Reports Final Success to User
```

---

## 3. RESOURCE MANAGEMENT & TASK SCHEDULING

### Resource Monitoring (freebuff)

freebuff continuously monitors system resources:

```json
{
  "system_state": {
    "timestamp": "2024-07-24T10:30:00Z",
    "total_ram_gb": 16,
    "available_ram_gb": 8.5,
    "available_ram_mb": 8704,
    "ram_utilization_percent": 47,
    "active_opencode_agents": 3,
    "max_possible_agents": 8,
    "recommended_max_agents": 7,
    "cpu_cores_available": 4,
    "cpu_utilization_percent": 35
  },
  "agent_states": {
    "opencode-1": {
      "status": "working",
      "ram_usage_mb": 512,
      "tasks_assigned": 2,
      "tasks_completed": 1,
      "uptime_minutes": 12
    },
    "opencode-2": {
      "status": "working",
      "ram_usage_mb": 480,
      "tasks_assigned": 2,
      "tasks_completed": 2,
      "uptime_minutes": 10
    },
    "opencode-3": {
      "status": "idle",
      "ram_usage_mb": 520,
      "tasks_assigned": 0,
      "tasks_completed": 0,
      "uptime_minutes": 5
    }
  }
}
```

### Dynamic Agent Spawning

freebuff automatically adjusts agent count based on:

```yaml
resource_config:
  memory_per_agent_mb: 512  # Each opencode needs ~512MB base
  cpu_cores_per_agent: 0.5  # Share CPU
  
  # Auto-scaling rules
  scaling:
    min_agents: 1
    max_agents_formula: "floor(available_ram_mb / 512)"
    
    # Example: 16GB RAM available
    # → floor(16000 / 512) = 31 agents (but limited by CPU)
    # With 4 CPU cores → practical max = 4-8 agents
    
    scale_up_threshold_percent: 20  # If >80% utilized, consider more agents
    scale_down_threshold_percent: 5  # If <5% utilized, reduce agents

# User-defined limits
user_overrides:
  max_agents: 4  # Limit to 4 agents even if RAM allows more
  min_ram_buffer_mb: 1000  # Keep 1GB free for system
```

### Task Scheduling & Load Balancing

freebuff uses round-robin + capacity-based scheduling:

```json
{
  "phase_id": "phase_1",
  "phase_name": "Backend Authentication",
  "subtasks": [
    {
      "task_id": "task_jwt_service",
      "name": "JWT Token Service",
      "estimated_complexity": "medium",
      "estimated_ram_mb": 300,
      "priority": 1
    },
    {
      "task_id": "task_auth_middleware",
      "name": "Auth Middleware",
      "estimated_complexity": "low",
      "estimated_ram_mb": 200,
      "priority": 2
    },
    {
      "task_id": "task_login_endpoint",
      "name": "Login Endpoint",
      "estimated_complexity": "medium",
      "estimated_ram_mb": 300,
      "priority": 3
    },
    {
      "task_id": "task_auth_tests",
      "name": "Authentication Tests",
      "estimated_complexity": "high",
      "estimated_ram_mb": 400,
      "priority": 4
    }
  ],
  "scheduling": {
    "algorithm": "round_robin_with_capacity",
    "assignment": [
      {
        "agent_id": "opencode-1",
        "assigned_tasks": ["task_jwt_service", "task_auth_tests"],
        "estimated_total_ram_mb": 700,
        "estimated_completion_minutes": 45
      },
      {
        "agent_id": "opencode-2",
        "assigned_tasks": ["task_login_endpoint"],
        "estimated_total_ram_mb": 300,
        "estimated_completion_minutes": 30
      },
      {
        "agent_id": "opencode-3",
        "assigned_tasks": ["task_auth_middleware"],
        "estimated_total_ram_mb": 200,
        "estimated_completion_minutes": 20
      }
    ],
    "overall_phase_eta_minutes": 45
  }
}
```

### Load Balancing Strategy

```
1. Sort tasks by complexity (high → low)
2. Round-robin assign tasks to agents
3. Check: total_assigned_ram <= agent_ram_limit
   - If exceeds → reassign to next available agent
4. Prioritize tasks by dependency (prerequisites first)
5. Keep agents equally loaded for balanced parallelism
```

**Triggers:** `opencode`, `code`, `implement`, `fix`

**Responsibilities:**
- Implement features according to freebuff specifications
- Write comprehensive unit & integration tests
- Debug and fix issues discovered during testing
- Report progress, blockers, and bugs to freebuff
- Iterate until phase is 100% complete with zero critical bugs
- Validate code quality, coverage, and performance

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Code Implementation** | Write production-ready code following project standards |
| **Testing** | Create comprehensive tests with target coverage (default 80%+) |
| **Debugging** | Identify and fix bugs, edge cases, and integration issues |
| **Progress Reporting** | Send status updates to freebuff with completion % and blockers |
| **Error Escalation** | Report critical issues that require architecture changes |
| **Iterative Refinement** | Keep coding/testing/fixing until freebuff validates completion |
| **Documentation** | Add code comments and generate API specs |

### Input Spec Format (from freebuff)

```json
{
  "phase_id": "phase_1",
  "phase_name": "Backend JWT Authentication",
  "user_story": "Implement user authentication with JWT tokens",
  "requirements": [
    "Create JWT token service (sign, verify, refresh)",
    "Create login/logout endpoints",
    "Implement middleware for protected routes",
    "Support email/password authentication",
    "Handle token expiration and refresh logic"
  ],
  "acceptance_criteria": [
    "All endpoints return proper error codes",
    "Tokens include user ID and role claims",
    "Token refresh works without re-login",
    "Failed auth attempts don't expose user existence",
    "Test coverage ≥ 85%"
  ],
  "technical_context": {
    "language": "TypeScript",
    "framework": "NestJS",
    "database": "PostgreSQL",
    "test_framework": "Jest",
    "existing_code": "...relevant snippets..."
  },
  "constraints": {
    "security_standard": "OWASP 2021",
    "performance": "Auth check < 50ms",
    "timeout": "Phase deadline - 2 days"
  }
}
```

### Output Report (to freebuff)

```json
{
  "phase_id": "phase_1",
  "status": "completed|in_progress|blocked",
  "completion_percentage": 100,
  "implementation": {
    "files_created": ["src/auth/jwt.service.ts", "src/auth/auth.controller.ts"],
    "files_modified": ["src/app.module.ts"],
    "lines_of_code": 450,
    "dependencies_added": ["@nestjs/jwt", "jsonwebtoken"]
  },
  "testing": {
    "tests_written": 24,
    "tests_passing": 24,
    "coverage": 87,
    "failing_tests": [],
    "coverage_by_file": {
      "jwt.service.ts": 92,
      "auth.controller.ts": 81
    }
  },
  "validation": {
    "all_requirements_met": true,
    "all_criteria_passed": true,
    "security_review_passed": true,
    "performance_benchmarks_passed": true
  },
  "issues": {
    "critical": [],
    "warnings": [
      "Consider adding rate limiting to login endpoint (not critical for phase 1)"
    ]
  },
  "notes": "Phase 1 complete. All requirements met, 87% test coverage. Ready for freebuff validation.",
  "timestamp": "2024-07-24T12:00:00Z"
}
```

### If Issues Found (to freebuff)

```json
{
  "phase_id": "phase_1",
  "status": "blocked",
  "completion_percentage": 75,
  "issues": {
    "critical": [
      {
        "id": "bug_1",
        "title": "Token refresh returns expired token",
        "severity": "critical",
        "description": "Refresh logic not updating expiration time",
        "affected_tests": ["auth.controller.spec.ts:refresh_token_returns_new_token"]
      }
    ],
    "warnings": []
  },
  "action_required": "Fix critical bug before phase completion",
  "timestamp": "2024-07-24T11:45:00Z"
}
```

### Iterative Loop

When opencode encounters issues, the cycle is:
1. opencode reports bugs to freebuff
2. freebuff acknowledges and asks opencode to fix
3. opencode fixes the code/tests
4. opencode re-tests and reports status
5. Loop until all issues resolved → Phase 100% complete

---

## 4. CLI COMMAND REFERENCE (Multi-Agent Enabled)

### Starting a Project (freebuff + Multi-Agent Orchestration)

```bash
# User sends request to freebuff - multi-agent phase-based execution starts
multiagent "Implement user authentication with JWT tokens"

# Output from freebuff:
# ┌──────────────────────────────────────────────────┐
# │ 📋 Project Plan: User Authentication with JWT    │
# ├──────────────────────────────────────────────────┤
# │ Phase 1: Backend JWT Service & Login Endpoints  │
# │ Phase 2: Frontend Login UI                       │
# │ Phase 3: Security Testing & Edge Cases          │
# │ Phase 4: Documentation & Deployment             │
# │                                                  │
# │ System Resources:                                │
# │  - Total RAM: 16 GB                              │
# │  - Available RAM: 8.5 GB                         │
# │  - Max concurrent agents: 8                      │
# │  - Spawning agents: 4                            │
# │                                                  │
# │ Starting Phase 1 with 4 parallel agents...       │
# └──────────────────────────────────────────────────┘
```

### Multi-Agent Resource Configuration

```bash
# Set max agents to use
multiagent --max-agents=4

# Reserve minimum RAM for system
multiagent --min-ram-buffer=1500  # Keep 1.5GB free

# Set memory per agent
multiagent --ram-per-agent=600  # 600MB each (default 512MB)

# Dynamic scaling
multiagent --scaling=auto  # Auto-adjust agents based on load
multiagent --scaling=fixed  # Use fixed agent count

# Combine options
multiagent --max-agents=6 --ram-per-agent=512 --min-ram-buffer=1000 \
  "Implement authentication feature"
```

### Agent Management Commands

```bash
# View all active agents and their status
multiagent agents
# Output shows:
#   opencode-1: [working] - Task: JWT Service (60% complete)
#   opencode-2: [working] - Task: Auth Middleware (45% complete)
#   opencode-3: [working] - Task: Login Endpoint (80% complete)
#   opencode-4: [idle]    - Waiting for next task
#   
#   RAM Usage: 2.1 GB / 8.5 GB available (24.7%)
#   CPU Usage: 65% (2.6/4 cores)

# Monitor specific agent
multiagent agents --id=opencode-1
# Shows detailed metrics for that agent

# Manually spawn additional agent
multiagent spawn-agent
# Spawns a new opencode agent if resources available

# Terminate idle agent
multiagent terminate-agent --id=opencode-4

# Force terminate all agents (emergency)
multiagent terminate-all
```

### Direct Multi-Agent Task Assignment

```bash
# Assign specific tasks to multiple agents
multiagent task-assign --phase=1 --parallel=true
# freebuff automatically distributes Phase 1 subtasks to available agents

# Manual task assignment
multiagent task-assign --agent=opencode-1 \
  --task="Implement JWT service" \
  --task="Write JWT tests"

# Queue task for next available agent
multiagent task-queue "Implement login endpoint"
```

### Status Checks (Enhanced for Multi-Agent)

```bash
# Check overall project status with multi-agent details
multiagent status

# Output:
# ┌─────────────────────────────────────────────────┐
# │ Project: JWT Authentication                     │
# │ Current Phase: phase_1 (Backend)                │
# │ Overall Progress: 62% (4 parallel agents)       │
# ├─────────────────────────────────────────────────┤
# │ Agent Status:                                   │
# │  opencode-1: 60% (JWT Service)                  │
# │  opencode-2: 45% (Auth Middleware)              │
# │  opencode-3: 80% (Login Endpoint)               │
# │  opencode-4: 75% (Auth Tests)                   │
# │                                                 │
# │ Phase Progress: 62% (avg of agents)             │
# │ Blocked Issues: 1 (from opencode-2)             │
# │ ETA: 45 minutes                                 │
# └─────────────────────────────────────────────────┘

# View agent-specific details
multiagent status --agent=opencode-1
# Shows detailed status for single agent

# View phase-level aggregation
multiagent status --phase=1
# Shows combined metrics across all agents on Phase 1

# Real-time monitoring
multiagent status --watch  # Refresh every 5 seconds
```

### Progress Tracking (Multi-Agent)

```bash
# View individual agent progress
multiagent progress --agent=opencode-1

# View phase progress (aggregated from all agents)
multiagent progress --phase=1

# View project progress with breakdown
multiagent progress
# Output:
#   Phase 1: 62% (4 agents, ETA 45 min)
#     - Agent 1: 60% (JWT Service)
#     - Agent 2: 45% (Auth Middleware)  [BLOCKED]
#     - Agent 3: 80% (Login Endpoint)
#     - Agent 4: 75% (Auth Tests)
#   Phase 2: 0% (waiting)
#   Overall: 17% of project complete
```

### Issue Management (Multi-Agent)

```bash
# View all issues across agents
multiagent issues

# View issues from specific agent
multiagent issues --agent=opencode-2

# View issues blocking phase
multiagent issues --phase=1

# Detailed issue report with agent info
multiagent issues --verbose
# Shows which agent reported, when, and impact on other agents
```

### Phase Completion & Approval

```bash
# After Phase 1 is 100% complete, freebuff reports:
# ┌──────────────────────────────────────────┐
# │ ✅ Phase 1: Backend - COMPLETE           │
# │ • 24/24 tests passing (87% coverage)     │
# │ • 0 critical issues                      │
# │ • All requirements met                   │
# │ • Security review passed                 │
# │                                          │
# │ Proceed to Phase 2? (yes/no)             │
# └──────────────────────────────────────────┘

# User approves next phase
multiagent next
# freebuff sends Phase 2 spec to opencode
```

### Aborting or Pausing

```bash
# Pause current phase (freebuff stops delegating)
multiagent pause

# Resume paused phase
multiagent resume

# Abort entire project
multiagent abort --reason="changing requirements"
```

### Configuration File Example (project-spec.yaml)

```yaml
project: MultiAgentManager
task: "Implement User Authentication"
created_at: 2024-07-24

phases:
  - id: phase_1
    name: "Backend JWT Service"
    requirements:
      - Create JWT token service
      - Create login/logout endpoints
      - Implement auth middleware
    acceptance_criteria:
      - All endpoints return proper codes
      - Token includes user ID and role
      - Test coverage ≥ 85%
    timeout_days: 2

  - id: phase_2
    name: "Frontend Login UI"
    depends_on: [phase_1]
    requirements:
      - Create login form component
      - Implement token storage
      - Add logout button
    acceptance_criteria:
      - Form validates input
      - Token persisted correctly
      - Test coverage ≥ 80%
    timeout_days: 2

  - id: phase_3
    name: "Security & Edge Cases"
    depends_on: [phase_1, phase_2]
    requirements:
      - Rate limiting on login
      - Token expiration handling
      - SQL injection prevention
    acceptance_criteria:
      - All security checks pass
      - Edge cases tested
      - Performance targets met
    timeout_days: 2

notifications:
  on_phase_complete: true
  on_blocker: true
  channels: [terminal]
```

---

## 5. COMMUNICATION PROTOCOL: freebuff ↔ Multiple Agents (1:N)

### Overview

freebuff maintains one-to-many communication with multiple opencode agents. Each agent operates independently but receives coordinated task assignments and reports to the central manager.

```
freebuff
  ├→ [unicast] Task Assignment → opencode-1
  ├→ [unicast] Task Assignment → opencode-2
  ├→ [unicast] Task Assignment → opencode-3
  └→ [unicast] Task Assignment → opencode-N

[Parallel Execution]

opencode-1 → [report] → freebuff (message queue)
opencode-2 → [report] → freebuff (message queue)
opencode-3 → [report] → freebuff (message queue)
opencode-N → [report] → freebuff (message queue)

freebuff aggregates all reports and coordinates
```

### freebuff → Multiple Agents: Task Batch Assignment

freebuff sends distributed task specs to each agent:

```json
{
  "message_type": "task_batch",
  "message_id": "batch_uuid_001",
  "timestamp": "2024-07-24T10:30:00Z",
  "from": "freebuff",
  "broadcast_to": ["opencode-1", "opencode-2", "opencode-3", "opencode-4"],
  "phase_id": "phase_1",
  "phase_name": "Backend Authentication",
  "tasks": [
    {
      "task_id": "task_jwt_service",
      "agent_id": "opencode-1",
      "name": "JWT Token Service",
      "description": "Implement JWT service with sign, verify, refresh methods",
      "requirements": ["Create JWT service", "Test token lifecycle"],
      "acceptance_criteria": ["All methods tested", "Coverage ≥ 90%"]
    },
    {
      "task_id": "task_auth_middleware",
      "agent_id": "opencode-2",
      "name": "Auth Middleware",
      "description": "Implement NestJS auth middleware",
      "requirements": ["Check JWT validity", "Extract claims"],
      "acceptance_criteria": ["Routes protected", "Coverage ≥ 85%"]
    },
    {
      "task_id": "task_login_endpoint",
      "agent_id": "opencode-3",
      "name": "Login Endpoint",
      "description": "Create POST /auth/login endpoint",
      "requirements": ["Validate credentials", "Return token"],
      "acceptance_criteria": ["Endpoint works", "Tests pass"]
    },
    {
      "task_id": "task_auth_tests",
      "agent_id": "opencode-4",
      "name": "Authentication Integration Tests",
      "description": "Write comprehensive test suite",
      "requirements": ["Test all flows", "Edge cases covered"],
      "acceptance_criteria": ["24+ tests", "100% passing", "≥ 85% coverage"]
    }
  ],
  "shared_context": {
    "project_id": "multiagentmanager",
    "existing_files": ["...shared codebase..."],
    "project_standards": "...coding standards...",
    "shared_test_fixtures": "...test utilities..."
  },
  "coordination": {
    "dependencies": [
      {
        "task": "task_auth_middleware",
        "depends_on": ["task_jwt_service"],
        "reason": "Middleware needs JWT service"
      },
      {
        "task": "task_auth_tests",
        "depends_on": ["task_jwt_service", "task_login_endpoint", "task_auth_middleware"],
        "reason": "Integration tests need all components"
      }
    ],
    "merge_strategy": "code_concatenation_with_conflict_resolution",
    "phase_deadline": "2024-07-26T18:00:00Z"
  }
}
```

### Multiple Agents → freebuff: Parallel Progress Reports

All agents report simultaneously (or async):

```json
{
  "message_type": "progress_report",
  "message_id": "msg_uuid_002_agent1",
  "timestamp": "2024-07-24T11:15:00Z",
  "from": "opencode-1",
  "to": "freebuff",
  "task_id": "task_jwt_service",
  "status": "in_progress",
  "completion_percentage": 65,
  "summary": "JWT service 65% complete, writing tests",
  "blockers": [],
  "eta_minutes": 25
}
```

```json
{
  "message_type": "progress_report",
  "message_id": "msg_uuid_002_agent2",
  "timestamp": "2024-07-24T11:15:00Z",
  "from": "opencode-2",
  "to": "freebuff",
  "task_id": "task_auth_middleware",
  "status": "blocked",
  "completion_percentage": 30,
  "summary": "Waiting for JWT service completion",
  "blockers": [
    {
      "type": "dependency",
      "description": "JWT service not ready",
      "blocking_task": "task_jwt_service"
    }
  ],
  "eta_minutes": null
}
```

### freebuff: Multi-Agent Progress Aggregation

freebuff processes all incoming reports:

```json
{
  "aggregation_type": "phase_status",
  "aggregation_time": "2024-07-24T11:20:00Z",
  "phase_id": "phase_1",
  "overall_completion": 62,
  "agent_details": [
    {
      "agent_id": "opencode-1",
      "task": "task_jwt_service",
      "status": "in_progress",
      "completion": 65,
      "eta_minutes": 25
    },
    {
      "agent_id": "opencode-2",
      "task": "task_auth_middleware",
      "status": "blocked",
      "completion": 30,
      "blocker": "Waiting for opencode-1"
    },
    {
      "agent_id": "opencode-3",
      "task": "task_login_endpoint",
      "status": "in_progress",
      "completion": 55,
      "eta_minutes": 30
    },
    {
      "agent_id": "opencode-4",
      "task": "task_auth_tests",
      "status": "waiting",
      "completion": 0,
      "reason": "Waiting for other tasks to complete"
    }
  ],
  "critical_blockers": 0,
  "warnings": 1,
  "recommendations": "Agent-2 blocked by Agent-1. Once Agent-1 completes, Agent-2 can proceed immediately."
}
```

### Multiple Agents → freebuff: Batch Completion Report

When all agents complete (or phase completes):

```json
{
  "message_type": "phase_batch_complete",
  "message_id": "msg_uuid_batch_complete",
  "timestamp": "2024-07-24T14:30:00Z",
  "from": ["opencode-1", "opencode-2", "opencode-3", "opencode-4"],
  "to": "freebuff",
  "phase_id": "phase_1",
  "status": "completed",
  "completion_percentage": 100,
  "agent_results": [
    {
      "agent_id": "opencode-1",
      "task_id": "task_jwt_service",
      "status": "completed",
      "files_created": ["src/auth/jwt.service.ts"],
      "tests_written": 8,
      "coverage": 94
    },
    {
      "agent_id": "opencode-2",
      "task_id": "task_auth_middleware",
      "status": "completed",
      "files_created": ["src/auth/auth.middleware.ts"],
      "tests_written": 4,
      "coverage": 88
    },
    {
      "agent_id": "opencode-3",
      "task_id": "task_login_endpoint",
      "status": "completed",
      "files_created": ["src/auth/auth.controller.ts"],
      "tests_written": 7,
      "coverage": 82
    },
    {
      "agent_id": "opencode-4",
      "task_id": "task_auth_tests",
      "status": "completed",
      "files_created": ["test/auth.integration.spec.ts"],
      "integration_tests_written": 12,
      "all_tests_passing": true
    }
  ],
  "aggregated_validation": {
    "total_files_created": 4,
    "total_tests_written": 31,
    "all_tests_passing": true,
    "combined_coverage": 87,
    "critical_issues": 0,
    "requirements_met": true,
    "criteria_passed": true
  }
}
```

```json
{
  "message_type": "phase_spec",
  "message_id": "msg_uuid_001",
  "timestamp": "2024-07-24T10:30:00Z",
  "from": "freebuff",
  "to": "opencode",
  "phase_id": "phase_1",
  "phase_name": "Backend Authentication",
  "user_story": "Implement JWT-based user authentication",
  "requirements": [
    "Create JWT token service (sign, verify, refresh)",
    "Create login/logout endpoints",
    "Implement auth middleware",
    "Support email/password authentication",
    "Handle token expiration and refresh"
  ],
  "acceptance_criteria": [
    "All endpoints return proper HTTP status codes",
    "Tokens include user ID and role claims",
    "Token refresh works without re-login",
    "Failed auth doesn't expose user existence",
    "Test coverage ≥ 85%",
    "No critical security issues"
  ],
  "technical_specs": {
    "language": "TypeScript",
    "framework": "NestJS",
    "database": "PostgreSQL with Prisma",
    "test_framework": "Jest",
    "target_coverage": 85
  },
  "context": {
    "project_id": "multiagentmanager",
    "existing_files": ["...relevant code snippets..."],
    "project_standards": "...coding standards..."
  },
  "deadline": "2024-07-26T18:00:00Z"
}
```

### opencode → freebuff: Progress Report

opencode sends progress updates back to freebuff:

```json
{
  "message_type": "progress_report",
  "message_id": "msg_uuid_002",
  "timestamp": "2024-07-24T11:15:00Z",
  "from": "opencode",
  "to": "freebuff",
  "in_reply_to": "msg_uuid_001",
  "phase_id": "phase_1",
  "status": "in_progress",
  "completion_percentage": 60,
  "summary": "Implementing JWT service and auth endpoints",
  "implementation": {
    "files_in_progress": ["src/auth/jwt.service.ts", "src/auth/auth.controller.ts"],
    "lines_written": 250
  },
  "testing": {
    "tests_written": 12,
    "tests_passing": 12,
    "current_coverage": 70
  },
  "blockers": [],
  "next_steps": "Writing test cases for edge cases"
}
```

### opencode → freebuff: Phase Complete (Success)

When all requirements met and 100% complete:

```json
{
  "message_type": "phase_complete",
  "message_id": "msg_uuid_003",
  "timestamp": "2024-07-24T14:30:00Z",
  "from": "opencode",
  "to": "freebuff",
  "phase_id": "phase_1",
  "status": "completed",
  "completion_percentage": 100,
  "validation": {
    "all_requirements_met": true,
    "all_criteria_passed": true,
    "test_coverage": 87,
    "security_review_passed": true,
    "performance_benchmarks_passed": true
  },
  "summary": {
    "files_created": 4,
    "tests_written": 24,
    "all_tests_passing": true,
    "critical_issues": 0,
    "warnings": 1
  },
  "deliverables": {
    "code_files": ["src/auth/jwt.service.ts", "src/auth/auth.controller.ts", "src/auth/auth.middleware.ts"],
    "test_files": ["src/auth/jwt.service.spec.ts", "src/auth/auth.controller.spec.ts"],
    "documentation": "Code comments and inline docs"
  },
  "notes": "Phase 1 complete. All requirements met. Ready for freebuff approval and Phase 2."
}
```

### opencode → freebuff: Issue Report (Blocked)

If critical issues found, opencode reports and awaits fix instruction:

```json
{
  "message_type": "issue_report",
  "message_id": "msg_uuid_004",
  "timestamp": "2024-07-24T12:45:00Z",
  "from": "opencode",
  "to": "freebuff",
  "phase_id": "phase_1",
  "status": "blocked",
  "completion_percentage": 75,
  "issues": [
    {
      "id": "issue_1",
      "severity": "critical",
      "title": "Token refresh returns expired token",
      "description": "JWT refresh logic not updating expiration timestamp",
      "affected_requirement": "Handle token expiration and refresh",
      "affected_tests": ["jwt.service.spec.ts:refresh_token_should_return_new_token"],
      "root_cause": "Missing expiration update in refresh method"
    }
  ],
  "action_required": "Fix critical bug before phase can be completed",
  "estimated_time_to_fix": "30 minutes"
}
```

### freebuff → opencode: Fix Instruction

freebuff acknowledges the issue and authorizes fix:

```json
{
  "message_type": "fix_instruction",
  "message_id": "msg_uuid_005",
  "timestamp": "2024-07-24T12:46:00Z",
  "from": "freebuff",
  "to": "opencode",
  "in_reply_to": "msg_uuid_004",
  "phase_id": "phase_1",
  "issues_to_fix": ["issue_1"],
  "instruction": "Fix JWT refresh method to properly update token expiration",
  "quality_gates": "Ensure failing tests pass and coverage remains ≥ 85%",
  "await_completion": true
}
```

### opencode → freebuff: Issue Resolution

After fixing, opencode reports resolution:

```json
{
  "message_type": "issue_resolved",
  "message_id": "msg_uuid_006",
  "timestamp": "2024-07-24T13:15:00Z",
  "from": "opencode",
  "to": "freebuff",
  "in_reply_to": "msg_uuid_005",
  "phase_id": "phase_1",
  "status": "completed",
  "completion_percentage": 100,
  "fixed_issues": ["issue_1"],
  "test_results": {
    "all_tests_passing": true,
    "coverage": 87
  },
  "validation": {
    "all_requirements_met": true,
    "all_criteria_passed": true,
    "critical_issues": 0
  },
  "notes": "Issue fixed. Retesting confirmed refresh now returns valid token with updated expiration."
}
```

---

## 6. PHASE STATE MACHINE

```
PLANNED
  └─→ IN_PROGRESS (freebuff sends spec to opencode)
       ├─→ TESTING (opencode writes tests & validates)
       │    ├─→ BLOCKED (critical issues found)
       │    │    └─→ FIXING (opencode fixes issues)
       │    │         └─→ TESTING (re-run tests)
       │    │              └─→ [BLOCKED or COMPLETED]
       │    │
       │    └─→ COMPLETED (100% + 0 critical bugs)
       │         └─→ AWAITING_APPROVAL (freebuff validates & asks user)
       │
       └─→ CANCELLED (user aborts phase)

AWAITING_APPROVAL
  ├─→ APPROVED (user approves, move to next phase)
  └─→ REJECTED (user requests changes)

APPROVED
  └─→ ARCHIVED (phase fully resolved, logged)

CANCELLED
  └─→ ARCHIVED (phase cancelled, logged)
```

### Phase Completion Criteria (Quality Gates)

Phase moves to AWAITING_APPROVAL only if:
- ✅ All requirements implemented
- ✅ All acceptance criteria passed
- ✅ Test coverage ≥ target (default 85%)
- ✅ All tests passing (0 failing)
- ✅ 0 critical issues
- ✅ Security review passed (if applicable)

---

## 7. ERROR HANDLING & BLOCKING

### opencode Failure Scenarios

| Scenario | freebuff Action |
|----------|-----------------|
| Implementation bug | Block phase, ask opencode to fix |
| Test failure | Block phase, ask opencode to debug |
| Coverage below target | Block phase, ask opencode to add tests |
| Security issue | Block phase, escalate with details |
| Performance failure | Block phase, ask for optimization |
| opencode timeout | Retry once, then escalate to user |

### freebuff Response to Blockers

1. **Report to user** — Show clear issue description
2. **Halt phase** — Stop waiting for more progress
3. **Request fix** — Ask opencode to resolve issue
4. **Validate fix** — Re-test and verify resolution
5. **Resume or escalate** — If opencode can't fix, escalate to user

### Bug Fix Loop

```
opencode reports issue
  ↓
freebuff acknowledges & authorizes fix
  ↓
opencode investigates root cause
  ↓
opencode implements fix
  ↓
opencode re-tests thoroughly
  ↓
freebuff validates fix quality
  ├─→ If passed → Continue phase
  └─→ If failed → Ask for another fix attempt
```

### Escalation to User

If opencode cannot resolve after 2 fix attempts:
- freebuff reports issue with full context to user
- User can request code review, adjust requirements, or abort phase
- Once resolved, phase resumes

---

## 8. CONTEXT PASSING & STATE PERSISTENCE

### Shared Project Context

freebuff maintains a project state that persists across phases:

```json
{
  "project_id": "auth_system_001",
  "user_input": "Implement user authentication with JWT tokens",
  "created_at": "2024-07-24T10:00:00Z",
  "status": "in_progress",
  "current_phase": "phase_1",
  "phases": {
    "phase_1": {
      "id": "phase_1",
      "name": "Backend JWT Service",
      "status": "completed",
      "completion_percentage": 100,
      "artifacts": {
        "code_files": ["src/auth/jwt.service.ts", "src/auth/auth.controller.ts"],
        "test_files": ["src/auth/jwt.service.spec.ts", "src/auth/auth.controller.spec.ts"],
        "test_coverage": 87
      },
      "issues_history": [],
      "completed_at": "2024-07-24T14:30:00Z"
    },
    "phase_2": {
      "id": "phase_2",
      "name": "Frontend Login UI",
      "status": "planned",
      "dependencies": ["phase_1"],
      "completion_percentage": 0
    }
  },
  "project_metadata": {
    "project_id": "multiagentmanager",
    "version_target": "1.2.0",
    "priority": "high",
    "codebase_context": "...existing code snippets...",
    "project_standards": "...coding conventions..."
  }
}
```

### Persistence Strategy

- **Real-time State** — Stored in Redis for fast access during phase execution
- **Phase Artifacts** — Saved to filesystem (`/workspace/phases/{phase_id}/`)
- **Audit Trail** — Archived in PostgreSQL for compliance & debugging
- **Recovery** — If interrupted, can resume from last completed phase

---

## 9. EXAMPLES: PHASE-BASED WORKFLOW (WITH MULTI-AGENT PARALLELISM)

### Example 0: Multi-Agent Parallel Execution (NEW)

```bash
$ multiagent --max-agents=4 "Implement JWT-based user authentication"
```

**freebuff Creates Plan & Spawns Agents:**
```
📋 Project: JWT User Authentication
├─ Phase 1: Backend JWT Service (multiple agents in parallel)
│  ├─ Task 1: JWT Token Service → opencode-1
│  ├─ Task 2: Auth Middleware → opencode-2
│  ├─ Task 3: Login Endpoint → opencode-3
│  └─ Task 4: Auth Integration Tests → opencode-4
├─ Phase 2: Frontend Login UI (2 agents)
└─ Phase 3: Security Testing & Deployment (sequential)

System Resources:
  - Total RAM: 16 GB
  - Available: 8.5 GB
  - Max agents: 8, Using: 4
  - Estimated phase time: 1 hour (vs 3 hours sequential)

Starting Phase 1 with 4 parallel agents...
```

**Phase 1 Parallel Execution:**

T+0min: freebuff → ALL AGENTS (distributed task assignment)
```
[freebuff] Broadcasting task batch to 4 agents

opencode-1: Task task_jwt_service
  Implement JWT service (sign, verify, refresh)
  ETA: 45 minutes

opencode-2: Task task_auth_middleware
  Implement auth middleware (depends on opencode-1)
  ETA: 30 minutes

opencode-3: Task task_login_endpoint
  Implement login endpoint (parallel with others)
  ETA: 35 minutes

opencode-4: Task task_auth_tests
  Write integration tests (depends on all others)
  ETA: 40 minutes
```

T+15min: Real-time Progress (All Agents Reporting)
```
[freebuff] Phase 1 Progress: 35% (Agents working in parallel)
├─ opencode-1: 40% (JWT service structure, writing core methods)
├─ opencode-2: 0% (Waiting for JWT service from opencode-1)
├─ opencode-3: 45% (Login endpoint, endpoint defined, business logic in progress)
└─ opencode-4: 0% (Waiting for other tasks)

Resource Usage: 2.0 GB / 8.5 GB (23%)
CPU Usage: 75% (3/4 cores)
ETA Phase Completion: 50 minutes (vs 3 hours sequential)
```

T+30min: Dependency Resolved
```
[freebuff] opencode-1 completed JWT service (100%)
├─ Files: jwt.service.ts (220 LOC)
├─ Tests: 8 passing, 94% coverage
└─ Unblocking: opencode-2, opencode-4 can now proceed

[freebuff] Notifying opencode-2 to proceed with auth middleware...
[opencode-2] Starting task_auth_middleware (now unblocked)
```

T+45min: Multiple Completions
```
[freebuff] Phase 1 Progress: 75% (2 agents completed, 2 completing)
├─ opencode-1: ✅ 100% (JWT service complete)
├─ opencode-2: ✅ 100% (Auth middleware complete)
├─ opencode-3: 90% (Login endpoint almost done)
└─ opencode-4: 60% (Integration tests in progress)

Resource Usage: 1.2 GB / 8.5 GB (14%)
CPU Usage: 45% (1.8/4 cores)
ETA Phase Completion: 15 minutes
```

T+55min: All Agents Complete
```
[freebuff] PHASE 1 COMPLETION: All 4 agents finished

opencode-1 results: JWT service ✅
  - 1 file, 220 LOC, 8 tests (94% coverage)

opencode-2 results: Auth middleware ✅
  - 1 file, 110 LOC, 4 tests (88% coverage)

opencode-3 results: Login endpoint ✅
  - 1 file, 150 LOC, 7 tests (82% coverage)

opencode-4 results: Integration tests ✅
  - 1 file, 180 LOC, 12 integration tests (100% passing)

PHASE AGGREGATION:
  - Total files: 4
  - Total LOC: 660
  - Total tests: 31 (100% passing)
  - Combined coverage: 87% ✅
  - Critical issues: 0 ✅
  - Time taken: 55 minutes (vs 180 minutes sequential)
```

T+56min: freebuff Validation & User Report
```
✅ [freebuff] PHASE 1 VALIDATION PASSED
- 31/31 tests passing ✓
- 87% coverage (≥85% required) ✓
- 0 critical issues ✓
- All requirements met ✓
- All agents completed ✓

PHASE 1: 100% COMPLETE (Parallelism Saved 125 minutes!)
```

**Report to User:**
```
┌──────────────────────────────────────────────────┐
│ ✅ PHASE 1: Backend JWT Service - COMPLETE       │
├──────────────────────────────────────────────────┤
│ Execution Method: 4 Agents in Parallel           │
│                                                  │
│ Agent Results:                                   │
│  ✅ opencode-1: JWT Service (220 LOC, 94% cov)  │
│  ✅ opencode-2: Auth Middleware (110 LOC, 88%)  │
│  ✅ opencode-3: Login Endpoint (150 LOC, 82%)   │
│  ✅ opencode-4: Integration Tests (180 LOC)     │
│                                                  │
│ Aggregate Stats:                                 │
│  Files Created: 4 files, 660 LOC                │
│  Tests Written: 31 tests (100% passing)         │
│  Code Coverage: 87% (≥85% required) ✓           │
│  Critical Issues: 0 ✓                           │
│                                                  │
│ Performance:                                     │
│  Time Taken: 55 minutes                         │
│  Sequential Estimate: 180 minutes               │
│  Time Saved: 125 minutes (69% faster!) 🚀       │
│                                                  │
│ Status: Ready for Phase 2                       │
│ Proceed with Frontend Login UI? (yes/no)        │
└──────────────────────────────────────────────────┘
```

User: `multiagent next`

**Phase 2 Begins (with fewer agents):**
```
[freebuff] Phase 2 requires only frontend work
Spawning 2 agents (reducing from 4 to save resources)

opencode-5: Frontend Login Form
opencode-6: Token Storage & Auth UI

Other agents (1,2,3,4) terminated to free RAM
```

---

### Example 1: Basic Feature Implementation (3 Phases)

```bash
$ multiagent "Implement JWT-based user authentication"
```

**freebuff Creates Plan:**
```
📋 Project: JWT User Authentication
├─ Phase 1: Backend JWT Service (2 days)
├─ Phase 2: Frontend Login UI (2 days)
└─ Phase 3: Security Testing & Deployment (2 days)

Starting Phase 1...
```

**Phase 1 Execution:**

T+0: freebuff → opencode (spec sent)
```
[freebuff] Sent Phase 1 specification
Requirements:
  - JWT service (sign, verify, refresh)
  - Login/logout endpoints
  - Auth middleware
Acceptance Criteria:
  - All endpoints return proper codes
  - Coverage ≥ 85%
  - 0 critical issues
```

T+30min: opencode → freebuff (progress)
```
[opencode] Phase 1 Progress: 45%
Tests written: 12/24
Coverage: 70%
Next: Testing edge cases
```

T+2hr: opencode → freebuff (blocked)
```
❌ [opencode] CRITICAL ISSUE FOUND
Issue: Token refresh returns expired token
Affected: Handle token expiration requirement
Blocked until fix
```

T+2.5hr: freebuff → opencode (fix instruction)
```
✓ [freebuff] Fix authorization sent
Please fix JWT refresh method expiration logic
Retest thoroughly and report when complete
```

T+3hr: opencode → freebuff (issue resolved)
```
✅ [opencode] Issue Fixed & Verified
- JWT refresh now returns valid token
- All 24 tests passing
- Coverage: 87%
- Awaiting Phase 1 completion check
```

T+3hr: freebuff → opencode (validation)
```
✅ [freebuff] PHASE 1 VALIDATION PASSED
- 24/24 tests passing ✓
- 87% coverage (≥85% required) ✓
- 0 critical issues ✓
- All requirements met ✓
- Security review passed ✓

PHASE 1: 100% COMPLETE
```

**Report to User:**
```
┌────────────────────────────────────────────┐
│ ✅ PHASE 1: Backend JWT Service - COMPLETE  │
├────────────────────────────────────────────┤
│ Files Created: 3 files, 520 LOC             │
│ Tests Written: 24 tests, 87% coverage       │
│ Issues Found & Fixed: 1 critical (fixed)   │
│ Time Taken: 3 hours                         │
│                                            │
│ Status: Ready for Phase 2                  │
│ Proceed with Frontend Login UI? (yes/no)   │
└────────────────────────────────────────────┘
```

User: `multiagent next`

---

### Example 2: Multi-Phase Project with Parallel Issues

```bash
$ multiagent "Build complete authentication system"
```

**Project Phases:**
```
Phase 1: Backend JWT (COMPLETED)
Phase 2: Frontend Login UI (IN_PROGRESS)
Phase 3: OAuth2 Integration (PLANNED)
Phase 4: Security Hardening (PLANNED)
```

**Phase 2 Execution Timeline:**

```
T+0h:  freebuff sends Phase 2 spec to opencode
       Requirements: Login form, token storage, logout

T+1h:  opencode reports progress (60% complete)
       - Login component built
       - Token storage implemented
       - Testing logout edge cases

T+1.5h: opencode reports BLOCKED
        Issue: Token refresh timing bug in logout flow
        Severity: High (affects acceptance criteria)

T+2h:  freebuff acknowledges, authorizes fix

T+2.5h: opencode reports FIXED & RE-TESTED
        - Logout flow now properly clears tokens
        - All 18 tests passing
        - Coverage: 84%

T+2.75h: freebuff VALIDATES Phase 2
         ✅ All requirements met
         ✅ 84% coverage (≥80% required)
         ✅ 0 critical issues
         → Phase 2 COMPLETE

         Report: "Phase 2 ready. Proceed to Phase 3?" 
         User response: yes → Phase 3 begins immediately
```

---

### Example 3: User Intervention Scenario

```bash
$ multiagent "Implement two-factor authentication"
```

**During Phase 1 (Backend 2FA Logic):**

T+4h: opencode reports CRITICAL BLOCKER
```
❌ Cannot implement SMS verification without external API
Two options:
1. Mock SMS for now (allows phase completion)
2. Integrate with Twilio (adds 2-day timeline)

Requires user decision
```

**freebuff Reports to User:**
```
🚨 PHASE 1: Blocker Requires User Input

Implementation Challenge:
- SMS 2FA verification requires external API
- Current: No Twilio credentials available

Options:
1. Mock SMS (Phase completes but not production-ready)
2. Setup Twilio (adds 2 days to timeline)
3. Use email OTP instead (adjust architecture)

Action Required: User decision before proceeding
```

**User Decision:** `multiagent override --option=2 --setup-twilio=true`

```
freebuff acknowledges, sends updated spec to opencode
opencode adjusts implementation to integrate Twilio
Phase timeline extended to account for 2 additional days
```

---

### Example 4: Phase Rejection & Rework

```bash
[Phase 3 Completion Report]
✅ Phase 3: API Documentation - Complete
- API docs generated
- Code comments added
- README updated

Proceed to Phase 4? (yes/no)

User: no
Reason: Documentation needs restructuring for clarity
```

**freebuff Handles Rejection:**
```
❌ Phase 3 returned to opencode for rework

Feedback from user:
"API docs need clearer organization. Group endpoints by resource."

opencode now:
1. Reviews user feedback
2. Reorganizes documentation structure
3. Re-tests and resubmits for approval
```

---

## 10. ARCHITECTURE: freebuff & opencode FOCUS

### Core Design Decisions

**Why Only 2 Agents?**

1. **Clarity** — Clear separation of concerns (management vs. implementation)
2. **Simplicity** — Easier to debug and understand communication flow
3. **Scalability** — opencode can be extended internally without adding more agents
4. **Maintainability** — Fewer moving parts, focused responsibilities

### freebuff Capabilities

freebuff **orchestrates** phases but does NOT implement:
- ✅ Phase planning & decomposition
- ✅ Progress tracking & validation
- ✅ Quality gate enforcement
- ✅ User communication
- ❌ NOT code implementation
- ❌ NOT testing (opencode does this)

### opencode Capabilities

opencode **implements everything** within a phase:
- ✅ Write production code
- ✅ Write unit & integration tests
- ✅ Debug and fix issues
- ✅ Report progress & blockers
- ✅ Iterate until phase complete
- ❌ NOT orchestration (freebuff does this)
- ❌ NOT phase planning (freebuff does this)

### When to Add Specialized Agents (Future)

Only add new agents if:
1. The task is **entirely out of scope** for opencode (e.g., DevOps-only, pure data analysis)
2. The task **requires real-time external services** (e.g., cloud deployment, DB operations)
3. The task is **performance-critical** and needs dedicated resources

Example candidates for future agents:
- `ops-agent` — Handle cloud deployment, infrastructure, CI/CD
- `data-agent` — Handle data migrations, ETL, analytics
- `review-agent` — Specialized code review (security, performance)

But for MVP: **freebuff (manager) + opencode (builder)** is sufficient.

---

## 11. MONITORING & OBSERVABILITY

### Real-Time Phase Status

```bash
# View current phase progress
multiagent status

# Output:
┌─────────────────────────────────────────┐
│ Project: JWT Authentication             │
│ Current Phase: phase_2 (Frontend Login) │
│ Overall Progress: 45% (1.5 of 3 phases) │
├─────────────────────────────────────────┤
│ Phase 1 (Backend): ✅ Complete (87% cov)│
│ Phase 2 (Frontend): 🔄 In Progress (60%)│
│   - Tests passing: 18/24                │
│   - Coverage: 84%                       │
│   - Known issues: 0 critical            │
│ Phase 3 (Security): ⏳ Planned          │
│                                         │
│ Blocked: No                             │
│ ETA: July 28, 2024                      │
└─────────────────────────────────────────┘
```

### Phase-Level Logs

```bash
# View logs for specific phase
multiagent logs --phase=phase_1

# Output shows:
# - Phase spec sent to opencode (T+0)
# - Progress updates (T+30min, T+1h, T+1.5h, ...)
# - Issues reported & fixed (T+2h → T+2.5h)
# - Phase completion (T+3h)
# - User approval (T+3.15h)

# View message history between freebuff and opencode
multiagent logs --phase=phase_1 --messages-only
```

### Issue Tracking

```bash
# View all open issues across phases
multiagent issues

# View issues for specific phase
multiagent issues --phase=phase_2

# Output:
┌──────────────────────────────────────┐
│ Phase 2: Open Issues                 │
├──────────────────────────────────────┤
│ Issue #5 (FIXED): Token timing bug   │
│ Issue #6 (OPEN): Logout edge case    │
│   Severity: High                     │
│   Reported: T+1.5h ago               │
│   opencode working on: Yes           │
│   ETA fix: 30 min                    │
└──────────────────────────────────────┘
```

### Phase Completion Metrics

```bash
# View metrics for completed phase
multiagent metrics --phase=phase_1

# Output:
┌────────────────────────────────────────┐
│ Phase 1: Backend JWT Service Metrics   │
├────────────────────────────────────────┤
│ Time to Complete: 3 hours              │
│ Issues Found: 1 critical               │
│ Issues Fixed: 1 (fixed in 30 min)      │
│ Test Coverage: 87% (target: 85%)       │
│ Code Quality: A (no warnings)          │
│ Files Created: 3                       │
│ Lines of Code: 520                     │
│ Tests Written: 24                      │
│ Test Pass Rate: 100%                   │
│                                        │
│ Quality Assessment: ✅ PASSED           │
│ All acceptance criteria met            │
└────────────────────────────────────────┘
```

### Project-Level Analytics

```bash
multiagent analytics --project

# Output:
┌────────────────────────────────────────┐
│ Project: JWT Authentication Analytics  │
├────────────────────────────────────────┤
│ Total Time: 9 hours (3 phases)         │
│ Phases Completed: 2/3                  │
│ Overall Progress: 67%                  │
│                                        │
│ Issues Tracking:                       │
│   - Total found: 3                     │
│   - Fixed: 3                           │
│   - Critical: 0 (all fixed)            │
│   - Open: 0                            │
│                                        │
│ Code Quality:                          │
│   - Avg coverage: 85%                  │
│   - Test pass rate: 100%               │
│   - Quality: Excellent                 │
│                                        │
│ Projected Completion: July 25, 2024    │
└────────────────────────────────────────┘
```

### Agent Communication Log

```bash
# View all messages between freebuff and opencode
multiagent logs --conversation

# Example output shows:
# Message 1: freebuff sends phase spec to opencode
# Message 2: opencode acknowledges + starts
# Message 3: opencode reports progress
# Message 4: opencode reports issue
# Message 5: freebuff authorizes fix
# Message 6: opencode reports fix + re-test results
# Message 7: freebuff validates phase completion
# Message 8: Report to user + await approval
```

---

## 12. BEST PRACTICES FOR PHASE-BASED EXECUTION (Multi-Agent)

### For freebuff (Agent Manager)

1. **Clear Phase Boundaries** — Each phase should have one clear goal with specific acceptance criteria
2. **Granular Task Decomposition** — Break phases into independent subtasks suitable for parallel execution
3. **Identify Dependencies** — Clearly specify task dependencies to avoid circular waits
4. **Resource Awareness** — Monitor RAM usage and adjust agent count dynamically
5. **Load Balancing** — Distribute tasks evenly to keep all agents utilized
6. **Quality Gate Aggregation** — Validate combined results from all agents, not individually
7. **Transparent Communication** — Report all issues to user immediately, don't hide blockers
8. **Audit Everything** — Log all agent communications and phase transitions

### For opencode (Multiple Instances)

1. **Independence** — Each agent should work on isolated, non-conflicting tasks
2. **Test-Driven Development** — Write tests alongside code, aim for high coverage
3. **Iterative Refinement** — Keep fixing until freebuff validates quality gates
4. **Clear Error Reports** — When blocked, provide root cause and estimated fix time
5. **Comprehensive Testing** — Test edge cases, not just happy path
6. **Code Quality** — Follow project standards, add comments, keep code clean
7. **Merge-Conflict Awareness** — Write code that minimizes merge conflicts with parallel tasks
8. **Honest Reporting** — Don't hide issues or rush completion

### For User

1. **Detailed Initial Requests** — Give freebuff clear requirements for better task decomposition
2. **Review Phase Plans & Task Breakdown** — Approve phase structure before freebuff starts delegating
3. **Quick Decision-Making** — Respond to blockers promptly to avoid delays
4. **Quality Feedback** — If phase rejected, provide specific feedback for rework
5. **Resource Awareness** — Adjust `--max-agents` based on your system specs
6. **Trust Parallelism** — Let freebuff optimize task distribution
7. **Monitor Resource Usage** — Check `multiagent agents` occasionally during execution
8. **Trust the Process** — Let freebuff enforce quality gates, don't skip validation

### Multi-Agent Specific Best Practices

1. **Task Independence** — Design subtasks to be independent when possible, dependent in critical cases
2. **Merge Strategy** — Use code concatenation or module-based organization to avoid conflicts
3. **Shared Resources** — Use shared test fixtures and constants to avoid duplication
4. **Progress Transparency** — Monitor all agents simultaneously with `multiagent status --watch`
5. **Bottleneck Detection** — Watch for agents waiting on dependencies; may indicate task design issues
6. **Scalable Testing** — Write integration tests that work with partial component completion
7. **RAM Headroom** — Always reserve 1-2GB for system; don't max out agents
8. **Graceful Termination** — Let phases complete cleanly; forcefully terminating agents loses work

### Anti-Patterns to Avoid

❌ **Don't rush phase completion** — Ensure all quality gates passed before approving next phase  
❌ **Don't skip testing** — Insufficient test coverage will cause issues in production  
❌ **Don't send vague specs** — "Make it better" is not a valid requirement  
❌ **Don't ignore blockers** — Small issues now become big issues later  
❌ **Don't change requirements mid-phase** — Finish phase first, then plan new phase  
❌ **Don't bypass opencode feedback** — If it reports an issue, there's likely a real problem  
❌ **Don't spawn too many agents** — Keep 1-2GB RAM buffer free for system stability  
❌ **Don't design tasks with circular dependencies** — Ensure dependency graph is acyclic  
❌ **Don't expect instant parallelism gains** — Some phases are sequential by nature

---

---

## QUICK REFERENCE: freebuff vs Multiple opencode Agents

| Aspect | freebuff | opencode (1..N instances) |
|--------|----------|--------------------------|
| **Role** | Agent Manager, Orchestrator | Developer, Implementer |
| **Instances** | 1 (singleton) | N (1..8+, based on RAM) |
| **Trigger** | User command | freebuff task delegation |
| **Responsibility** | Phase planning, task distribution, quality gates | Code, tests, debugging |
| **Parallelism** | Orchestrates N agents | Works independently in parallel |
| **Output** | Phase reports, aggregated results | Code artifacts, test results |
| **Failure Mode** | Blocks on quality gate fail | Reports issues to freebuff |
| **Retry Logic** | Asks agent(s) to fix | Implements fix and re-tests |
| **Success Criteria** | All agents 100% + all tests pass + 0 bugs | Task completion + tests pass |
| **Decision Rights** | Approves/rejects phases | Recommends fixes |

---

## KEY IMPROVEMENTS (v2.0 → Multi-Agent Scale)

### What's New

✨ **Dynamic Agent Spawning** — freebuff spawns 1..N opencode agents based on available RAM  
✨ **Parallel Task Execution** — Multiple tasks run simultaneously (dramatic speedup potential)  
✨ **Load Balancing** — Round-robin task distribution across agents  
✨ **Multi-Agent Communication** — Broadcast task specs, aggregate progress reports  
✨ **Resource Monitoring** — Real-time RAM/CPU tracking with auto-scaling  
✨ **Dependency Management** — Tasks can depend on other tasks (prevents circular waits)  
✨ **Result Aggregation** — Combines test coverage, code files, and metrics from all agents  
✨ **Dynamic Termination** — Gracefully terminate agents when phase completes  

### Performance Gains

- **Sequential Phase (1 agent, 4 tasks):** ~180 minutes
- **Parallel Execution (4 agents, 4 tasks):** ~55 minutes
- **Speedup:** 3.3x faster (69% time saved)
- **Scales with agent count:** 8 agents could theoretically deliver 6-7x speedup

---

**Version:** 2.1 (Multi-Agent Parallel Scale)  
**Last Updated:** July 2026  
**Maintainer:** MultiAgentManager Core Team  
**Architecture:** freebuff (manager) + Multiple opencode (developers) with phase-based, multi-agent execution  
**Status:** Production Ready with Dynamic Resource Management
