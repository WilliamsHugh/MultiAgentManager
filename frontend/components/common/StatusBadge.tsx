/**
 * StatusBadge — Hiển thị trạng thái task theo brand color palette
 * 
 * Brand colors:
 * - Done:    Emerald #10B981
 * - Running: Amber  #F59E0B
 * - Pending: Slate  #64748B
 * - Error:   Danger #EF4444
 * - Unknown: Slate dimmed fallback
 */

import React from 'react';
import { LoaderIcon, CheckIcon, XIcon, TerminalIcon } from './Icons';

export type TaskStatus = 'pending' | 'running' | 'done' | 'error';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

interface StatusStyle {
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  bg: string;
  border: string;
  text: string;
}

const knownConfig: Record<string, StatusStyle> = {
  pending: {
    label: 'Pending',
    icon: TerminalIcon,
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    text: 'text-slate-400',
  },
  running: {
    label: 'Running',
    icon: LoaderIcon,
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    text: 'text-amber-400',
  },
  done: {
    label: 'Done',
    icon: CheckIcon,
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    text: 'text-emerald-400',
  },
  error: {
    label: 'Error',
    icon: XIcon,
    bg: 'bg-red-400/10',
    border: 'border-red-400/30',
    text: 'text-red-400',
  },
};

const fallbackConfig: StatusStyle = {
  label: 'Unknown',
  icon: TerminalIcon,
  bg: 'bg-slate-500/10',
  border: 'border-slate-500/30',
  text: 'text-slate-500',
};

function getConfig(status: string): StatusStyle {
  if (!knownConfig[status]) {
    console.warn(`[StatusBadge] Unknown task status: "${status}" — using fallback`);
  }
  return knownConfig[status] || fallbackConfig;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const config = getConfig(status);
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <Icon
          className={status === 'running' ? 'w-3 h-3 animate-spin' : 'w-3 h-3'}
        />
      )}
      {config.label}
    </span>
  );
};

const knownColors: Record<string, string> = {
  pending: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
  running: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  done: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  error: 'text-red-400 border-red-400/30 bg-red-400/10',
};
const fallbackColor = 'text-slate-500 border-slate-500/30 bg-slate-500/10';

export const getStatusColor = (status: string): string => {
  return knownColors[status] || fallbackColor;
};

export const getStatusIcon = (status: string): React.ReactNode => {
  const config = getConfig(status);
  const Icon = config.icon;
  return <Icon className={status === 'running' ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />;
};

export default StatusBadge;
