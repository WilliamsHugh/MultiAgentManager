/**
 * StatsPanel — Task statistics counters
 * 
 * Brand colors:
 * - Total:   Slate  #64748B
 * - Running: Amber  #F59E0B
 * - Done:    Emerald #10B981
 * - Error:   Danger #EF4444
 */

import React from 'react';
import { TerminalIcon, LoaderIcon, CheckIcon, XIcon } from '../common/Icons';

interface Stats {
  total: number;
  running: number;
  done: number;
  error: number;
}

interface StatsPanelProps {
  stats: Stats;
  showIcons?: boolean;
  size?: 'sm' | 'md';
}

const sizeConfig = {
  sm: {
    container: 'grid grid-cols-4 gap-1.5 text-xs',
    item: 'rounded p-1.5 text-center',
    label: 'text-[10px]',
    value: 'text-sm font-bold',
  },
  md: {
    container: 'grid grid-cols-4 gap-2 text-sm',
    item: 'rounded-lg p-3 text-center',
    label: 'text-xs',
    value: 'text-xl font-bold',
  },
};

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  showIcons = false,
  size = 'sm',
}) => {
  const cfg = sizeConfig[size];

  const items = [
    {
      label: 'Total',
      value: stats.total,
      color: 'text-slate-400',
      valueColor: 'text-white',
      icon: TerminalIcon,
    },
    {
      label: 'Run',
      value: stats.running,
      color: 'text-amber-400',
      valueColor: 'text-amber-400',
      icon: LoaderIcon,
    },
    {
      label: 'Done',
      value: stats.done,
      color: 'text-emerald-400',
      valueColor: 'text-emerald-400',
      icon: CheckIcon,
    },
    {
      label: 'Err',
      value: stats.error,
      color: 'text-red-400',
      valueColor: 'text-red-400',
      icon: XIcon,
    },
  ];

  return (
    <div className={cfg.container}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`${cfg.item} bg-slate-800/50`}>
            {showIcons && <Icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />}
            <div className={cfg.label + ' ' + item.color}>{item.label}</div>
            <div className={cfg.value + ' ' + item.valueColor}>{item.value}</div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsPanel;
