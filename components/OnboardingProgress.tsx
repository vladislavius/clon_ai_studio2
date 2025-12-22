import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface OnboardingProgressProps {
  progress: number;
  totalTasks: number;
  completedTasks: number;
  size?: 'sm' | 'md' | 'lg';
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  progress,
  totalTasks,
  completedTasks,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`font-bold text-slate-700 ${textSizes[size]}`}>
          Прогресс: {completedTasks} / {totalTasks}
        </span>
        <span className={`font-black text-blue-600 ${textSizes[size]}`}>
          {progress}%
        </span>
      </div>
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full flex items-center justify-end pr-1`}
          style={{ width: `${progress}%` }}
        >
          {progress === 100 && (
            <CheckCircle2 size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} className="text-white" />
          )}
        </div>
      </div>
    </div>
  );
};


