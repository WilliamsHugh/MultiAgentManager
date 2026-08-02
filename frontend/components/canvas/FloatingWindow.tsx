/**
 * FloatingWindow — Desktop-style floating window cho mỗi AI agent
 * 
 * Features:
 * - Kéo thả (drag) bằng title bar
 * - Resize (kéo góc dưới phải)
 * - Minimize (thu gọn xuống chỉ còn title bar)
 * - Close (đóng window)
 * - Traffic light buttons (giống macOS)
 * - Focus (click → bring to front)
 * 
 * Brand colors:
 * - Active border: Iris #6366F1 (hover glow)
 * - Traffic lights: Red/Yellow/Green
 * - Status: Emerald (done), Amber (running), Danger (error)
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { XIcon, LoaderIcon, CheckIcon, TerminalIcon, MinimizeIcon, MaximizeIcon } from '../common/Icons';
import { TaskStatus, getStatusColor } from '../common/StatusBadge';

export interface WindowState {
  taskId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
}

interface FloatingWindowProps {
  state: WindowState;
  taskName: string;
  taskStatus: TaskStatus;
  logLines: number;
  onDragStart: (e: React.MouseEvent, taskId: string) => void;
  onResizeStart: (e: React.MouseEvent, taskId: string) => void;
  onFocus: (taskId: string) => void;
  onMinimize: (taskId: string) => void;
  onClose: (taskId: string) => void;
  onMaximize: (taskId: string) => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  state,
  taskName,
  taskStatus,
  logLines,
  onDragStart,
  onResizeStart,
  onFocus,
  onMinimize,
  onClose,
  onMaximize,
  children,
}) => {
  const windowRef = useRef<HTMLDivElement>(null);

  // Click anywhere → focus
  const handleMouseDown = useCallback(() => {
    onFocus(state.taskId);
  }, [onFocus, state.taskId]);

  // Get status icon
  const getIcon = () => {
    switch (taskStatus) {
      case 'running': return <LoaderIcon className="w-3.5 h-3.5 animate-spin" />;
      case 'done': return <CheckIcon className="w-3.5 h-3.5" />;
      case 'error': return <XIcon className="w-3.5 h-3.5" />;
      default: return <TerminalIcon className="w-3.5 h-3.5" />;
    }
  };

  const statusColorClass = getStatusColor(taskStatus);

  return (
    <div
      ref={windowRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: state.x,
        top: state.y,
        width: state.width,
        height: state.minimized ? 40 : state.height,
        zIndex: state.zIndex,
      }}
      className="bg-slate-900 rounded-xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-iris-500/5 group"
    >
      {/* Title Bar (draggable) */}
      <div
        onMouseDown={(e) => onDragStart(e, state.taskId)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border-b border-slate-700 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
      >
        {/* Traffic lights */}
        <div className="flex gap-1.5 mr-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(state.taskId); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-iris-400"
            title="Close"
            aria-label={`Close ${taskName || state.taskId}`}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMinimize(state.taskId); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-iris-400"
            title="Minimize"
            aria-label={`Minimize ${taskName || state.taskId}`}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMaximize(state.taskId); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-iris-400"
            title="Maximize"
            aria-label={`Maximize ${taskName || state.taskId}`}
          />
        </div>

        {/* Task icon */}
        <span className="ml-1 flex-shrink-0">{getIcon()}</span>

        {/* Task name */}
        <span className="text-xs font-medium text-slate-200 truncate flex-1">
          {taskName || state.taskId.slice(0, 8)}
        </span>

        {/* Status badge */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusColorClass} flex-shrink-0`}>
          {taskStatus}
        </span>

        {/* Line count */}
        <span className="text-[10px] text-slate-600 flex-shrink-0">{logLines} lines</span>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(state.taskId); }}
          className="ml-1 p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors flex-shrink-0"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content (ẩn khi minimized) */}
      {!state.minimized && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* Resize handle (bottom-right corner) */}
      {!state.minimized && (
        <div
          onMouseDown={(e) => onResizeStart(e, state.taskId)}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-full h-full text-slate-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 22H20V20H22V22ZM22 18H18V22H22V18ZM18 22H14V18H22V22Z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FloatingWindow;
