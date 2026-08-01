/**
 * GlobalTerminal — Consolidated log stream từ tất cả agents
 * 
 * Hiển thị tất cả logs theo thời gian thực, có filter theo level và task.
 * Click vào log entry → mở floating window tương ứng.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LogEntry as LogEntryComponent, LogCursor, LogData } from './LogEntry';
import LogControls, { LogLevel } from './LogControls';

interface GlobalTerminalProps {
  logs: LogData[];
  tasks: Array<{ id: string; name: string }>;
  onSelectTask: (taskId: string) => void;
  maxLogs?: number;
}

export const GlobalTerminal: React.FC<GlobalTerminalProps> = ({
  logs,
  tasks,
  onSelectTask,
  maxLogs = 1000,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Limit logs to maxLogs
  const limitedLogs = useMemo(() => logs.slice(-maxLogs), [logs, maxLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return limitedLogs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [limitedLogs, levelFilter, searchQuery]);

  const getTaskName = (taskId: string): string | undefined => {
    const task = tasks.find((t) => t.id === taskId);
    return task?.name;
  };

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current || !autoScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 50) {
      setAutoScroll(false);
    }
  };

  const handleCopy = async () => {
    const text = filteredLogs
      .map((l) => {
        const name = getTaskName(l.taskId);
        return `[${new Date(l.timestamp || Date.now()).toLocaleTimeString()}] [${name || l.taskId.slice(0, 8)}] [${l.level.toUpperCase()}] ${l.message}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleClear = () => {
    // Parent handles clearing
  };

  return (
    <div className="h-full bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden flex flex-col backdrop-blur-[1px]">
      {/* Terminal header */}
      <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800/50 flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
        <span className="w-3 h-3 rounded-full bg-red-500/60" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        <span className="ml-2 font-mono">🌐 Global Terminal</span>
        <span className="ml-auto text-slate-600">{logs.length} total / {filteredLogs.length} shown</span>
      </div>

      {/* Controls */}
      <LogControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        autoScroll={autoScroll}
        onAutoScrollToggle={() => setAutoScroll(!autoScroll)}
        onClear={handleClear}
        onCopy={handleCopy}
        logCount={filteredLogs.length}
      />

      {/* Log stream */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed bg-slate-950/80"
      >
        {filteredLogs.map((log, i) => (
          <LogEntryComponent
            key={i}
            log={log}
            taskName={getTaskName(log.taskId)}
            onClick={() => onSelectTask(log.taskId)}
            showTimestamp={true}
            showTaskName={true}
          />
        ))}
        <div ref={logEndRef} />
        {filteredLogs.length > 0 && <LogCursor />}
      </div>
    </div>
  );
};

export default GlobalTerminal;
