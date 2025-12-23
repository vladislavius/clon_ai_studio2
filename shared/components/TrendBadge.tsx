import React from 'react';
import { StatTrend } from '../types/adminTech';
import { getTrendColor } from '../utils/statCalculations';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
  trend: StatTrend;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend, changePercent, size = 'md' }) => {
  const color = getTrendColor(trend);
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      {trend === 'UP' && <TrendingUp size={iconSize} />}
      {trend === 'DOWN' && <TrendingDown size={iconSize} />}
      {trend === 'FLAT' && <Minus size={iconSize} />}
      <span>
        {changePercent > 0 ? '+' : ''}
        {changePercent.toFixed(1)}%
      </span>
    </div>
  );
};

