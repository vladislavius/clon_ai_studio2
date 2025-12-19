
import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { StatisticDefinition, StatisticValue } from '../types';
import {
  predictNextValue,
  calculateAverage,
  calculateMedian,
  analyzeTrendType,
  compareDepartments,
  generateRecommendations,
  TrendType,
} from '../utils/analytics';
import { ORGANIZATION_STRUCTURE } from '../constants';
import StatsChart from './StatsChart';

interface AnalyticsDashboardProps {
  definitions: StatisticDefinition[];
  values: Record<string, StatisticValue[]>;
  selectedPeriod: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  definitions,
  values,
  selectedPeriod,
}) => {
  const getFilteredValues = (statId: string) => {
    const vals = values[statId] || [];
    if (!vals.length) return [];
    const sorted = [...vals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const total = sorted.length;
    switch (selectedPeriod) {
      case '1w': return sorted.slice(Math.max(0, total - 2));
      case '3w': return sorted.slice(Math.max(0, total - 4));
      case '1m': return sorted.slice(Math.max(0, total - 5));
      case '3m': return sorted.slice(Math.max(0, total - 13));
      case '6m': return sorted.slice(Math.max(0, total - 26));
      case '1y': return sorted.slice(Math.max(0, total - 52));
      case 'all': return sorted;
      default: return sorted.slice(Math.max(0, total - 13));
    }
  };

  const analyticsData = useMemo(() => {
    return definitions
      .filter(def => (values[def.id] || []).length > 0)
      .map(def => {
        const statValues = getFilteredValues(def.id);
        const trendType = analyzeTrendType(statValues);
        const prediction = predictNextValue(statValues);
        const recommendations = generateRecommendations(def, statValues);
        const avg = calculateAverage(statValues);
        const median = calculateMedian(statValues);

        return {
          definition: def,
          values: statValues,
          trendType,
          prediction,
          recommendations,
          average: avg,
          median,
        };
      });
  }, [definitions, values, selectedPeriod]);

  const getTrendColor = (trend: TrendType) => {
    switch (trend) {
      case 'growing': return 'text-emerald-600 bg-emerald-50';
      case 'declining': return 'text-red-600 bg-red-50';
      case 'volatile': return 'text-amber-600 bg-amber-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getTrendLabel = (trend: TrendType) => {
    switch (trend) {
      case 'growing': return 'Рост';
      case 'declining': return 'Снижение';
      case 'volatile': return 'Волатильность';
      default: return 'Стабильно';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Расширенная аналитика</h2>
        <p className="text-slate-500">Прогнозирование трендов и сравнение департаментов</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Всего статистик</span>
            <BarChart3 size={20} className="text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{analyticsData.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Растущие</span>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {analyticsData.filter(a => a.trendType === 'growing').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Снижающиеся</span>
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <div className="text-3xl font-black text-red-600">
            {analyticsData.filter(a => a.trendType === 'declining').length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Стабильные</span>
            <Target size={20} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black text-blue-600">
            {analyticsData.filter(a => a.trendType === 'stable').length}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analyticsData.map(({ definition, values: statValues, trendType, prediction, recommendations, average, median }) => (
          <div key={definition.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-800 mb-1">{definition.title}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getTrendColor(trendType)}`}>
                    {getTrendLabel(trendType)}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Среднее</div>
                <div className="text-xl font-black text-slate-900">{average.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Медиана</div>
                <div className="text-xl font-black text-slate-900">{median.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-1">Прогноз</div>
                <div className="text-xl font-black text-blue-600">
                  {prediction !== null ? prediction.toFixed(0) : '—'}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-48 mb-4 bg-slate-50 rounded-xl p-2">
              <StatsChart values={statValues} inverted={definition.inverted} isDouble={definition.is_double} />
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Info size={12} /> Рекомендации
                </div>
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                      rec.type === 'warning'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800'
                        : rec.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}
                  >
                    {rec.type === 'warning' ? (
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{rec.message}</p>
                      {rec.action && <p className="text-xs mt-1 opacity-75">{rec.action}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

