'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  LogEntry,
  submitTasks,
} from '@/lib/socket';
import { api, Task, Project, QueueStats, FsEntry } from '@/lib/api';

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
  // ─── Floating Window State ───
  interface TaskWindow {
    taskId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  }
  const [taskWindows, setTaskWindows] = useState<TaskWindow[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(10);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [notifications, setNotifications] = useState<Array<{id: string; message: string; type: string}>>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [globalLogs, setGlobalLogs] = useState<LogEntry[]>([]);
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [fsPath, setFsPath] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const modelOptions = [
    { id: 'auto', label: '🤖 Auto (recommended)' },
    { id: 'gpt-4', label: '🧠 GPT-4' },
    { id: 'gpt-4o', label: '🧠 GPT-4o' },
    { id: 'claude-3', label: '🎯 Claude 3.5 Sonnet' },
    { id: 'deepseek', label: '⚡ DeepSeek V4' },
    { id: 'gemini', label: '🪐 Gemini 2.0' },
  ];
  const DEFAULT_FS_PATH = process.env.NEXT_PUBLIC_DEFAULT_FS_PATH || '';

  const logEndRef = useRef<HTMLDivElement>(null);
  const wLogEndRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

    socket.on('log:global', (data: LogEntry) => {
      // Global terminal
      setGlobalLogs(prev => {
        const next = [...prev, data];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
      // Per-task logs (khi click vào task cụ thể)
      setLogs(prev => ({
        ...prev,
        [data.taskId]: [...(prev[data.taskId] || []), data],
      }));
    });

    socket.on('tasks:submitted', ({ tasks: newTasks }: { tasks: Task[] }) => {
      setTasks(prev => [...prev, ...newTasks]);
      addNotification(`${newTasks.length} tasks submitted!`, 'success');
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  // ─── Auto-scroll logs (global + floating windows) ───
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Scroll active floating window
    if (activeTaskId && wLogEndRefs.current[activeTaskId]) {
      wLogEndRefs.current[activeTaskId]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, globalLogs, activeTaskId]);

  // ─── Load existing tasks on mount ───
  useEffect(() => {
    setIsLoading(true);
    api.getTasks()
      .then(tasks => {
        setTasks(tasks);
        setConnectionError(null);
      })
      .catch(err => {
        console.error('Failed to load tasks:', err.message);
        setConnectionError(err.message);
      })
      .finally(() => setIsLoading(false));
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
      model: selectedModel !== 'auto' ? selectedModel : undefined,
      tasks: [
        {
          name: name,
          description: input,
          prompt: input,
          worktreePath: projectPath || undefined,
          branchName: `task-${Date.now()}`,
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

  // ─── Window drag handlers (RAF-throttled) ───
  useEffect(() => {
    let rafId: number | null = null;
    let lastDx = 0;
    let lastDy = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      lastDx = e.clientX - dragRef.current.startX;
      lastDy = e.clientY - dragRef.current.startY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const dr = dragRef.current;
          if (!dr) return;
          setTaskWindows(prev => prev.map(w =>
            w.taskId === dr.id
              ? { ...w, x: Math.max(0, dr.origX + lastDx), y: Math.max(0, dr.origY + lastDy) }
              : w
          ));
        });
      }
    };
    const handleMouseUp = () => {
      dragRef.current = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const bringToFront = (taskId: string) => {
    setNextZIndex(z => z + 1);
    setTaskWindows(prev => prev.map((w, _, arr) =>
      w.taskId === taskId
        ? { ...w, zIndex: Math.max(...arr.map(x => x.zIndex)) + 1 }
        : w
    ));
    setActiveTaskId(taskId);
  };

  const closeWindow = (taskId: string) => {
    setTaskWindows(prev => prev.filter(w => w.taskId !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
  };

  const startDrag = (e: React.MouseEvent, taskId: string, win: TaskWindow) => {
    e.preventDefault();
    bringToFront(taskId);
    dragRef.current = {
      id: taskId,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
  };

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
            <button
              onClick={() => setBrowserOpen(!browserOpen)}
              className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Browse project folder"
            >
              {projectPath ? 'Change' : 'Select'} Project
            </button>
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

        {/* Project Browser */}
        {browserOpen && (
          <div className="p-2 border-b border-slate-800">
            <div className="flex items-center gap-1 mb-2">
              <input
                value={fsPath}
                onChange={e => setFsPath(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    try {
                      const data = await api.listFs(fsPath || DEFAULT_FS_PATH);
                      setFsEntries(data.entries);
                      setFsPath(data.currentPath);
                    } catch {}
                  }
                }}
                placeholder="/path/to/project"
                className="flex-1 px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={async () => {
                  try {
                    const data = await api.listFs(fsPath || DEFAULT_FS_PATH);
                    setFsEntries(data.entries);
                    setFsPath(data.currentPath);
                  } catch {}
                }}
                className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
              >
                Browse
              </button>
            </div>

            {/* Select current folder button */}
            {fsPath && (
              <button
                onClick={async () => {
                  try {
                    const result = await api.selectProject(fsPath);
                    setProjectPath(result.path);
                    // Auto-fill project name from folder name
                    const folderName = fsPath.split('/').filter(Boolean).pop() || '';
                    setProjectName(folderName);
                    setBrowserOpen(false);
                    addNotification(`✅ Project: ${folderName} selected`, 'success');
                  } catch (err: any) {
                    addNotification(`❌ ${err.message}`, 'error');
                  }
                }}
                className="w-full mb-2 px-2 py-1.5 text-xs font-medium bg-emerald-600/80 hover:bg-emerald-500 rounded border border-emerald-500/30 text-emerald-200 transition-all duration-200 active:scale-[0.98]"
              >
                📂 Select this folder as project
              </button>
            )}

            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {fsPath && (
                <button
                  onClick={async () => {
                    const parent = fsPath.substring(0, fsPath.lastIndexOf('/')) || '/';
                    try {
                      const data = await api.listFs(parent);
                      setFsEntries(data.entries);
                      setFsPath(data.currentPath);
                    } catch {}
                  }}
                  className="w-full text-left px-2 py-1 text-xs text-slate-500 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
                >
                  .. (up)
                </button>
              )}
              {fsEntries.map(entry => (
                <button
                  key={entry.path}
                  onClick={async () => {
                    if (entry.isDirectory) {
                      try {
                        const data = await api.listFs(entry.path);
                        setFsEntries(data.entries);
                        setFsPath(data.currentPath);
                      } catch {}
                    }
                    // Files: do nothing (clicking a directory navigates, click "Select folder" to confirm)
                  }}
                  className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                    entry.isDirectory
                      ? 'text-cyan-400 hover:bg-cyan-400/10'
                      : 'text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  {entry.isDirectory ? '📁' : '📄'} {entry.name}
                </button>
              ))}
            </div>
            {projectPath && (
              <div className="mt-2 text-[10px] text-emerald-400/70 truncate">
                📌 {projectPath}
              </div>
            )}
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-3 rounded-lg bg-slate-800/30">
                  <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700/30 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">
              <icons.terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No tasks yet
            </div>
          ) : (
            tasks.map(task => (
              <button
                key={task.id}
                onClick={() => {
                  // Tìm window của task
                  const existing = taskWindows.find(w => w.taskId === task.id);
                  if (existing) {
                    // Focus window: đưa lên trên cùng
                    setNextZIndex(z => z + 1);
                    setTaskWindows(prev => prev.map(w =>
                      w.taskId === task.id ? { ...w, zIndex: nextZIndex + 1 } : w
                    ));
                    setActiveTaskId(task.id);
                  } else {
                    // Tạo window mới với vị trí cascade
                    const offset = (taskWindows.length % 8) * 24;
                    const newWindow: TaskWindow = {
                      taskId: task.id,
                      x: 40 + offset,
                      y: 40 + offset,
                      width: 480,
                      height: 320,
                      zIndex: nextZIndex,
                    };
                    setNextZIndex(z => z + 1);
                    setTaskWindows(prev => [...prev, newWindow]);
                    setActiveTaskId(task.id);
                  }
                }}
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
        </div>          {/* Sidebar Footer - Model Selector + Stats */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              AI Manager
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700 text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
            >
              {modelOptions.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Queue Stats */}
          {queueStats && (
            <div className="flex justify-between text-xs text-slate-600">
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
              className="w-44 px-3 py-1.5 bg-slate-800 rounded text-sm text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
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

        {/* ─── Log Canvas (Desktop-like floating windows) ─── */}
        <div className="flex-1 relative overflow-hidden p-4">
          {/* Background: Global Terminal / Welcome */}
          <div className="absolute inset-4">
            {connectionError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <icons.x className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
                  <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">{connectionError}</p>
                  <button onClick={() => { setConnectionError(null); api.getTasks().then(setTasks).catch(err => setConnectionError(err.message)); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">Try Again</button>
                </div>
              </div>
            ) : globalLogs.length > 0 ? (
              <div className="h-full bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden flex flex-col backdrop-blur-[1px]">
                <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800/50 flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                  <span className="ml-2 font-mono">🌐 Global Terminal</span>
                  <span className="ml-auto text-slate-600">{globalLogs.length} lines</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-slate-950/80">
                  {globalLogs.map((log, i) => {
                    const taskName = tasks.find(t => t.id === log.taskId)?.name || log.taskId.slice(0, 8);
                    return (
                      <div key={i}
                        onClick={() => {
                          const existing = taskWindows.find(w => w.taskId === log.taskId);
                          if (existing) bringToFront(log.taskId);
                          else {
                            const offset = (taskWindows.length % 8) * 24;
                            setNextZIndex(z => z + 1);
                            setTaskWindows(prev => [...prev, {
                              taskId: log.taskId, x: 40 + offset, y: 40 + offset,
                              width: 480, height: 320, zIndex: nextZIndex
                            }]);
                            setActiveTaskId(log.taskId);
                          }
                        }}
                        className={`log-entry cursor-pointer transition-colors hover:bg-slate-800/30 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-slate-300'}`}>
                        <span className="text-slate-600 mr-2">{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                        <span className="text-cyan-500/70 font-medium">[{taskName}]</span>
                        <span className={log.level === 'error' ? 'text-red-400' : 'text-violet-400'}>[{log.level.toUpperCase()}]</span>
                        {' '}{log.message}<span className="cursor-blink text-slate-600 ml-1">▊</span>
                      </div>
                    );
                  })}
                  <div ref={logEndRef} />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <icons.terminal className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                  <h2 className="text-xl font-semibold text-slate-500 mb-2">Multi-Agent Manager</h2>
                  <p className="text-slate-600 text-sm max-w-md mx-auto">
                    Submit a task to start. The system will use <span className="text-cyan-400">freebuff</span> to plan and{' '}
                    <span className="text-emerald-400">opencode</span> workers.
                  </p>
                  <div className="mt-6 flex gap-4 justify-center text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {connected ? 'Connected' : 'Disconnected'}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                      <icons.gitBranch className="w-3.5 h-3.5" /> Git Worktree
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                      <icons.loader className="w-3.5 h-3.5" /> Workers: 4
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Foreground: Floating Windows */}
          {taskWindows.map(win => {
            const task = tasks.find(t => t.id === win.taskId);
            const taskLogs = logs[win.taskId] || [];
            return (
              <div
                key={win.taskId}
                onMouseDown={() => bringToFront(win.taskId)}
                style={{
                  position: 'absolute',
                  left: win.x,
                  top: win.y,
                  width: win.width,
                  height: win.height,
                  zIndex: win.zIndex,
                }}
                className="bg-slate-900 rounded-xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-shadow hover:shadow-cyan-500/5"
              >
                {/* Window Title Bar (draggable) */}
                <div
                  onMouseDown={(e) => startDrag(e, win.taskId, win)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 cursor-grab active:cursor-grabbing select-none"
                >
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="ml-1">{getStatusIcon(task?.status || 'pending')}</span>
                  <span className="text-xs font-medium text-slate-200 truncate flex-1">
                    {task?.name || win.taskId.slice(0, 8)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getStatusColor(task?.status || 'pending')}`}>
                    {task?.status || 'pending'}
                  </span>
                  <span className="text-[10px] text-slate-600">{taskLogs.length} lines</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeWindow(win.taskId); }}
                    className="ml-1 p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
                  >
                    <icons.x className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Window Content */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-slate-950">
                  {taskLogs.length > 0 ? (
                    taskLogs.map((log, i) => (
                      <div key={i} className={`log-entry ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-slate-300'}`}>
                        <span className="text-slate-600 mr-2">{new Date(log.timestamp || Date.now()).toLocaleTimeString()}</span>
                        <span className={log.level === 'error' ? 'text-red-400' : 'text-cyan-400'}>[{log.level.toUpperCase()}]</span>
                        {' '}{log.message}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <icons.loader className="w-6 h-6 mx-auto mb-2 text-slate-600 animate-spin" />
                        <p className="text-slate-500 text-xs">Waiting for logs...</p>
                      </div>
                    </div>
                  )}
                  <div ref={el => { wLogEndRefs.current[win.taskId] = el; }} />
                </div>
              </div>
            );
          })}

          {/* Instructions overlay (first time) */}
          {taskWindows.length === 0 && globalLogs.length > 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 text-xs text-slate-400 shadow-lg">
              💡 Click a task in the sidebar or a log entry above to open a floating window
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
