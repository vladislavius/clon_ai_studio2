import React, { useState, useEffect } from 'react';
import { X, TrendingUp, User } from 'lucide-react';
import { Department, Stat, Employee } from '../../shared/types/adminTech';
import { getStatsByOwner, getEmployeesByDepartment } from '../api/mockAdminTechApi';
import { TrendBadge } from '../../shared/components/TrendBadge';
import { StatMiniChart } from '../../shared/components/StatMiniChart';
import { StatDetailsModal } from '../stats-dashboard/StatDetailsModal';

interface DepartmentDetailsDrawerProps {
  department: Department;
  onClose: () => void;
  onStatClick?: (statId: string) => void;
}

export const DepartmentDetailsDrawer: React.FC<DepartmentDetailsDrawerProps> = ({
  department,
  onClose,
  onStatClick,
}) => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedStatId, setSelectedStatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [deptStats, deptEmployees] = await Promise.all([
          getStatsByOwner('DEPARTMENT', department.id),
          getEmployeesByDepartment(department.id),
        ]);
        setStats(deptStats);
        setEmployees(deptEmployees);
      } catch (error) {
        console.error('Error loading department details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [department.id]);

  const mainStat = stats.find(s => s.id === department.mainStatId);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50" onClick={onClose}>
      <div
        className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">
                {department.name}
              </h2>
              <p className="text-sm text-slate-600">{department.vfp}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Stat */}
          {mainStat && (
            <div className="bg-slate-50 rounded-xl p-4 md:p-6 mb-6 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Основная статистика отдела
              </h3>
              <div className="mb-4">
                <div className="text-lg font-bold text-slate-800 mb-2">{mainStat.name}</div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-2xl font-bold text-slate-800">
                      {mainStat.fact.toLocaleString()} {mainStat.unit}
                    </div>
                    <div className="text-sm text-slate-500">
                      План: {mainStat.plan.toLocaleString()} {mainStat.unit}
                    </div>
                  </div>
                  <TrendBadge trend={mainStat.trend} changePercent={mainStat.changePercent} />
                </div>
                {mainStat.history && mainStat.history.length > 0 && (
                  <div className="mt-4">
                    <StatMiniChart data={mainStat.history} width={300} height={60} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* All Stats */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Все статистики отдела ({stats.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Загрузка...</div>
            ) : stats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Нет статистик</div>
            ) : (
              <div className="space-y-2">
                {stats.map(stat => (
                  <div
                    key={stat.id}
                    onClick={() => {
                      setSelectedStatId(stat.id);
                      onStatClick?.(stat.id);
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 mb-1">{stat.name}</div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-600">
                            {stat.fact.toLocaleString()} {stat.unit}
                          </span>
                          <TrendBadge
                            trend={stat.trend}
                            changePercent={stat.changePercent}
                            size="sm"
                          />
                        </div>
                      </div>
                      <TrendingUp size={20} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employees */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Сотрудники ({employees.length})
            </h3>
            {employees.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Нет сотрудников</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {employees.map(emp => (
                  <div
                    key={emp.id}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        {emp.avatarUrl ? (
                          <img
                            src={emp.avatarUrl}
                            alt={emp.fullName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {emp.fullName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{emp.position}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedStatId && (
        <StatDetailsModal
          statId={selectedStatId}
          onClose={() => setSelectedStatId(null)}
        />
      )}
    </div>
  );
};

