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

// ─── Icons (inline SVGs) ───
const icons = {
  terminal: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  loader: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  ),
  gitBranch: (props: any) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      case 'running': return <icons.loader className="w-4 h-4 animate-spin" />;
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
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* ─── Sidebar ─── */}
      <aside className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden flex-shrink-0`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <icons.terminal className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold tracking-tight">
              Multi<span className="text-cyan-400">Agent</span>
            </h1>
            <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'}`} />
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
                    ? 'bg-slate-800 border-slate-600 shadow-md'
                    : 'bg-slate-800/50 border-transparent hover:bg-slate-800/80 hover:border-slate-700'
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
              <span>📋 Queue: {queueStats.queueLength}</span>
              <span>⚡ Run: {queueStats.running}</span>
              <span>✅ Done: {queueStats.completed}</span>
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
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="w-48 px-3 py-1.5 bg-slate-800 rounded text-sm text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
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
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-all duration-200 flex items-center gap-1.5 active:scale-95"
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
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-slate-950">
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
                    <span className="cursor-blink text-slate-600 ml-1">▊</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg">
                <icons.terminal className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-500 mb-2">
                  Multi-Agent Manager
                </h2>
                <p className="text-slate-600 text-sm max-w-md mx-auto">
                  Submit a task to start. The system will use <span className="text-cyan-400">freebuff</span> to plan and{' '}
                  <span className="text-emerald-400">opencode</span> workers to execute tasks in parallel using isolated Git Worktrees.
                </p>
                <div className="mt-6 flex gap-4 justify-center text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {connected ? 'Connected' : 'Disconnected'}
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                    <icons.gitBranch className="w-3.5 h-3.5" />
                    Git Worktree
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                    <icons.loader className="w-3.5 h-3.5" />
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
            className={`notification-enter px-4 py-2 rounded-lg shadow-lg text-sm backdrop-blur-sm ${
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
