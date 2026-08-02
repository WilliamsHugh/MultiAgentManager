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
  /** Số event bị ring buffer (500/session) của hub loại bỏ. */
  dropped?: number;
}

/**
 * Gán runIndex cho từng dòng log.
 * BUG-T5-001: `seq` là per-run, KHÔNG per-session → CẤM lọc `seq <= lastSeq`.
 * Run mới khi seq tụt (hoặc parent đã set sẵn runIndex). Dedupe chỉ TRONG 1 run.
 */
function withRunIndex(logs: LogData[]): Array<LogData & { runIndex: number; key: string }> {
  const out: Array<LogData & { runIndex: number; key: string }> = [];
  let runIndex = 0;
  let lastSeq = -Infinity;
  let seen = new Set<number>();

  logs.forEach((log, i) => {
    if (typeof log.seq !== 'number') {
      // Không có seq (log legacy) → key theo index, không tham gia run grouping.
      out.push({ ...log, runIndex: log.runIndex ?? runIndex, key: `legacy-${i}` });
      return;
    }
    if (typeof log.runIndex === 'number') {
      if (log.runIndex !== runIndex) {
        runIndex = log.runIndex;
        seen = new Set<number>();
        lastSeq = -Infinity;
      }
    } else if (log.seq < lastSeq) {
      runIndex += 1;
      seen = new Set<number>();
      lastSeq = -Infinity;
    }
    if (seen.has(log.seq)) return; // dedupe chỉ trong run hiện tại
    seen.add(log.seq);
    lastSeq = Math.max(lastSeq, log.seq);
    // Ở đây chỉ có event type='log' (LogData), nên không cần thành phần `type`
    // trong key như indexEvents() ở lib/sessionEvents.ts.
    out.push({ ...log, runIndex, key: `${runIndex}-log-${log.seq}` });
  });
  return out;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  taskId,
  taskName,
  showControls = true,
  maxHeight,
  dropped = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Gán runIndex + key ổn định TRƯỚC khi filter (filter không được phá run grouping)
  const indexedLogs = useMemo(() => withRunIndex(logs), [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return indexedLogs.filter((log) => {
      // Level filter
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      // Search filter
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [indexedLogs, levelFilter, searchQuery]);

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

      {dropped > 0 && (
        <div
          role="status"
          className="px-3 py-1.5 text-[11px] bg-amber-500/10 border-b border-amber-500/30 text-amber-300"
        >
          ⚠ Đã bỏ {dropped} dòng cũ (ring buffer 500 event/session)
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={taskName ? `Log của ${taskName}` : 'Log'}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed bg-slate-950"
        style={{ maxHeight }}
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, i) => {
            const prev = filteredLogs[i - 1];
            const newRun = i > 0 && prev.runIndex !== log.runIndex;
            return (
              <React.Fragment key={log.key}>
                {newRun && (
                  <div className="flex items-center gap-2 my-2" role="separator">
                    <span className="sr-only">Run {log.runIndex + 1}</span>
                    <div className="flex-1 border-t border-slate-800" aria-hidden="true" />
                    <span
                      className="text-[10px] uppercase tracking-wider text-slate-500"
                      aria-hidden="true"
                    >
                      Run #{log.runIndex + 1}
                    </span>
                    <div className="flex-1 border-t border-slate-800" aria-hidden="true" />
                  </div>
                )}
                <LogEntryComponent
                  log={log}
                  taskName={taskName}
                  showTimestamp={true}
                  showTaskName={false}
                />
              </React.Fragment>
            );
          })
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
