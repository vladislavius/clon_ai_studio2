
import { StatisticValue, StatisticDefinition } from '../types';

/**
 * Прогнозирует следующее значение статистики на основе линейной регрессии
 */
export function predictNextValue(values: StatisticValue[]): number | null {
  if (values.length < 2) return null;

  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Простая линейная регрессия
  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  sorted.forEach((val, index) => {
    const x = index;
    const y = val.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Прогноз для следующей точки
  const nextX = n;
  return Math.max(0, Math.round(slope * nextX + intercept));
}

/**
 * Вычисляет среднее значение за период
 */
export function calculateAverage(values: StatisticValue[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val.value, 0);
  return sum / values.length;
}

/**
 * Вычисляет медиану значений
 */
export function calculateMedian(values: StatisticValue[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1].value + sorted[mid].value) / 2
    : sorted[mid].value;
}

/**
 * Вычисляет стандартное отклонение
 */
export function calculateStandardDeviation(values: StatisticValue[]): number {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const squareDiffs = values.map(val => Math.pow(val.value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Определяет тренд (рост, падение, стабильность)
 */
export type TrendType = 'growing' | 'declining' | 'stable' | 'volatile';

export function analyzeTrendType(values: StatisticValue[]): TrendType {
  if (values.length < 3) return 'stable';

  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Берем последние 30% значений для анализа тренда
  const recentCount = Math.max(3, Math.floor(sorted.length * 0.3));
  const recent = sorted.slice(-recentCount);

  const firstValue = recent[0].value;
  const lastValue = recent[recent.length - 1].value;
  const change = ((lastValue - firstValue) / firstValue) * 100;

  const stdDev = calculateStandardDeviation(recent);
  const avg = calculateAverage(recent);
  const volatility = (stdDev / avg) * 100;

  if (volatility > 30) return 'volatile';
  if (change > 5) return 'growing';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Сравнивает статистики департаментов
 */
export interface DepartmentComparison {
  departmentId: string;
  departmentName: string;
  currentValue: number;
  trend: number;
  average: number;
}

export function compareDepartments(
  definitions: StatisticDefinition[],
  values: Record<string, StatisticValue[]>,
  statTitle: string
): DepartmentComparison[] {
  const matchingStats = definitions.filter(d => d.title === statTitle);
  
  return matchingStats.map(stat => {
    const statValues = values[stat.id] || [];
    const sorted = [...statValues].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const current = sorted.length > 0 ? sorted[sorted.length - 1].value : 0;
    const prev = sorted.length > 1 ? sorted[0].value : 0;
    const trend = prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
    const average = calculateAverage(sorted);

    return {
      departmentId: stat.owner_id || '',
      departmentName: stat.owner_id || 'Неизвестно',
      currentValue: current,
      trend,
      average,
    };
  }).sort((a, b) => b.currentValue - a.currentValue);
}

/**
 * Генерирует рекомендации на основе анализа статистик
 */
export interface Recommendation {
  type: 'warning' | 'info' | 'success';
  message: string;
  action?: string;
}

export function generateRecommendations(
  stat: StatisticDefinition,
  values: StatisticValue[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  if (values.length === 0) {
    recommendations.push({
      type: 'warning',
      message: 'Нет данных для анализа. Начните вводить значения.',
    });
    return recommendations;
  }

  const sorted = [...values].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const current = sorted[sorted.length - 1].value;
  const prev = sorted.length > 1 ? sorted[sorted.length - 2].value : current;
  const change = current - prev;
  const changePercent = prev !== 0 ? (change / Math.abs(prev)) * 100 : 0;

  const trendType = analyzeTrendType(sorted);
  const stdDev = calculateStandardDeviation(sorted);
  const avg = calculateAverage(sorted);

  // Анализ тренда
  if (trendType === 'declining' && !stat.inverted) {
    recommendations.push({
      type: 'warning',
      message: `Статистика снижается на ${Math.abs(changePercent).toFixed(1)}%. Требуется внимание.`,
      action: 'Провести анализ причин снижения',
    });
  }

  if (trendType === 'growing' && stat.inverted) {
    recommendations.push({
      type: 'warning',
      message: `Обратная статистика растет на ${changePercent.toFixed(1)}%. Это негативный тренд.`,
      action: 'Принять меры по снижению показателя',
    });
  }

  // Волатильность
  const volatility = (stdDev / avg) * 100;
  if (volatility > 30) {
    recommendations.push({
      type: 'info',
      message: `Высокая волатильность (${volatility.toFixed(1)}%). Значения сильно колеблются.`,
      action: 'Изучить причины колебаний',
    });
  }

  // Стабильность
  if (trendType === 'stable' && changePercent > -2 && changePercent < 2) {
    recommendations.push({
      type: 'success',
      message: 'Статистика стабильна. Продолжайте текущую деятельность.',
    });
  }

  return recommendations;
}

