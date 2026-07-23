# 🎨 TASK 3: Frontend Dashboard - Next.js 15

**Phụ trách:** Dev 3  
**Worktree:** `wt_frontend`  
**Công nghệ:** Next.js 15, React 19, TypeScript, Tailwind CSS, Socket.IO Client

---

## 📋 Mục Tiêu

Xây dựng **Dashboard UI** bằng Next.js - giao diện trực quan để người dùng:
1. Nhập yêu cầu và submit task
2. Xem real-time log từ workers (giống terminal)
3. Theo dõi trạng thái task (pending → running → done/error)
4. Quản lý Git Worktree và branch
5. Xem lịch sử task và logs

---

## 📁 File Cần Tạo

### 1. `frontend/package.json`

```json
{
  "name": "multi-agent-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.8.0",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 2. `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

### 3. `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 4. `frontend/lib/socket.ts`

```typescript
/**
 * Socket.IO Client - Kết nối tới Backend Server
 * Quản lý real-time communication
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export interface LogEntry {
  taskId: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  timestamp?: string;
}

export interface TaskEvent {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  [key: string]: any;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinTaskRoom(taskId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('join:task', taskId);
  }
}

export function leaveTaskRoom(taskId: string): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave:task', taskId);
  }
}

export function submitTasks(data: {
  project_name: string;
  tasks: Array<{
    name: string;
    description: string;
    prompt: string;
    worktreePath?: string;
    branchName?: string;
  }>;
}): void {
  const s = getSocket();
  if (s.connected) {
    s.emit('task:submit', data);
  }
}
```

### 5. `frontend/lib/api.ts`

```typescript
/**
 * REST API Client - Giao tiếp với Backend Server
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }

  return res.json();
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description: string;
  assigned_worker: string;
  worktree_path: string;
  branch_name: string;
  prompt: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'done' | 'error';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  exit_code?: number;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface LogEntry {
  id: number;
  task_id: string;
  level: string;
  message: string;
  source: string;
  timestamp: string;
}

export interface QueueStats {
  queueLength: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export const api = {
  // Health
  health: () => fetchAPI<{ status: string }>('/health'),

  // Projects
  getProjects: () => fetchAPI<Project[]>('/projects'),
  createProject: (name: string) =>
    fetchAPI<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  // Tasks
  getTasks: (projectId?: string) => {
    const params = projectId ? `?project_id=${projectId}` : '';
    return fetchAPI<Task[]>(`/tasks${params}`);
  },
  getTask: (id: string) => fetchAPI<Task>(`/tasks/${id}`),
  updateTaskStatus: (id: string, status: string, exitCode?: number) =>
    fetchAPI<Task>(`/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, exit_code: exitCode }),
    }),

  // Logs
  getLogs: (taskId: string, limit = 100) =>
    fetchAPI<LogEntry[]>(`/tasks/${taskId}/logs?limit=${limit}`),

  // Queue
  getQueueStats: () => fetchAPI<QueueStats>('/queue/stats'),
};
```

### 6. `frontend/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Multi-Agent Manager',
  description: 'Dashboard quản lý hệ thống Multi-Agent với Freebuff + Opencode',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 7. `frontend/app/globals.css`

```css
@import "tailwindcss";

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Terminal animation */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.cursor-blink {
  animation: blink 1s step-end infinite;
}

/* Log fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.log-entry {
  animation: fadeIn 0.2s ease-out;
}
```

### 8. `frontend/app/page.tsx`

```tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  LogEntry,
  TaskEvent,
  submitTasks,
} from '@/lib/socket';
import { api, Task, Project, QueueStats } from '@/lib/api';

// ─── Icons (inline SVGs - không cần thư viện) ───
const icons = {
  terminal: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  play: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  check: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  loader: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  ),
  gitBranch: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  ),
};

export default function Dashboard() {
  // ─── State ───
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: string}>>([]);

  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Socket Connection ───
  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      addNotification('Connected to server', 'success');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addNotification('Disconnected from server', 'error');
    });

    socket.on('log', (data: LogEntry) => {
      setLogs(prev => ({
        ...prev,
        [data.taskId]: [...(prev[data.taskId] || []), data],
      }));
    });

    socket.on('task:created', (task: Task) => {
      setTasks(prev => [...prev, task]);
      addNotification(`Task created: ${task.name}`, 'info');
    });

    socket.on('task:updated', (task: Task) => {
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? task : t))
      );
    });

    socket.on('task:started', (task: Task) => {
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: 'running' } : t))
      );
      addNotification(`Task started: ${task.name}`, 'info');
    });

    socket.on('task:completed', (task: Task) => {
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: 'done' } : t))
      );
      addNotification(`Task completed: ${task.name}`, 'success');
    });

    socket.on('task:failed', ({ taskId, error }: { taskId: string; error: string }) => {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: 'error' } : t))
      );
      addNotification(`Task failed: ${error}`, 'error');
    });

    socket.on('tasks:submitted', ({ tasks: newTasks }: { tasks: Task[] }) => {
      setTasks(prev => [...prev, ...newTasks]);
      addNotification(`${newTasks.length} tasks submitted!`, 'success');
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  // ─── Auto-scroll logs ───
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ─── Load existing tasks on mount ───
  useEffect(() => {
    api.getTasks().then(setTasks).catch(console.error);
    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueStats = async () => {
    try {
      const stats = await api.getQueueStats();
      setQueueStats(stats);
    } catch {}
  };

  // ─── Notifications ───
  const addNotification = useCallback((message: string, type: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  // ─── Handle Submit ───
  const handleSubmit = async () => {
    if (!input.trim()) return;

    const name = projectName.trim() || `Project ${Date.now()}`;
    
    submitTasks({
      project_name: name,
      tasks: [
        {
          name: name,
          description: input,
          prompt: input,
        },
      ],
    });

    setInput('');
    addNotification('Task submitted!', 'success');
  };

  // ─── Get status color ───
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'done': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'error': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <icons.loader className="w-4 h-4" />;
      case 'done': return <icons.check className="w-4 h-4" />;
      case 'error': return <icons.x className="w-4 h-4" />;
      default: return <icons.terminal className="w-4 h-4" />;
    }
  };

  // ─── Selected task logs ───
  const selectedLogs = activeTaskId ? logs[activeTaskId] || [] : [];

  // ─── Stats ───
  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'running').length,
    done: tasks.filter(t => t.status === 'done').length,
    error: tasks.filter(t => t.status === 'error').length,
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <icons.terminal className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold tracking-tight">
              Multi<span className="text-cyan-400">Agent</span>
            </h1>
            <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <div className="bg-slate-800/50 rounded p-1.5 text-center">
              <div className="text-slate-400">Total</div>
              <div className="font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-800/50 rounded p-1.5 text-center">
              <div className="text-yellow-400">Run</div>
              <div className="font-bold text-yellow-400">{stats.running}</div>
            </div>
            <div className="bg-slate-800/50 rounded p-1.5 text-center">
              <div className="text-emerald-400">Done</div>
              <div className="font-bold text-emerald-400">{stats.done}</div>
            </div>
            <div className="bg-slate-800/50 rounded p-1.5 text-center">
              <div className="text-red-400">Err</div>
              <div className="font-bold text-red-400">{stats.error}</div>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">
              <icons.terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No tasks yet
            </div>
          ) : (
            tasks.map(task => (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  activeTaskId === task.id
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-slate-800/50 border-transparent hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{getStatusIcon(task.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{task.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {task.branch_name ? (
                        <span className="flex items-center gap-1">
                          <icons.gitBranch className="w-3 h-3" />
                          {task.branch_name}
                        </span>
                      ) : (
                        new Date(task.created_at).toLocaleTimeString()
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-xs text-slate-600">
          {queueStats && (
            <div className="flex justify-between">
              <span>Queue: {queueStats.queueLength}</span>
              <span>Running: {queueStats.running}</span>
              <span>Done: {queueStats.completed}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-6 py-3 border-b border-slate-800 flex items-center gap-4 bg-slate-900/50 backdrop-blur-sm">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex-1 flex gap-2">
            <input
              ref={inputRef}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name (optional)"
              className="w-48 px-3 py-1.5 bg-slate-800 rounded text-sm text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Describe what you want the agents to do..."
              className="flex-1 px-4 py-1.5 bg-slate-800 rounded text-sm text-slate-200 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || !connected}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
            >
              <icons.play className="w-4 h-4" />
              Run
            </button>
          </div>
        </header>

        {/* Log Viewer */}
        <div className="flex-1 overflow-hidden p-4">
          {(activeTaskId && selectedLogs.length > 0) ? (
            <div className="h-full bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
              {/* Terminal Header */}
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono">
                  {tasks.find(t => t.id === activeTaskId)?.name || 'Terminal'}
                </span>
                <span className="ml-auto text-slate-600">
                  {selectedLogs.length} lines
                </span>
              </div>

              {/* Log Content */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
                {selectedLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`log-entry ${
                      log.level === 'error'
                        ? 'text-red-400'
                        : log.level === 'warn'
                        ? 'text-yellow-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 mr-2">
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
                    </span>
                    <span className={log.level === 'error' ? 'text-red-400' : 'text-cyan-400'}>
                      [{log.level.toUpperCase()}]
                    </span>
                    {' '}{log.message}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <icons.terminal className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-500 mb-2">
                  Multi-Agent Manager
                </h2>
                <p className="text-slate-600 text-sm max-w-md">
                  Submit a task to start. The system will use freebuff to plan and 
                  opencode workers to execute tasks in parallel using isolated Git Worktrees.
                </p>
                <div className="mt-6 flex gap-4 justify-center text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {connected ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <icons.gitBranch className="w-3.5 h-3.5" />
                    Git Worktree
                  </div>
                  <div>
                    Workers: 4
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Notifications ─── */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-sm backdrop-blur-sm transition-all duration-300 animate-in ${
              n.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : n.type === 'error'
                ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 9. `frontend/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### 10. `frontend/.env.local`

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🎯 Yêu Cầu Hoàn Thành

1. ✅ Tạo đủ các file trong `frontend/`
2. ✅ npm install và chạy được dev server
3. ✅ Giao diện hiển thị Task list
4. ✅ Real-time log streaming từ WebSocket
5. ✅ Task submission form
6. ✅ Trạng thái kết nối indicator
7. ✅ Responsive layout

---

## 📤 Giao Tiếp Với Các Dev Khác

- **Nhận từ Dev 2**: Socket.IO events (`log`, `task:updated`, `task:completed`) qua `http://localhost:3001`
- **Gọi API từ Dev 2**: REST endpoints qua `http://localhost:3001/api`
- **Hiển thị cho user**: Giao diện trực quan, notifications

---

## 🔗 Phụ Thuộc

- Dev 3 cần **Dev 2** hoàn thành backend server
- Nếu Dev 2 chưa xong, có thể mock data để test UI

---

## 📝 Hướng Dẫn Kiểm Thử

```bash
cd frontend
npm install
npm run dev
# Mở http://localhost:3000
```

*Happy coding! 🚀*
