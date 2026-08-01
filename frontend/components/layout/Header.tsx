/**
 * Header — Top command bar với input, submit, project name, sidebar toggle
 * 
 * Brand: Iris #6366F1 for submit button, Emerald #10B981 for active states
 */

import React, { useRef, useEffect } from 'react';
import { MenuIcon, PlayIcon } from '../common/Icons';

interface HeaderProps {
  input: string;
  projectName: string;
  connected: boolean;
  onInputChange: (value: string) => void;
  onProjectNameChange: (value: string) => void;
  onSubmit: () => void;
  onToggleSidebar: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Header: React.FC<HeaderProps> = ({
  input,
  projectName,
  connected,
  onInputChange,
  onProjectNameChange,
  onSubmit,
  onToggleSidebar,
}) => {
  const localInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit();
    }
  };

  return (
    <header className="px-6 py-3 border-b border-slate-800 flex items-center gap-4 bg-slate-900/50 backdrop-blur-sm">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
        title="Toggle sidebar"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Input area */}
      <div className="flex-1 flex gap-2">
        <input
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Project name (optional)"
          className="w-44 px-3 py-1.5 bg-slate-800 rounded text-sm text-slate-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-iris-500/50 transition-colors"
        />
        <input
          ref={localInputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want the agents to do..."
          className="flex-1 px-4 py-1.5 bg-slate-800 rounded text-sm text-slate-200 placeholder-slate-600 border border-slate-700 focus:outline-none focus:border-iris-500/50 transition-colors"
        />
        <button
          onClick={onSubmit}
          disabled={!input.trim() || !connected}
          className="px-4 py-1.5 bg-iris-600 hover:bg-iris-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-all duration-200 flex items-center gap-1.5 active:scale-95"
        >
          <PlayIcon className="w-4 h-4" />
          Run
        </button>
      </div>
    </header>
  );
};

export default Header;
