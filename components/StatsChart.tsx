import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StatisticValue } from '../types';
import { format } from 'date-fns';


interface StatsChartProps {
  values: StatisticValue[];
  color?: string;
  inverted?: boolean;
  isDouble?: boolean;
}

// Константы вынесены из компонента для предотвращения пересоздания
const SVG_CONFIG = {
  WIDTH: 800,
  HEIGHT: 250,
  PADDING_X: 40,
  PADDING_Y: 40
} as const;

const StatsChart: React.FC<StatsChartProps> = ({ 
  values, 
  color = "#3b82f6", 
  inverted, 
  isDouble 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sortedValues = useMemo(() => {
    if (!values || !Array.isArray(values)) return [];
    // Фильтрация валидных данных
    return [...values]
      .filter(v => v && v.date && v.value !== undefined && v.value !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [values]);

  const { minVal, maxVal, yMin, yMax, yRange } = useMemo(() => {
    if (!sortedValues.length) {
      return { minVal: 0, maxVal: 1, yMin: 0, yMax: 1, yRange: 1 };
    }

    const allValues = isDouble 
      ? [...sortedValues.map(v => v.value), ...sortedValues.map(v => v.value2 || 0)]
      : sortedValues.map(v => v.value);
    
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const dataRange = maxVal - minVal || 1;
    
    const yMin = Math.max(0, minVal - (dataRange * 0.1));
    const yMax = maxVal + (dataRange * 0.1);
    const yRange = yMax - yMin;
    
    return { minVal, maxVal, yMin, yMax, yRange };
  }, [sortedValues, isDouble]);

  // Мемоизированные функции для координат
  const getX = useCallback((index: number) => {
    if (sortedValues.length <= 1) return SVG_CONFIG.PADDING_X;
    return SVG_CONFIG.PADDING_X + 
           (index / (sortedValues.length - 1)) * 
           (SVG_CONFIG.WIDTH - SVG_CONFIG.PADDING_X * 2);
  }, [sortedValues.length]);

  const getY = useCallback((val: number) => {
    return SVG_CONFIG.HEIGHT - 
           SVG_CONFIG.PADDING_Y - 
           ((val - yMin) / yRange) * 
           (SVG_CONFIG.HEIGHT - SVG_CONFIG.PADDING_Y * 2);
  }, [yMin, yRange]);

  // Мемоизированный расчет трендовой линии
  const trendLine = useMemo(() => {
    const n = sortedValues.length;
    if (n < 2) return null;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    sortedValues.forEach((v, x) => {
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
  }, [sortedValues, getX, getY]);

  // Мемоизированные пути
  const { primaryPath, primaryArea, secondaryPath } = useMemo(() => {
    if (sortedValues.length === 0) {
      return { primaryPath: '', primaryArea: '', secondaryPath: '' };
    }

    const generatePath = (valueKey: 'value' | 'value2') => {
      return sortedValues.map((v, i) => {
        const val = valueKey === 'value' ? v.value : (v.value2 || 0);
        return `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(val)}`;
      }).join(' ');
    };

    const generateAreaPath = () => {
      const line = generatePath('value');
      const lastX = getX(sortedValues.length - 1);
      const firstX = getX(0);
      const bottomY = SVG_CONFIG.HEIGHT - SVG_CONFIG.PADDING_Y;
      return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
    };

    return {
      primaryPath: generatePath('value'),
      primaryArea: generateAreaPath(),
      secondaryPath: isDouble ? generatePath('value2') : ''
    };
  }, [sortedValues, getX, getY, isDouble]);

  // Обработчик движения мыши с throttle/debounce
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!sortedValues.length) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const effectiveWidth = rect.width - (rect.width * (SVG_CONFIG.PADDING_X * 2 / SVG_CONFIG.WIDTH));
    const relativeX = x - (rect.width * (SVG_CONFIG.PADDING_X / SVG_CONFIG.WIDTH));
    
    let idx = Math.round((relativeX / effectiveWidth) * (sortedValues.length - 1));
    idx = Math.max(0, Math.min(sortedValues.length - 1, idx));
    
    setHoveredIndex(prev => prev !== idx ? idx : prev);
  }, [sortedValues.length]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const getFiscalWeekString = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const distToThu = (day + 7 - 4) % 7;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - distToThu);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${format(startOfWeek, 'dd.MM')} - ${format(endOfWeek, 'dd.MM')}`;
  }, []);

  const colors = useMemo(() => ({
    main: isDouble ? "#10b981" : color,
    second: "#ef4444",
    grid: "#f1f5f9",
    text: "#94a3b8",
    tooltipBg: "rgba(30, 41, 59, 0.95)"
  }), [color, isDouble]);

  // Empty state
  if (!sortedValues || sortedValues.length < 2) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Недостаточно данных
        </p>
        <p className="text-[10px] text-slate-300 mt-1">
          Требуется минимум 2 значения (1 неделя)
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group bg-white select-none rounded-xl">
      {/* Tooltip */}
      {hoveredIndex !== null && (() => {
        const point = sortedValues[hoveredIndex];
        const pxX = getX(hoveredIndex);
        const pxY = getY(point.value);
        
        const isNearTop = pxY < (SVG_CONFIG.HEIGHT * 0.4);
        const isNearLeft = hoveredIndex < 2;
        const isNearRight = hoveredIndex > sortedValues.length - 3;
        
        let transformX = '-50%';
        let marginLeft = '0px';
        if (isNearLeft) { transformX = '0%'; marginLeft = '10px'; }
        if (isNearRight) { transformX = '-100%'; marginLeft = '-10px'; }
        
        const verticalClass = isNearTop 
          ? 'translate-y-2'
          : '-translate-y-full -mt-3';

        return (
          <div 
            className={`absolute z-50 pointer-events-none backdrop-blur-sm text-white text-[10px] rounded-lg py-1.5 px-2.5 shadow-xl transition-all duration-75 flex flex-col gap-0.5 min-w-[100px] border border-slate-700 ${verticalClass}`}
            style={{ 
              left: `${(pxX / SVG_CONFIG.WIDTH) * 100}%`, 
              top: `${(pxY / SVG_CONFIG.HEIGHT) * 100}%`,
              transform: `translateX(${transformX})`,
              marginLeft,
              backgroundColor: colors.tooltipBg
            }}
          >
            <div className="font-bold text-[9px] uppercase tracking-wider opacity-60 border-b border-slate-600 pb-1 mb-1 text-center">
              Неделя: {getFiscalWeekString(point.date)}
            </div>
            <div className="flex justify-between gap-3 items-center">
              <span className="opacity-80 font-medium">
                {isDouble ? 'Вал 1:' : 'Значение:'}
              </span>
              <span 
                className="font-mono font-bold text-sm" 
                style={{ color: colors.main }}
              >
                {point.value.toLocaleString()}
              </span>
            </div>
            {isDouble && point.value2 !== undefined && (
              <div className="flex justify-between gap-3 items-center">
                <span className="opacity-80 font-medium">Вал 2:</span>
                <span className="font-mono font-bold text-rose-400">
                  {point.value2.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      <svg 
        ref={svgRef}
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${SVG_CONFIG.WIDTH} ${SVG_CONFIG.HEIGHT}`}
        preserveAspectRatio="none"
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient 
            id={`grad-main-${colors.main.replace('#', '')}`} 
            x1="0%" y1="0%" x2="0%" y2="100%"
          >
            <stop offset="0%" stopColor={colors.main} stopOpacity={0.15} />
            <stop offset="100%" stopColor={colors.main} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = SVG_CONFIG.HEIGHT - SVG_CONFIG.PADDING_Y - 
                    (t * (SVG_CONFIG.HEIGHT - SVG_CONFIG.PADDING_Y * 2));
          const val = yMin + (t * yRange);
          
          return (
            <g key={t}>
              <line 
                x1={SVG_CONFIG.PADDING_X} 
                y1={y} 
                x2={SVG_CONFIG.WIDTH - SVG_CONFIG.PADDING_X} 
                y2={y} 
                stroke={colors.grid} 
                strokeWidth="1" 
              />
              <text 
                x={SVG_CONFIG.PADDING_X - 10} 
                y={y + 3} 
                fontSize="9" 
                fill={colors.text}
                textAnchor="end" 
                fontWeight="500"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Trend line */}
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

        {/* Area and lines */}
        {!isDouble && (
          <path 
            d={primaryArea} 
            fill={`url(#grad-main-${colors.main.replace('#', '')})`} 
          />
        )}
        
        <path 
          d={primaryPath} 
          fill="none" 
          stroke={colors.main} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="drop-shadow-sm"
        />

        {isDouble && secondaryPath && (
          <path 
            d={secondaryPath} 
            fill="none" 
            stroke={colors.second} 
            strokeWidth="2" 
            strokeDasharray="4 2"
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Dots */}
        {sortedValues.map((v, i) => (
          <circle
            key={`dot-${i}-${v.date}`}
            cx={getX(i)}
            cy={getY(v.value)}
            r={hoveredIndex === i ? 6 : 3.5}
            fill="white"
            stroke={colors.main}
            strokeWidth={hoveredIndex === i ? 3 : 2}
            className="transition-all duration-200"
          />
        ))}

        {isDouble && sortedValues.map((v, i) => (
          v.value2 !== undefined && (
            <circle
              key={`sec-dot-${i}-${v.date}`}
              cx={getX(i)}
              cy={getY(v.value2)}
              r="3"
              fill="white"
              stroke={colors.second}
              strokeWidth="1.5"
            />
          )
        ))}

        {/* X axis labels */}
        {sortedValues.length > 1 && (
          <>
            <text 
              x={SVG_CONFIG.PADDING_X} 
              y={SVG_CONFIG.HEIGHT - 10} 
              fontSize="10" 
              fill="#64748b" 
              fontWeight="600" 
              textAnchor="start"
            >
              {format(new Date(sortedValues[0].date), 'dd.MM')}
            </text>
            <text 
              x={SVG_CONFIG.WIDTH - SVG_CONFIG.PADDING_X} 
              y={SVG_CONFIG.HEIGHT - 10} 
              fontSize="10" 
              fill="#64748b" 
              fontWeight="600" 
              textAnchor="end"
            >
              {format(new Date(sortedValues[sortedValues.length - 1].date), 'dd.MM')}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

export default StatsChart;
