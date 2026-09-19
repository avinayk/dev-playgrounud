// frontend/src/components/StatTrendIndicator.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StatTrendResult } from '../utils/statTrends';

interface StatTrendIndicatorProps {
  trend: StatTrendResult;
  size?: 'sm' | 'md' | 'lg';
}

export const StatTrendIndicator: React.FC<StatTrendIndicatorProps> = ({
  trend,
  size = 'md',
}) => {
  const Icon = trend.isUp ? TrendingUp : TrendingDown;
  const color = trend.isUp ? 'text-lime-400' : 'text-rose-400';
  const bg = trend.isUp ? 'bg-lime-400/20' : 'bg-rose-500/20';
  const border = trend.isUp
    ? 'border-lime-400/30'
    : 'border-rose-500/30';

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1',
  }[size];

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-mono font-black border ${bg} ${color} ${border} ${sizeClasses}`}
      title={`Recent ${trend.recentAvg} vs Overall ${trend.overallAvg}`}
    >
      <Icon className={iconSize} />
      <span>{trend.deltaText}</span>
    </span>
  );
};

export default StatTrendIndicator;