import React from 'react';

interface PlanFactChartProps {
  planData: number[];
  factData: number[];
  labels?: string[];
  width?: number;
  height?: number;
  planColor?: string;
  factColor?: string;
}

export const PlanFactChart: React.FC<PlanFactChartProps> = ({
  planData,
  factData,
  labels,
  width = 600,
  height = 200,
  planColor = '#3b82f6', // blue
  factColor = '#10b981', // emerald
}) => {
  if (!planData || !factData || planData.length === 0 || factData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ width, height }}
      >
        Нет данных
      </div>
    );
  }

  const dataLength = Math.max(planData.length, factData.length);
  const allValues = [...planData, ...factData];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Генерируем точки для линий
  const planPoints = planData.map((value, index) => {
    const x = (index / (dataLength - 1)) * chartWidth + padding;
    const y = height - padding - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const factPoints = factData.map((value, index) => {
    const x = (index / (dataLength - 1)) * chartWidth + padding;
    const y = height - padding - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + ratio * chartHeight;
          const value = min + (1 - ratio) * range;
          return (
            <g key={i}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-slate-500"
              >
                {value.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Plan line */}
        <polyline
          points={planPoints}
          fill="none"
          stroke={planColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
          opacity={0.7}
        />
        {planData.map((value, index) => {
          const x = (index / (dataLength - 1)) * chartWidth + padding;
          const y = height - padding - ((value - min) / range) * chartHeight;
          return (
            <circle
              key={`plan-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill={planColor}
              opacity={0.7}
            />
          );
        })}

        {/* Fact line */}
        <polyline
          points={factPoints}
          fill="none"
          stroke={factColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {factData.map((value, index) => {
          const x = (index / (dataLength - 1)) * chartWidth + padding;
          const y = height - padding - ((value - min) / range) * chartHeight;
          return (
            <circle
              key={`fact-${index}`}
              cx={x}
              cy={y}
              r="5"
              fill={factColor}
            />
          );
        })}

        {/* Labels */}
        {labels && labels.map((label, index) => {
          const x = (index / (dataLength - 1)) * chartWidth + padding;
          return (
            <text
              key={index}
              x={x}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-slate-500"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: planColor }} />
          <span className="text-xs text-slate-600 font-medium">План</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1" style={{ backgroundColor: factColor }} />
          <span className="text-xs text-slate-600 font-medium">Факт</span>
        </div>
      </div>
    </div>
  );
};

