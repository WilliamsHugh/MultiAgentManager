/**
 * Canvas — Desktop workspace chứa các floating agent windows
 * 
 * Vai trò:
 * - Container cho FloatingWindows (foreground) — mỗi window chứa LogViewer
 * - Background global terminal
 * - Welcome screen khi chưa có tasks
 * - Connection error screen
 */

import React from 'react';
import { FloatingWindow, WindowState } from './FloatingWindow';
import { LogViewer } from '../logs/LogViewer';
import { TaskStatus } from '../common/StatusBadge';
import { LogData } from '../logs/LogEntry';
import { TerminalIcon, GitBranchIcon, LoaderIcon } from '../common/Icons';

interface CanvasProps {
  backgroundContent?: React.ReactNode;
  windows: WindowState[];
  tasks: Array<{ id: string; name: string; status: TaskStatus }>;
  taskLogs: Record<string, LogData[]>;
  connected: boolean;
  activeTaskId: string | null;
  onDragStart: (e: React.MouseEvent, taskId: string) => void;
  onResizeStart: (e: React.MouseEvent, taskId: string) => void;
  onFocus: (taskId: string) => void;
  onMinimize: (taskId: string) => void;
  onClose: (taskId: string) => void;
  onMaximize: (taskId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  backgroundContent,
  windows,
  tasks,
  taskLogs,
  connected,
  onDragStart,
  onResizeStart,
  onFocus,
  onMinimize,
  onClose,
  onMaximize,
}) => {
  const getTaskInfo = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    return {
      name: task?.name || taskId.slice(0, 8),
      status: task?.status || ('pending' as TaskStatus),
    };
  };

  return (
    <div className="flex-1 relative overflow-hidden p-4">
      {/* Background layer */}
      <div className="absolute inset-4">
        {backgroundContent || (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <TerminalIcon className="w-16 h-16 mx-auto mb-4 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-500 mb-2">
                Multi-Agent Manager
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Submit a task to start. The system will use{' '}
                <span className="text-iris-400">freebuff</span> to plan and{' '}
                <span className="text-emerald-400">opencode</span> workers.
              </p>
              <div className="mt-6 flex gap-4 justify-center text-xs text-slate-600">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                  <span
                    className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}
                  />
                  {connected ? 'Connected' : 'Disconnected'}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                  <GitBranchIcon className="w-3.5 h-3.5" /> Git Worktree
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-full">
                  <LoaderIcon className="w-3.5 h-3.5" /> Workers: 4
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating windows (foreground) — mỗi window chứa LogViewer */}
      {windows.map((win) => {
        const info = getTaskInfo(win.taskId);
        const winLogs = taskLogs[win.taskId] || [];
        return (
          <FloatingWindow
            key={win.taskId}
            state={win}
            taskName={info.name}
            taskStatus={info.status}
            logLines={winLogs.length}
            onDragStart={onDragStart}
            onResizeStart={onResizeStart}
            onFocus={onFocus}
            onMinimize={onMinimize}
            onClose={onClose}
            onMaximize={onMaximize}
          >
            <LogViewer
              logs={winLogs}
              taskId={win.taskId}
              taskName={info.name}
              showControls={true}
            />
          </FloatingWindow>
        );
      })}

      {/* Instructions overlay */}
      {windows.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 text-xs text-slate-400 shadow-lg whitespace-nowrap">
          💡 Click a task in the sidebar or a log entry to open a floating window
        </div>
      )}
    </div>
  );
};

export default Canvas;
