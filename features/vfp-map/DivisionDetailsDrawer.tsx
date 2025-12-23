import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Division, Department, Stat } from '../../shared/types/adminTech';
import { getDepartmentsByDivision, getStatsByOwner } from '../api/mockAdminTechApi';
import { DepartmentDetailsDrawer } from './DepartmentDetailsDrawer';
import { TrendBadge } from '../../shared/components/TrendBadge';
import { StatMiniChart } from '../../shared/components/StatMiniChart';

interface DivisionDetailsDrawerProps {
  division: Division;
  mainStat: Stat | undefined;
  onClose: () => void;
}

export const DivisionDetailsDrawer: React.FC<DivisionDetailsDrawerProps> = ({
  division,
  mainStat,
  onClose,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allStats, setAllStats] = useState<Stat[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [depts, stats] = await Promise.all([
          getDepartmentsByDivision(division.id),
          getStatsByOwner('DIVISION', division.id),
        ]);
        setDepartments(depts);
        setAllStats(stats);
      } catch (error) {
        console.error('Error loading division details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [division.id]);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: division.color }}
              >
                {division.id}
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                  {division.name}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{division.mainProduct}</p>
              </div>
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
                Ключевая статистика дивизиона
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

          {/* Departments */}
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
              Отделы ({departments.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Загрузка...</div>
            ) : departments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">Нет отделов</div>
            ) : (
              <div className="space-y-2">
                {departments.map(dept => {
                  const deptStat = allStats.find(s => s.id === dept.mainStatId);
                  return (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept)}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 mb-1">{dept.name}</div>
                          <div className="text-xs text-slate-500 mb-2">{dept.vfp}</div>
                          {deptStat && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600">{deptStat.name}:</span>
                              <span className="text-xs font-semibold text-slate-800">
                                {deptStat.fact.toLocaleString()} {deptStat.unit}
                              </span>
                              <TrendBadge
                                trend={deptStat.trend}
                                changePercent={deptStat.changePercent}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                        <ChevronRight size={20} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDepartment && (
        <DepartmentDetailsDrawer
          department={selectedDepartment}
          onClose={() => setSelectedDepartment(null)}
        />
      )}
    </>
  );
};

