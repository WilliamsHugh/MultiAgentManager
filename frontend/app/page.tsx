'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  submitTasks,
} from '@/lib/socket';
import { api, Task, QueueStats, FsEntry } from '@/lib/api';
import { AppLayout } from '@/components/layout/AppLayout';
import { LogData } from '@/components/logs/LogEntry';
import { LogViewer } from '@/components/logs/LogViewer';

const modelOptions = [
  { id: 'auto', label: '🤖 Auto (recommended)' },
  { id: 'gpt-4', label: '🧠 GPT-4' },
  { id: 'gpt-4o', label: '🧠 GPT-4o' },
  { id: 'claude-3', label: '🎯 Claude 3.5 Sonnet' },
  { id: 'deepseek', label: '⚡ DeepSeek V4' },
  { id: 'gemini', label: '🪐 Gemini 2.0' },
];

const DEFAULT_FS_PATH = process.env.NEXT_PUBLIC_DEFAULT_FS_PATH || '';

export default function Dashboard() {
  // ─── State ───
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Record<string, LogData[]>>({});
  const [globalLogs, setGlobalLogs] = useState<LogData[]>([]);
  const [connected, setConnected] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [fsPath, setFsPath] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto');
  const [inputText, setInputText] = useState('');

  // AppLayout refs
  const appLayoutRef = useRef<{ addNotification: (msg: string, type: string) => void } | null>(null);

  // ─── Socket Connection ───
  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('log', (data: LogData) => {
      setLogs(prev => ({
        ...prev,
        [data.taskId]: [...(prev[data.taskId] || []), data],
      }));
    });

    socket.on('task:created', (task: Task) => {
      setTasks(prev => [...prev, task]);
    });

    socket.on('task:updated', (task: Task) => {
      setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));
    });

    socket.on('task:started', (task: Task) => {
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: 'running' } : t))
      );
    });

    socket.on('task:completed', (task: Task) => {
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: 'done' } : t))
      );
    });

    socket.on('task:failed', ({ taskId, error }: { taskId: string; error: string }) => {
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, status: 'error' } : t))
      );
    });

    socket.on('log:global', (data: LogData) => {
      setGlobalLogs(prev => {
        const next = [...prev, data];
        return next.length > 1000 ? next.slice(-1000) : next;
      });
      setLogs(prev => ({
        ...prev,
        [data.taskId]: [...(prev[data.taskId] || []), data],
      }));
    });

    socket.on('task:deleted', ({ id }: { id: string }) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      setLogs(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    socket.on('tasks:submitted', ({ tasks: newTasks }: { tasks: Task[] }) => {
      setTasks(prev => [...prev, ...newTasks]);
    });

    return () => {
      disconnectSocket();
    };
  }, []);

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

  // ─── Handle Submit ───
  const handleSubmit = async (input: string) => {
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
  };

  // ─── Handle Delete ───
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      // Optimistic removal — socket will also confirm
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setLogs(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (err: any) {
      console.error('Failed to delete task:', err.message);
    }
  }, []);

  // ─── Retry connection ───
  const handleRetryConnection = useCallback(() => {
    setConnectionError(null);
    api.getTasks()
      .then(setTasks)
      .catch(err => setConnectionError(err.message));
  }, []);

  return (
    <AppLayout
      tasks={tasks}
      logs={logs}
      globalLogs={globalLogs}
      connected={connected}
      isLoading={isLoading}
      connectionError={connectionError}
      projectName={projectName}
      projectPath={projectPath}
      queueStats={queueStats}
      selectedModel={selectedModel}
      modelOptions={modelOptions}
      onSubmit={handleSubmit}
      onDeleteTask={handleDeleteTask}
      onRetryConnection={handleRetryConnection}
      input={inputText}
      onInputChange={setInputText}
      onProjectNameChange={setProjectName}
      onModelChange={setSelectedModel}
      fsEntries={fsEntries}
      fsPath={fsPath}
      browserOpen={browserOpen}
      onToggleBrowser={() => setBrowserOpen(!browserOpen)}
      onFsPathChange={setFsPath}
      onFsBrowse={async () => {
        try {
          const data = await api.listFs(fsPath || DEFAULT_FS_PATH);
          setFsEntries(data.entries);
          setFsPath(data.currentPath);
        } catch {}
      }}
      onFsSelectParent={async () => {
        const parent = fsPath.substring(0, fsPath.lastIndexOf('/')) || '/';
        try {
          const data = await api.listFs(parent);
          setFsEntries(data.entries);
          setFsPath(data.currentPath);
        } catch {}
      }}
      onFsNavigate={async (path: string) => {
        try {
          const data = await api.listFs(path);
          setFsEntries(data.entries);
          setFsPath(data.currentPath);
        } catch {}
      }}
      onSelectProject={async () => {
        try {
          const result = await api.selectProject(fsPath);
          setProjectPath(result.path);
          const folderName = fsPath.split('/').filter(Boolean).pop() || '';
          setProjectName(folderName);
          setBrowserOpen(false);
        } catch {}
      }}
    />
  );
}
