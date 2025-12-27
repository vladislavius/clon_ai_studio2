import React, { useState, useEffect, useMemo } from 'react';
import { Filter, AlertTriangle } from 'lucide-react';
import { Stat, StatOwnerType } from '../../shared/types/adminTech';
import { getAllStats, getSuggestedConditionForStat } from '../api/mockAdminTechApi';
import { StatDetailsModal } from './StatDetailsModal';
import { TrendBadge } from '../../shared/components/TrendBadge';
import { OwnerLabel } from '../../shared/components/OwnerLabel';
import { getConditionColor, getConditionLabel } from '../../shared/utils/statCalculations';

export const StatsDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [ownerFilter, setOwnerFilter] = useState<StatOwnerType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allStats = await getAllStats();
        setStats(allStats);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredStats = useMemo(() => {
    return stats.filter(stat => {
      if (periodFilter !== 'ALL' && stat.period !== periodFilter) return false;
      if (ownerFilter !== 'ALL' && stat.ownerType !== ownerFilter) return false;
      return true;
    });
  }, [stats, periodFilter, ownerFilter]);

  // Топ падающих и растущих статистик
  const topFalling = useMemo(() => {
    return [...filteredStats]
      .filter(s => s.trend === 'DOWN')
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);
  }, [filteredStats]);

  const topRising = useMemo(() => {
    return [...filteredStats]
      .filter(s => s.trend === 'UP')
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);
  }, [filteredStats]);

  const handleCreateZRS = (statId: string, conditionLevel: string) => {
    console.log('Create ZRS for stat:', statId, 'condition:', conditionLevel);
    alert(`Создание ЗРС для статистики ${statId} с условием ${conditionLevel}`);
  };

  const handleCreateProgram = (statId: string, conditionLevel: string) => {
    console.log('Create program for stat:', statId, 'condition:', conditionLevel);
    alert(`Создание программы для статистики ${statId} с условием ${conditionLevel}`);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">
          Управление по статистикам и условиям
        </h1>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 md:p-6 mb-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Период
              </label>
              <select
                value={periodFilter}
                onChange={e => setPeriodFilter(e.target.value as 'WEEK' | 'MONTH' | 'ALL')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">Все периоды</option>
                <option value="WEEK">Неделя</option>
                <option value="MONTH">Месяц</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Владелец
              </label>
              <select
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value as StatOwnerType | 'ALL')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">Все</option>
                <option value="COMPANY">Компания</option>
                <option value="DIVISION">Дивизион</option>
                <option value="DEPARTMENT">Отдел</option>
                <option value="EMPLOYEE">Сотрудник</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Stats Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Статистики ({filteredStats.length})
            </h2>
            {loading ? (
              <div className="text-center py-12 text-slate-400">Загрузка...</div>
            ) : filteredStats.length === 0 ? (
              <div className="text-center py-12 text-slate-400">Нет статистик</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStats.map(stat => (
                  <div
                    key={stat.id}
                    onClick={() => setSelectedStatId(stat.id)}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 cursor-pointer transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 mb-1">{stat.name}</div>
                        <OwnerLabel ownerType={stat.ownerType} ownerName={stat.ownerId} size="sm" />
                      </div>
                      {stat.trend === 'DOWN' && stat.changePercent < -20 && (
                        <AlertTriangle
                          size={20}
                          className="text-red-500 flex-shrink-0"
                          title="Рекомендуется сформировать ЗРС"
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className="text-lg font-bold text-slate-800">
                          {stat.fact.toLocaleString()} {stat.unit}
                        </div>
                        <div className="text-xs text-slate-500">
                          План: {stat.plan.toLocaleString()} {stat.unit}
                        </div>
                      </div>
                      <TrendBadge trend={stat.trend} changePercent={stat.changePercent} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Falling */}
            <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">
                Падающие статистики
              </h3>
              {topFalling.length === 0 ? (
                <div className="text-xs text-slate-400">Нет падающих статистик</div>
              ) : (
                <div className="space-y-2">
                  {topFalling.map(stat => (
                    <div
                      key={stat.id}
                      onClick={() => setSelectedStatId(stat.id)}
                      className="text-xs cursor-pointer hover:text-red-700"
                    >
                      <div className="font-semibold truncate">{stat.name}</div>
                      <div className="text-red-600">
                        {stat.changePercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Rising */}
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-600 uppercase mb-3">
                Растущие статистики
              </h3>
              {topRising.length === 0 ? (
                <div className="text-xs text-slate-400">Нет растущих статистик</div>
              ) : (
                <div className="space-y-2">
                  {topRising.map(stat => (
                    <div
                      key={stat.id}
                      onClick={() => setSelectedStatId(stat.id)}
                      className="text-xs cursor-pointer hover:text-emerald-700"
                    >
                      <div className="font-semibold truncate">{stat.name}</div>
                      <div className="text-emerald-600">
                        +{stat.changePercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedStatId && (
        <StatDetailsModal
          statId={selectedStatId}
          onClose={() => setSelectedStatId(null)}
          onCreateZRS={handleCreateZRS}
          onCreateProgram={handleCreateProgram}
        />
      )}
    </div>
  );
};


