/**
 * Общие утилиты для работы со статистиками
 * Вынесены из дублирующегося кода
 */

import { StatisticValue } from '../types';

/**
 * Константы для периодов фильтрации
 */
export const PERIOD_SLICE_MAP = {
  '1w': 2,
  '3w': 4,
  '1m': 5,
  '3m': 13,
  '6m': 26,
  '1y': 52,
} as const;

export type PeriodType = keyof typeof PERIOD_SLICE_MAP | 'all';

/**
 * Фильтрует значения статистики по выбранному периоду
 * @param values - Массив значений статистики
 * @param period - Период фильтрации
 * @returns Отфильтрованный массив значений
 */
export function getFilteredValues(values: StatisticValue[], period: PeriodType): StatisticValue[] {
  if (!values || values.length === 0) return [];
  
  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  if (period === 'all') {
    return sorted;
  }
  
  const sliceCount = PERIOD_SLICE_MAP[period];
  if (!sliceCount) {
    return sorted.slice(Math.max(0, sorted.length - 13)); // Default: 3 месяца
  }
  
  return sorted.slice(Math.max(0, sorted.length - sliceCount));
}

/**
 * Анализирует тренд статистики
 * @param values - Массив значений статистики
 * @param inverted - Обратная статистика (меньше = лучше)
 * @returns Объект с анализом тренда
 */
export function analyzeTrend(values: StatisticValue[], inverted: boolean = false) {
  if (!values || values.length === 0) {
    return { current: 0, prev: 0, delta: 0, percent: 0, direction: 'flat' as const, isGood: true };
  }

  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const n = sorted.length;

  // Use PERIOD Based Trend (End vs Start)
  const current = sorted[n - 1].value;
  const startOfPeriod = sorted[0].value; 
  
  const prev = n > 1 ? startOfPeriod : 0; 

  const delta = current - prev;
  
  let percent = 0;
  if (prev === 0) {
    percent = current === 0 ? 0 : 100;
  } else {
    percent = (delta / Math.abs(prev)) * 100;
  }

  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (delta > 0) direction = 'up';
  if (delta < 0) direction = 'down';

  let isGood = true;
  if (inverted) {
    isGood = delta <= 0;
  } else {
    isGood = delta >= 0;
  }

  return { current, prev, delta, percent, direction, isGood };
}

