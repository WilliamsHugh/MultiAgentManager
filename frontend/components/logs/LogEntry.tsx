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
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  timestamp?: string;
}

interface LogEntryProps {
  log: LogData;
  taskName?: string;
  onClick?: () => void;
  showTimestamp?: boolean;
  showTaskName?: boolean;
}

const levelStyles: Record<string, { text: string; badge: string; label: string }> = {
  info: {
    text: 'text-slate-300',
    badge: 'text-iris-400',
    label: 'INFO',
  },
  success: {
    text: 'text-emerald-300',
    badge: 'text-emerald-400',
    label: 'SUCCESS',
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
      <span className={style.badge}>[{style.label}]</span>{' '}
      {log.message}
    </div>
  );
};

export const LogCursor: React.FC = () => (
  <span className="cursor-blink text-slate-600 ml-1">▊</span>
);

export default LogEntry;
