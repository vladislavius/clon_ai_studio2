
import React, { useMemo, useState } from 'react';
import { StatisticValue } from '../types';
import { format } from 'date-fns';

interface StatsChartProps {
  values: StatisticValue[];
  color?: string;
  inverted?: boolean;
  isDouble?: boolean;
}

const StatsChart: React.FC<StatsChartProps> = ({ values, color = "#3b82f6", inverted, isDouble }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedValues = useMemo(() => {
    if (!values) return [];
    return [...values].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [values]);

  // Handle empty state
  if (!values || values.length < 2) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Недостаточно данных</p>
        <p className="text-[10px] text-slate-300 mt-1">Требуется минимум 2 значения</p>
      </div>
    );
  }

  // --- CONFIGURATION ---
  const SVG_WIDTH = 800;
  const SVG_HEIGHT = 250;
  const PADDING_X = 30; // Increased padding for dots not to be cut off
  const PADDING_Y = 30;

  // --- DATA PREPARATION ---
  // If isDouble, we use the real value2 from the data object.
  // If value2 is missing, default to 0 to avoid breaking chart, but ideally should be present.
  
  const allValues = isDouble 
      ? [...sortedValues.map(v => v.value), ...sortedValues.map(v => v.value2 || 0)]
      : sortedValues.map(v => v.value);

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const dataRange = maxVal - minVal || 1;
  
  const yMin = Math.max(0, minVal - (dataRange * 0.1));
  const yMax = maxVal + (dataRange * 0.1);
  const yRange = yMax - yMin;

  // --- COORDINATE MATH ---
  const getX = (index: number) => {
    return PADDING_X + (index / (sortedValues.length - 1)) * (SVG_WIDTH - PADDING_X * 2);
  };

  const getY = (val: number) => {
    return SVG_HEIGHT - PADDING_Y - ((val - yMin) / yRange) * (SVG_HEIGHT - PADDING_Y * 2);
  };

  // --- TREND LINE CALCULATION (Linear Regression) ---
  const calculateTrendLine = (data: typeof sortedValues) => {
      const n = data.length;
      if (n < 2) return null;

      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      data.forEach((v, x) => {
          const y = v.value;
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumXX += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const startY = slope * 0 + intercept;
      const endY = slope * (n - 1) + intercept;

      return {
          x1: getX(0),
          y1: getY(startY),
          x2: getX(n - 1),
          y2: getY(endY)
      };
  };

  const trendLine = calculateTrendLine(sortedValues);

  // --- PATH GENERATION ---
  const generatePath = (data: typeof sortedValues, valueKey: 'value' | 'value2') => {
      return data.map((v, i) => {
          const val = valueKey === 'value' ? v.value : (v.value2 || 0);
          return `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(val)}`
      }).join(' ');
  };

  const generateAreaPath = (data: typeof sortedValues) => {
      const line = generatePath(data, 'value');
      return `${line} L ${getX(data.length - 1)},${SVG_HEIGHT - PADDING_Y} L ${getX(0)},${SVG_HEIGHT - PADDING_Y} Z`;
  };

  const primaryPath = generatePath(sortedValues, 'value');
  const primaryArea = generateAreaPath(sortedValues);
  const secondaryPath = isDouble ? generatePath(sortedValues, 'value2') : '';

  const mainColor = isDouble ? "#10b981" : color;
  const secondColor = "#ef4444"; 

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const effectiveWidth = rect.width - (rect.width * (PADDING_X * 2 / SVG_WIDTH));
      const relativeX = x - (rect.width * (PADDING_X / SVG_WIDTH));
      let idx = Math.round((relativeX / effectiveWidth) * (sortedValues.length - 1));
      idx = Math.max(0, Math.min(sortedValues.length - 1, idx));
      setHoveredIndex(idx);
  };

  return (
    <div className="w-full h-full relative group bg-white select-none rounded-xl overflow-hidden">
        {/* TOOLTIP */}
        {hoveredIndex !== null && (
            <div 
                className="absolute z-20 pointer-events-none bg-slate-900/90 backdrop-blur-sm text-white text-[10px] rounded-lg py-2 px-3 shadow-xl transform -translate-x-1/2 -translate-y-full transition-all duration-75 flex flex-col gap-1 min-w-[100px] border border-slate-700"
                style={{ 
                    left: `${(getX(hoveredIndex) / SVG_WIDTH) * 100}%`, 
                    top: `${(getY(sortedValues[hoveredIndex].value) / SVG_HEIGHT) * 100}%`,
                    marginTop: '-15px'
                }}
            >
                <div className="font-bold text-xs border-b border-slate-700 pb-1 mb-1 text-center text-slate-300">
                    {format(new Date(sortedValues[hoveredIndex].date), 'd MMM yyyy')}
                </div>
                <div className="flex justify-between gap-3 items-center">
                    <span className="opacity-70 font-medium">{isDouble ? 'Вал 1:' : 'Значение:'}</span>
                    <span className="font-mono font-bold text-lg" style={{color: mainColor}}>{sortedValues[hoveredIndex].value.toLocaleString()}</span>
                </div>
                {isDouble && (
                    <div className="flex justify-between gap-3 items-center">
                        <span className="opacity-70 font-medium">Вал 2:</span>
                        <span className="font-mono font-bold text-rose-400">{(sortedValues[hoveredIndex].value2 || 0).toLocaleString()}</span>
                    </div>
                )}
            </div>
        )}

        <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} 
            preserveAspectRatio="none"
            className="overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredIndex(null)}
        >
            <defs>
                <linearGradient id={`grad-main-${mainColor}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={mainColor} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={mainColor} stopOpacity={0.02} />
                </linearGradient>
            </defs>

            {/* --- GRID --- */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const y = SVG_HEIGHT - PADDING_Y - (t * (SVG_HEIGHT - PADDING_Y * 2));
                const val = yMin + (t * yRange);
                return (
                    <g key={t}>
                        <line x1={PADDING_X} y1={y} x2={SVG_WIDTH - PADDING_X} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={PADDING_X - 8} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="500">{Math.round(val)}</text>
                    </g>
                );
            })}

            {/* --- TREND LINE (Dashed) --- */}
            {trendLine && (
                <line 
                    x1={trendLine.x1} 
                    y1={trendLine.y1} 
                    x2={trendLine.x2} 
                    y2={trendLine.y2} 
                    stroke="#94a3b8" 
                    strokeWidth="2" 
                    strokeDasharray="6 4" 
                    opacity="0.6"
                />
            )}

            {/* --- AREAS & LINES --- */}
            {/* We only fill area for primary line to keep it clean */}
            {!isDouble && <path d={primaryArea} fill={`url(#grad-main-${mainColor})`} />}
            
            <path 
                d={primaryPath} 
                fill="none" 
                stroke={mainColor} 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="drop-shadow-sm"
            />

            {isDouble && (
                <path 
                    d={secondaryPath} 
                    fill="none" 
                    stroke={secondColor} 
                    strokeWidth="2" 
                    strokeDasharray="4 2"
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />
            )}

            {/* --- DISTINCT DOTS (POINTS) --- */}
            {sortedValues.map((v, i) => (
                <circle
                    key={`dot-${i}`}
                    cx={getX(i)}
                    cy={getY(v.value)}
                    r="3.5"
                    fill="white"
                    stroke={mainColor}
                    strokeWidth="2"
                    className="transition-all duration-200"
                    style={{ 
                        r: hoveredIndex === i ? 6 : 3.5,
                        strokeWidth: hoveredIndex === i ? 3 : 2
                    }}
                />
            ))}

            {isDouble && sortedValues.map((v, i) => (
                <circle
                    key={`sec-dot-${i}`}
                    cx={getX(i)}
                    cy={getY(v.value2 || 0)}
                    r="3"
                    fill="white"
                    stroke={secondColor}
                    strokeWidth="1.5"
                />
            ))}

            {/* --- X AXIS LABELS --- */}
            {sortedValues.length > 1 && (
                <>
                    <text x={PADDING_X} y={SVG_HEIGHT - 10} fontSize="10" fill="#64748b" fontWeight="600" textAnchor="start">
                        {format(new Date(sortedValues[0].date), 'd MMM')}
                    </text>
                    <text x={SVG_WIDTH - PADDING_X} y={SVG_HEIGHT - 10} fontSize="10" fill="#64748b" fontWeight="600" textAnchor="end">
                        {format(new Date(sortedValues[sortedValues.length - 1].date), 'd MMM')}
                    </text>
                </>
            )}
        </svg>
    </div>
  );
};

export default StatsChart;
