import React from 'react';

interface StatMiniChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const StatMiniChart: React.FC<StatMiniChartProps> = ({
  data,
  width = 100,
  height = 30,
  color = '#3b82f6',
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-xs"
        style={{ width, height }}
      >
        Нет данных
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Избегаем деления на ноль

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 4);
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x + 2},${y + 2}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((value, index) => {
        const x = (index / (data.length - 1)) * (width - 4) + 2;
        const y = height - ((value - min) / range) * (height - 4) - 2;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
          />
        );
      })}
    </svg>
  );
};

