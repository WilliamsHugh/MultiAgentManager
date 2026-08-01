/**
 * QueueStats — Task queue statistics
 */

import React from 'react';

interface QueueStatsData {
  queueLength: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

interface QueueStatsProps {
  stats: QueueStatsData | null;
}

export const QueueStats: React.FC<QueueStatsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="flex justify-between text-xs text-slate-600">
      <span>📋 Queue: {stats.queueLength}</span>
      <span>⚡ Run: {stats.running}</span>
      <span>✅ Done: {stats.completed}</span>
    </div>
  );
};

export default QueueStats;
