/**
 * REST API Client - Giao tiếp với Backend Server
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

let authToken: string | null = null;

export interface User {
  id: string;
  username: string;
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Auto-attach auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      headers,
      ...options,
    });
  } catch (err) {
    throw new Error(
      `Cannot connect to backend server. Make sure the server is running at ${API_URL}`
    );
  }

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
  setAuthToken(token: string) {
    authToken = token;
  },

  clearAuthToken() {
    authToken = null;
  },

  // Health
  health: () => fetchAPI<{ status: string; timestamp: string; uptime: number }>('/health'),

  // Auth
  login: (username: string, password: string) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    fetchAPI<{ message: string; user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

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
