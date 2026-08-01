/**
 * Sidebar — Left sidebar chứa task list + stats + file browser
 * 
 * Brand: Slate-900 bg, Iris accents, Emerald for success states
 */

import React, { useState } from 'react';
import { TerminalIcon, GitBranchIcon, LoaderIcon, CheckIcon, XIcon, FolderIcon, FileIcon, TrashIcon } from '../common/Icons';
import StatusBadge, { TaskStatus } from '../common/StatusBadge';
import StatsPanel from '../monitoring/StatsPanel';
import QueueStats from '../monitoring/QueueStats';

interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  branch_name?: string;
  created_at: string;
}

interface FsEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

interface QueueStatsData {
  queueLength: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

interface ModelOption {
  id: string;
  label: string;
}

interface SidebarProps {
  tasks: Task[];
  stats: { total: number; running: number; done: number; error: number };
  queueStats: QueueStatsData | null;
  connected: boolean;
  isLoading: boolean;
  activeTaskId: string | null;
  projectPath: string | null;
  selectedModel: string;
  modelOptions: ModelOption[];
  fsEntries: FsEntry[];
  fsPath: string;
  browserOpen: boolean;
  onSelectTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleBrowser: () => void;
  onFsPathChange: (path: string) => void;
  onFsBrowse: () => void;
  onFsSelectParent: () => void;
  onFsNavigate: (path: string) => void;
  onSelectProject: () => void;
  onModelChange: (model: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  stats,
  queueStats,
  connected,
  isLoading,
  activeTaskId,
  projectPath,
  selectedModel,
  modelOptions,
  fsEntries,
  fsPath,
  browserOpen,
  onSelectTask,
  onDeleteTask,
  onToggleBrowser,
  onFsPathChange,
  onFsBrowse,
  onFsSelectParent,
  onFsNavigate,
  onSelectProject,
  onModelChange,
}) => {
  return (
    <aside className="w-80 transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <TerminalIcon className="w-5 h-5 text-iris-400" />
          <h1 className="text-lg font-bold tracking-tight">
            Multi<span className="text-iris-400">Agent</span>
          </h1>
          <button
            onClick={onToggleBrowser}
            className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {projectPath ? 'Change' : 'Select'} Project
          </button>
          <span
            className={`ml-auto w-2 h-2 rounded-full ${
              connected
                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                : 'bg-red-400 shadow-lg shadow-red-400/50'
            }`}
          />
        </div>

        <StatsPanel stats={stats} />
      </div>

      {/* Project Browser */}
      {browserOpen && (
        <div className="p-2 border-b border-slate-800 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-1 mb-2">
            <input
              value={fsPath}
              onChange={(e) => onFsPathChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onFsBrowse()}
              placeholder="/path/to/project"
              className="flex-1 px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-iris-500/50"
            />
            <button
              onClick={onFsBrowse}
              className="px-2 py-1 text-xs bg-iris-600 hover:bg-iris-500 rounded transition-colors text-white"
            >
              Browse
            </button>
          </div>

          {fsPath && (
            <button
              onClick={onSelectProject}
              className="w-full mb-2 px-2 py-1.5 text-xs font-medium bg-emerald-600/80 hover:bg-emerald-500 rounded border border-emerald-500/30 text-emerald-200 transition-all duration-200 active:scale-[0.98]"
            >
              📂 Select this folder as project
            </button>
          )}

          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {fsPath && (
              <button
                onClick={onFsSelectParent}
                className="w-full text-left px-2 py-1 text-xs text-slate-500 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                .. (up)
              </button>
            )}
            {fsEntries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => entry.isDirectory && onFsNavigate(entry.path)}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  entry.isDirectory
                    ? 'text-iris-400 hover:bg-iris-400/10'
                    : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                {entry.isDirectory ? '📁' : '📄'} {entry.name}
              </button>
            ))}
          </div>
          {projectPath && (
            <div className="mt-2 text-[10px] text-emerald-400/70 truncate">
              📌 {projectPath}
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-3 rounded-lg bg-slate-800/30">
                <div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-700/30 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            <TerminalIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No tasks yet
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="group relative">
              <button
                onClick={() => onSelectTask(task.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  activeTaskId === task.id
                    ? 'bg-slate-800 border-slate-600 shadow-md'
                    : 'bg-slate-800/50 border-transparent hover:bg-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">
                    {task.status === 'running' ? (
                      <LoaderIcon className="w-4 h-4 animate-spin text-amber-400" />
                    ) : task.status === 'done' ? (
                      <CheckIcon className="w-4 h-4 text-emerald-400" />
                    ) : task.status === 'error' ? (
                      <XIcon className="w-4 h-4 text-red-400" />
                    ) : (
                      <TerminalIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{task.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {task.branch_name ? (
                        <span className="flex items-center gap-1">
                          <GitBranchIcon className="w-3 h-3" />
                          {task.branch_name}
                        </span>
                      ) : (
                        new Date(task.created_at).toLocaleTimeString()
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} size="sm" />
                </div>
              </button>
              {/* Delete button — appears on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete task"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            AI Manager
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-slate-800 rounded border border-slate-700 text-slate-300 focus:outline-none focus:border-iris-500/50 transition-colors"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <QueueStats stats={queueStats} />
      </div>
    </aside>
  );
};

export default Sidebar;
