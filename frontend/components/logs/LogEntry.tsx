/**
 * LogEntry — Một dòng log đơn lẻ
 * 
 * Brand colors:
 * - info:    Iris   #6366F1 (primary brand color)
 * - success: Emerald #10B981
 * - warn:    Amber  #F59E0B
 * - error:   Danger #EF4444
 */

import React from 'react';

export interface LogData {
  taskId: string;
  /** Khớp VALID_LEVELS backend: debug|info|warn|error. 'success' đã bị bỏ. */
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: string;
  /** per-run, reset mỗi run (BUG-T5-001). Không dùng đơn lẻ làm React key. */
  seq?: number;
  runIndex?: number;
  stream?: 'stdout' | 'stderr';
  source?: 'opencode' | 'freebuff' | 'orchestrator';
}

interface LogEntryProps {
  log: LogData;
  taskName?: string;
  onClick?: () => void;
  showTimestamp?: boolean;
  showTaskName?: boolean;
}

const levelStyles: Record<string, { text: string; badge: string; label: string }> = {
  debug: {
    text: 'text-slate-500',
    badge: 'text-slate-600',
    label: 'DEBUG',
  },
  info: {
    text: 'text-slate-300',
    badge: 'text-iris-400',
    label: 'INFO',
  },
  warn: {
    text: 'text-amber-300',
    badge: 'text-amber-400',
    label: 'WARN',
  },
  error: {
    text: 'text-red-300',
    badge: 'text-red-400',
    label: 'ERROR',
  },
};

export const LogEntry: React.FC<LogEntryProps> = ({
  log,
  taskName,
  onClick,
  showTimestamp = true,
  showTaskName = true,
}) => {
  const style = levelStyles[log.level] || levelStyles.info;
  const time = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div
      onClick={onClick}
      className={`log-entry cursor-pointer transition-colors hover:bg-slate-800/30 px-1 py-0.5 rounded ${style.text}`}
    >
      {showTimestamp && (
        <span className="text-slate-600 mr-2 font-mono text-[11px]">{time}</span>
      )}
      {showTaskName && taskName && (
        <span className="text-iris-400/70 font-medium mr-1">[{taskName}]</span>
      )}
      {log.source && (
        <span className="text-slate-600 mr-1">[{log.source}]</span>
      )}
      <span className={style.badge}>[{style.label}]</span>{' '}
      {log.stream === 'stderr' && (
        <span className="text-amber-500/70 mr-1" title="stderr">⟩</span>
      )}
      <span className="whitespace-pre-wrap break-words">{log.message}</span>
    </div>
  );
};

export const LogCursor: React.FC = () => (
  <span className="cursor-blink text-slate-600 ml-1">▊</span>
);

export default LogEntry;
