/**
 * Socket.IO Client - Kết nối tới Backend Server
 * Quản lý real-time communication
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

// Wire contract của session log: xem lib/sessionEvents.ts (khớp validateEvent()).
export type {
  SessionEvent,
  SessionLogEvent,
  SessionStatusEvent,
  IndexedEvent,
  EventLevel,
  EventSource,
  EventStream,
  EventState,
} from './sessionEvents';

export interface LogEntry {
  taskId: string;
  /** Khớp VALID_LEVELS của session_log_hub.js: debug|info|warn|error (KHÔNG có 'success'). */
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: string;
  /** per-run, KHÔNG per-session — xem BUG-T5-001. */
  seq?: number;
  ts?: number;
  stream?: 'stdout' | 'stderr';
  source?: 'opencode' | 'freebuff' | 'orchestrator';
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
  model?: string;
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
