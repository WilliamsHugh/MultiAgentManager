/**
 * LogViewer — Per-task log viewer với search, filter, auto-scroll
 * 
 * Hiển thị logs cho một task cụ thể trong floating window.
 * Tích hợp LogControls cho search/filter.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { LogEntry as LogEntryComponent, LogCursor, LogData } from './LogEntry';
import LogControls, { LogLevel } from './LogControls';

interface LogViewerProps {
  logs: LogData[];
  taskId: string;
  taskName?: string;
  showControls?: boolean;
  maxHeight?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  taskId,
  taskName,
  showControls = true,
  maxHeight,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Level filter
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      // Search filter
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [logs, levelFilter, searchQuery]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, autoScroll]);

  // Detect manual scroll → pause auto-scroll
  const handleScroll = () => {
    if (!containerRef.current || !autoScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isNearBottom) {
      setAutoScroll(false);
    }
  };

  const handleCopy = async () => {
    const text = filteredLogs
      .map((l) => `[${new Date(l.timestamp || Date.now()).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleClear = () => {
    // Clear is handled by parent (clear all logs for this task)
  };

  return (
    <div className="flex flex-col h-full">
      {showControls && (
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
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-slate-950"
        style={{ maxHeight }}
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, i) => (
            <LogEntryComponent
              key={i}
              log={log}
              taskName={taskName}
              showTimestamp={true}
              showTaskName={false}
            />
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-500 text-xs">
                {searchQuery || levelFilter !== 'all'
                  ? 'No logs match your filter'
                  : 'Waiting for logs...'}
              </p>
            </div>
          </div>
        )}
        <div ref={logEndRef} />
        {filteredLogs.length > 0 && <LogCursor />}
      </div>
    </div>
  );
};

export default LogViewer;
