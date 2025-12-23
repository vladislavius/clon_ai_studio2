import React, { useState, useEffect } from 'react';
import { getCompanyVFP, getDivisionsWithStats, getStatsByOwner } from '../api/mockAdminTechApi';
import { CompanyVFP, Division, Stat } from '../../shared/types/adminTech';
import { DivisionDetailsDrawer } from './DivisionDetailsDrawer';
import { TrendBadge } from '../../shared/components/TrendBadge';
import { Loader2 } from 'lucide-react';

export const VfpMapPage: React.FC = () => {
  const [companyVFP, setCompanyVFP] = useState<CompanyVFP | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [divisionStats, setDivisionStats] = useState<Record<string, Stat>>({});
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [vfp, divs] = await Promise.all([
          getCompanyVFP(),
          getDivisionsWithStats(),
        ]);

        setCompanyVFP(vfp);
        setDivisions(divs);

        // Загружаем статистики для каждого дивизиона
        const statsMap: Record<string, Stat> = {};
        for (const div of divs) {
          const stats = await getStatsByOwner('DIVISION', div.id);
          const mainStat = stats.find(s => s.id === div.mainStatId);
          if (mainStat) {
            statsMap[div.id] = mainStat;
          }
        }
        setDivisionStats(statsMap);
      } catch (error) {
        console.error('Error loading VFP map data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">
          Карта ЦКП и орг-ответственности
        </h1>

        {/* Центральная карточка ЦКП компании */}
        <div className="flex justify-center mb-8">
          <div
            className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 md:p-8 shadow-lg max-w-md w-full"
          >
            <div className="text-center">
              <div className="text-amber-600 font-bold text-xs uppercase tracking-wider mb-2">
                ЦКП Компании
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
                {companyVFP?.title}
              </h2>
              <p className="text-sm md:text-base text-slate-600">
                {companyVFP?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Сетка дивизионов */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {divisions.map(division => {
            const stat = divisionStats[division.id];
            return (
              <div
                key={division.id}
                onClick={() => setSelectedDivision(division)}
                className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-all shadow-sm hover:shadow-md"
                style={{
                  borderTopColor: division.color,
                  borderTopWidth: '4px',
                }}
              >
                <div className="mb-3">
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: division.color }}
                  >
                    {division.name}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2">
                    {division.mainProduct}
                  </h3>
                </div>

                {stat && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">{stat.name}</div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {stat.fact.toLocaleString()} {stat.unit}
                        </div>
                        <div className="text-xs text-slate-500">
                          План: {stat.plan.toLocaleString()} {stat.unit}
                        </div>
                      </div>
                      <TrendBadge trend={stat.trend} changePercent={stat.changePercent} size="sm" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDivision && (
        <DivisionDetailsDrawer
          division={selectedDivision}
          mainStat={divisionStats[selectedDivision.id]}
          onClose={() => setSelectedDivision(null)}
        />
      )}
    </div>
  );
};

