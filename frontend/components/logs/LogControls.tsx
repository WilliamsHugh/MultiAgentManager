/**
 * LogControls — Search, filter, auto-scroll controls cho log viewer
 */

import React from 'react';
import { SearchIcon, FilterIcon, ArrowUpIcon, TrashIcon, CopyIcon } from '../common/Icons';

export type LogLevel = 'all' | 'debug' | 'info' | 'warn' | 'error';

interface LogControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  levelFilter: LogLevel;
  onLevelFilterChange: (level: LogLevel) => void;
  autoScroll: boolean;
  onAutoScrollToggle: () => void;
  onClear: () => void;
  onCopy: () => void;
  logCount: number;
}

const levelOptions: { value: LogLevel; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-slate-400' },
  { value: 'info', label: 'Info', color: 'text-iris-400' },
  { value: 'debug', label: 'Debug', color: 'text-slate-500' },
  { value: 'warn', label: 'Warn', color: 'text-amber-400' },
  { value: 'error', label: 'Error', color: 'text-red-400' },
];

export const LogControls: React.FC<LogControlsProps> = ({
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  autoScroll,
  onAutoScrollToggle,
  onClear,
  onCopy,
  logCount,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/30 border-b border-slate-800/50 flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-1 flex-1 max-w-xs">
        <SearchIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs..."
          className="w-full px-2 py-0.5 text-[11px] bg-slate-800 rounded border border-slate-700 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-iris-500/50 transition-colors"
        />
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-0.5">
        <FilterIcon className="w-3 h-3 text-slate-500 mr-0.5" />
        {levelOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onLevelFilterChange(opt.value)}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              levelFilter === opt.value
                ? `${opt.color} bg-slate-700/50`
                : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Auto-scroll toggle */}
      <button
        onClick={onAutoScrollToggle}
        className={`p-1 rounded transition-colors ${
          autoScroll
            ? 'text-iris-400 bg-iris-500/10'
            : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
        }`}
        title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
      >
        <ArrowUpIcon className="w-3.5 h-3.5" />
      </button>

      {/* Line count */}
      <span className="text-[10px] text-slate-600">{logCount} lines</span>

      {/* Copy */}
      <button
        onClick={onCopy}
        className="p-1 rounded text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 transition-colors"
        title="Copy all logs"
      >
        <CopyIcon className="w-3.5 h-3.5" />
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
        title="Clear logs"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default LogControls;
