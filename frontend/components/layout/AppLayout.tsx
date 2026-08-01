/**
 * AppLayout — Main layout orchestrator
 * 
 * Kết hợp Sidebar + Header + Canvas + Notifications
 */

import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Canvas from '../canvas/Canvas';
import { Notifications, useNotifications } from '../common/Notifications';
import { useWindowManager } from '../canvas/WindowManager';
import { TaskStatus } from '../common/StatusBadge';
import { LogData } from '../logs/LogEntry';
import { LogViewer } from '../logs/LogViewer';
import GlobalTerminal from '../logs/GlobalTerminal';
import { XIcon } from '../common/Icons';

// Re-export types for external use
export type { TaskStatus };
export type { LogData };

export interface TaskInfo {
  id: string;
  name: string;
  status: TaskStatus;
  branch_name?: string;
  created_at: string;
}

interface AppLayoutProps {
  // Data
  tasks: TaskInfo[];
  logs: Record<string, LogData[]>;
  globalLogs: LogData[];
  connected: boolean;
  isLoading: boolean;
  connectionError: string | null;
  projectName: string;
  projectPath: string | null;
  queueStats: { queueLength: number; running: number; completed: number; failed: number; total: number } | null;
  selectedModel: string;
  modelOptions: Array<{ id: string; label: string }>;
  input: string;

  // Callbacks
  onSubmit: (input: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRetryConnection: () => void;
  onInputChange: (value: string) => void;
  onProjectNameChange: (value: string) => void;
  onModelChange: (model: string) => void;

  // File system
  fsEntries: Array<{ name: string; path: string; isDirectory: boolean; isFile: boolean }>;
  fsPath: string;
  browserOpen: boolean;
  onToggleBrowser: () => void;
  onFsPathChange: (path: string) => void;
  onFsBrowse: () => void;
  onFsSelectParent: () => void;
  onFsNavigate: (path: string) => void;
  onSelectProject: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  tasks,
  logs,
  globalLogs,
  connected,
  isLoading,
  connectionError,
  projectName,
  projectPath,
  queueStats,
  selectedModel,
  modelOptions,
  input,
  onSubmit,
  onDeleteTask,
  onRetryConnection,
  onInputChange,
  onProjectNameChange,
  onModelChange,
  fsEntries,
  fsPath,
  browserOpen,
  onToggleBrowser,
  onFsPathChange,
  onFsBrowse,
  onFsSelectParent,
  onFsNavigate,
  onSelectProject,
}) => {
  const [showSidebar, setShowSidebar] = useState(true);
  const { notifications, addNotification, dismissNotification } = useNotifications();

  const {
    windows,
    activeTaskId,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    startDrag,
    startResize,
  } = useWindowManager();

  // Submit handler — uses `input` prop from parent
  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    onSubmit(input);
    onInputChange(''); // Clear input after submit
    addNotification('Task submitted!', 'success');
  }, [input, onSubmit, onInputChange, addNotification]);

  // Stats
  const stats = {
    total: tasks.length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    error: tasks.filter((t) => t.status === 'error').length,
  };

  // Background content for Canvas
  const renderBackground = () => {
    if (connectionError) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <XIcon className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-red-400 mb-2">Connection Error</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">{connectionError}</p>
            <button
              onClick={onRetryConnection}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (globalLogs.length > 0) {
      return (
        <GlobalTerminal
          logs={globalLogs}
          tasks={tasks}
          onSelectTask={(taskId) => openWindow(taskId)}
        />
      );
    }

    return null; // Canvas will show default welcome screen
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          tasks={tasks}
          stats={stats}
          queueStats={queueStats}
          connected={connected}
          isLoading={isLoading}
          activeTaskId={activeTaskId}
          projectPath={projectPath}
          selectedModel={selectedModel}
          modelOptions={modelOptions}
          fsEntries={fsEntries}
          fsPath={fsPath}
          browserOpen={browserOpen}
          onSelectTask={(taskId) => openWindow(taskId)}
          onToggleBrowser={onToggleBrowser}
          onFsPathChange={onFsPathChange}
          onFsBrowse={onFsBrowse}
          onFsSelectParent={onFsSelectParent}
          onFsNavigate={onFsNavigate}
          onSelectProject={onSelectProject}
          onDeleteTask={onDeleteTask}
          onModelChange={onModelChange}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header
          input={input}
          projectName={projectName}
          connected={connected}
          onInputChange={onInputChange}
          onProjectNameChange={onProjectNameChange}
          onSubmit={handleSubmit}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
        />

        {/* Canvas — passes logs data for floating window content */}
        <Canvas
          backgroundContent={renderBackground()}
          windows={windows}
          tasks={tasks}
          taskLogs={logs}
          connected={connected}
          activeTaskId={activeTaskId}
          onDragStart={startDrag}
          onResizeStart={startResize}
          onFocus={focusWindow}
          onMinimize={minimizeWindow}
          onClose={closeWindow}
          onMaximize={maximizeWindow}
        />
      </main>

      {/* Notifications */}
      <Notifications
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
};

export default AppLayout;
