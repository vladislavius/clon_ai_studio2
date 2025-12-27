/**
 * Утилиты для расчета трендов и условий статистик
 */

import { StatTrend, ConditionLevel } from '../types/adminTech';

/**
 * Вычисляет тренд на основе предыдущего и текущего значения
 */
export function calculateTrend(previous: number, current: number): StatTrend {
  if (previous === 0) return current > 0 ? 'UP' : 'FLAT';
  
  const changePercent = ((current - previous) / previous) * 100;
  
  // Порог 5% для определения тренда
  if (changePercent > 5) return 'UP';
  if (changePercent < -5) return 'DOWN';
  return 'FLAT';
}

/**
 * Вычисляет процент изменения
 */
export function calculateChangePercent(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Определяет уровень условия на основе истории значений
 * Упрощенная логика на основе административной технологии
 */
export function suggestConditionLevel(history: number[]): ConditionLevel {
  if (history.length < 2) return 'NORMAL';

  const recent = history.slice(-3); // Последние 3 периода
  const older = history.slice(0, -3); // Более старые периоды

  // Вычисляем средние значения
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 
    ? older.reduce((a, b) => a + b, 0) / older.length 
    : recentAvg;

  // Вычисляем изменение
  const changePercent = olderAvg > 0 
    ? ((recentAvg - olderAvg) / olderAvg) * 100 
    : 0;

  // Вычисляем волатильность (стандартное отклонение)
  const variance = recent.reduce((sum, val) => sum + Math.pow(val - recentAvg, 2), 0) / recent.length;
  const stdDev = Math.sqrt(variance);
  const volatility = recentAvg > 0 ? (stdDev / recentAvg) * 100 : 0;

  // Логика определения условия
  if (changePercent > 50 && volatility < 15) {
    return 'POWER'; // Очень высокий стабильный рост
  }
  
  if (changePercent > 30) {
    return 'AFFLUENCE'; // Высокий рост
  }
  
  if (changePercent > 10 && volatility < 20) {
    return 'NORMAL'; // Умеренный стабильный рост
  }
  
  if (changePercent > -10 && volatility < 25) {
    return 'NORMAL'; // Стабильность
  }
  
  if (changePercent > -30 || (volatility > 30 && changePercent < 0)) {
    return 'EMERGENCY'; // Падение или высокая волатильность
  }
  
  if (changePercent > -50) {
    return 'DANGER'; // Сильное падение
  }
  
  if (recentAvg < olderAvg * 0.3) {
    return 'NON_EXISTENCE'; // Критически низкие значения
  }
  
  return 'DANGER';
}

/**
 * Получает цвет для тренда
 */
export function getTrendColor(trend: StatTrend): string {
  switch (trend) {
    case 'UP':
      return '#10b981'; // emerald
    case 'DOWN':
      return '#ef4444'; // red
    case 'FLAT':
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

/**
 * Получает цвет для уровня условия
 */
export function getConditionColor(level: ConditionLevel): string {
  switch (level) {
    case 'POWER':
      return '#8b5cf6'; // purple
    case 'AFFLUENCE':
      return '#10b981'; // emerald
    case 'NORMAL':
      return '#3b82f6'; // blue
    case 'EMERGENCY':
      return '#f59e0b'; // amber
    case 'DANGER':
      return '#ef4444'; // red
    case 'NON_EXISTENCE':
      return '#1f2937'; // gray-800
    default:
      return '#6b7280';
  }
}

/**
 * Получает название условия на русском
 */
export function getConditionLabel(level: ConditionLevel): string {
  switch (level) {
    case 'POWER':
      return 'Мощь';
    case 'AFFLUENCE':
      return 'Изобилие';
    case 'NORMAL':
      return 'Норма';
    case 'EMERGENCY':
      return 'Чрезвычайное';
    case 'DANGER':
      return 'Опасность';
    case 'NON_EXISTENCE':
      return 'Несуществование';
    default:
      return 'Неизвестно';
  }
}


