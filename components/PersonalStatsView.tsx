import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { StatisticDefinition, StatisticValue } from '../types';
import { getFilteredValues } from '../utils/statistics';
import { analyzeTrend } from '../utils/statistics';
import { useToast } from './Toast';
import { useErrorHandler } from '../utils/errorHandler';
import StatsChart from './StatsChart';
import { TrendingUp, TrendingDown, Plus, X, Edit2, Trash2, Info, List, Minus, ArrowDownUp } from 'lucide-react';
import { format } from 'date-fns';

const PERIODS = [
  { id: '1w', label: '1 Нед.' },
  { id: '3w', label: '3 Нед.' },
  { id: '1m', label: '1 Мес.' },
  { id: '3m', label: '3 Мес.' },
  { id: '6m', label: 'Полгода' },
  { id: '1y', label: 'Год' },
  { id: 'all', label: 'Все' },
];

interface PersonalStatsViewProps {
  employeeId: string;
  employeeName?: string;
  isReadOnly?: boolean;
}

const getNearestThursday = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = (day <= 4 ? 4 : 11) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
};

const validateDate = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
};

export const PersonalStatsView: React.FC<PersonalStatsViewProps> = ({ 
  employeeId, 
  employeeName,
  isReadOnly = false 
}) => {
  const toast = useToast();
  const { handleError } = useErrorHandler();

  const [statsDefinitions, setStatsDefinitions] = useState<StatisticDefinition[]>([]);
  const [statsValues, setStatsValues] = useState<StatisticValue[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<string>('3w');
  const [newValueInput, setNewValueInput] = useState<Record<string, string>>({});
  const [newValueInput2, setNewValueInput2] = useState<Record<string, string>>({});
  const [newStatDate, setNewStatDate] = useState<string>(getNearestThursday());
  const [showStatManager, setShowStatManager] = useState(false);
  const [newStatData, setNewStatData] = useState({
    title: '',
    description: '',
    inverted: false,
    is_double: false,
    calculation_method: ''
  });
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [historyStatId, setHistoryStatId] = useState<string | null>(null);
  const [infoStatId, setInfoStatId] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) {
      fetchPersonalStats(employeeId);
    }
  }, [employeeId]);

  const fetchPersonalStats = async (empId: string) => {
    setIsLoadingStats(true);
    try {
      if (supabase) {
        const { data: defs } = await supabase
          .from('statistics_definitions')
          .select('*')
          .eq('owner_id', empId);
        
        if (defs && defs.length > 0) {
          setStatsDefinitions(defs);
          const ids = defs.map(d => d.id);
          const { data: vals } = await supabase
            .from('statistics_values')
            .select('*')
            .in('definition_id', ids)
            .order('date', { ascending: true });
          setStatsValues(vals || []);
        } else {
          setStatsDefinitions([]);
          setStatsValues([]);
        }
      }
    } catch (error) {
      handleError(error, 'Ошибка загрузки статистик');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleCreatePersonalStat = async (template?: Partial<StatisticDefinition>) => {
    const titleToUse = template?.title || newStatData.title;
    if (!titleToUse) {
      toast.warning("Введите название статистики");
      return;
    }
    if (!supabase) {
      toast.error('База данных не настроена');
      return;
    }

    const newStat: Partial<StatisticDefinition> = {
      title: titleToUse,
      description: template?.description || newStatData.description || 'Личная статистика',
      owner_id: employeeId,
      type: 'employee',
      inverted: template?.inverted ?? newStatData.inverted,
      is_double: template?.is_double ?? newStatData.is_double,
      calculation_method: template?.calculation_method ?? newStatData.calculation_method
    };

    try {
      const { data, error } = await supabase
        .from('statistics_definitions')
        .insert([newStat])
        .select();

      if (error) {
        handleError(error, 'Ошибка создания статистики');
        return;
      }

      if (data && data.length > 0) {
        setStatsDefinitions(prev => [...prev, data[0] as StatisticDefinition]);
        setShowStatManager(false);
        setNewStatData({ title: '', description: '', inverted: false, is_double: false, calculation_method: '' });
        toast.success('Статистика создана');
      }
    } catch (err) {
      handleError(err, 'Ошибка при создании статистики');
    }
  };

  const handleDeleteStat = async (statId: string) => {
    if (!supabase) {
      toast.error('База данных не настроена');
      return;
    }

    try {
      const { error: valuesError } = await supabase
        .from('statistics_values')
        .delete()
        .eq('definition_id', statId);
      
      if (valuesError) {
        handleError(valuesError, 'Ошибка удаления значений статистики');
        return;
      }

      const { error } = await supabase
        .from('statistics_definitions')
        .delete()
        .eq('id', statId);

      if (error) {
        handleError(error, 'Ошибка удаления статистики');
        return;
      }

      setStatsDefinitions(prev => prev.filter(s => s.id !== statId));
      setStatsValues(prev => prev.filter(v => v.definition_id !== statId));
      toast.success('Статистика удалена');
    } catch (err) {
      handleError(err, 'Ошибка при удалении статистики');
    }
  };

  const handleAddValue = async (statId: string, isDouble: boolean) => {
    try {
      const valStr = newValueInput[statId];
      if (!valStr) {
        toast.warning('Введите значение');
        return;
      }

      const val = parseFloat(valStr);
      if (isNaN(val)) {
        toast.error('Неверное числовое значение');
        return;
      }

      let val2 = 0;
      if (isDouble && newValueInput2[statId]) {
        val2 = parseFloat(newValueInput2[statId]);
        if (isNaN(val2)) {
          toast.error('Неверное значение для второго параметра');
          return;
        }
      }

      const date = newStatDate;
      if (!validateDate(date)) {
        toast.error('Неверная дата');
        return;
      }

      if (!supabase) {
        toast.error('База данных не настроена');
        return;
      }

      const { data, error } = await supabase
        .from('statistics_values')
        .insert([{ definition_id: statId, value: val, value2: val2, date: date }])
        .select();

      if (error) {
        handleError(error, 'Ошибка сохранения значения статистики');
        return;
      }

      if (data && data.length > 0) {
        setStatsValues(prev => [...prev, data[0] as StatisticValue]);
        setNewValueInput(prev => ({ ...prev, [statId]: '' }));
        if (isDouble) setNewValueInput2(prev => ({ ...prev, [statId]: '' }));
        toast.success('Значение сохранено');
      }
    } catch (error) {
      handleError(error, 'Ошибка при добавлении значения');
    }
  };

  const getFilteredValuesForStat = (statId: string) => {
    const vals = statsValues.filter(v => v.definition_id === statId);
    return getFilteredValues(vals, statsPeriod as import('../utils/statistics').PeriodType);
  };

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1.5 h-5 md:h-6 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <span className="truncate">{employeeName ? `Личная статистика: ${employeeName}` : 'Мои статистики'}</span>
          </h3>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">Отслеживание личных показателей эффективности</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto w-full sm:w-auto custom-scrollbar">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setStatsPeriod(p.id)}
                className={`flex-shrink-0 px-2.5 md:px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                  statsPeriod === p.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowStatManager(!showStatManager)}
              className={`p-2 rounded-xl transition-all border flex-shrink-0 ${
                showStatManager
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
              }`}
              title="Управление статистиками"
            >
              <Plus size={18} className="md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stat Manager */}
      {showStatManager && !isReadOnly && (
        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-blue-100 shadow-lg mb-4 md:mb-6 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h4 className="text-xs md:text-sm font-bold text-blue-900 uppercase tracking-wide">Добавление статистики</h4>
            <button onClick={() => setShowStatManager(false)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
              <X size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              value={newStatData.title}
              onChange={e => setNewStatData({ ...newStatData, title: e.target.value })}
              placeholder="Название статистики"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
            />
            <textarea
              value={newStatData.description}
              onChange={e => setNewStatData({ ...newStatData, description: e.target.value })}
              placeholder="Описание и метод подсчета..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-blue-100 outline-none"
            />
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStatData.inverted}
                  onChange={e => setNewStatData({ ...newStatData, inverted: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Обратная
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newStatData.is_double}
                  onChange={e => setNewStatData({ ...newStatData, is_double: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Двойная
              </label>
            </div>
            <button
              onClick={() => handleCreatePersonalStat()}
              disabled={!newStatData.title}
              className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              Создать
            </button>
          </div>
        </div>
      )}

      {statsDefinitions.length === 0 && (
        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
          <TrendingUp className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 font-medium text-sm">Нет назначенных статистик</p>
          {!isReadOnly && (
            <button
              onClick={() => setShowStatManager(true)}
              className="mt-2 text-blue-600 font-bold text-xs hover:underline"
            >
              Добавить статистику
            </button>
          )}
        </div>
      )}

      {statsDefinitions.map(stat => {
        if (!stat) return null;
        const vals = getFilteredValuesForStat(stat.id);
        const { direction, percent, current, isGood } = analyzeTrend(vals, stat.inverted);

        return (
          <div
            key={stat.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group"
          >
            <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start bg-white">
              <div className="flex-1 pr-4">
                <div className="flex items-start gap-2 mb-1">
                  <h4 className="font-bold text-lg text-slate-800 leading-tight">{stat.title}</h4>
                  <button
                    onClick={() => setInfoStatId(infoStatId === stat.id ? null : stat.id)}
                    className="text-slate-300 hover:text-blue-600 transition-colors mt-0.5"
                  >
                    <Info size={16} />
                  </button>
                </div>
                {stat.inverted && (
                  <div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5">
                    <ArrowDownUp size={10} /> ОБРАТНАЯ
                  </div>
                )}
                <p className="text-xs text-slate-500 font-medium line-clamp-2">
                  {stat.description || 'Личный показатель эффективности'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  {current.toLocaleString()}
                </div>
                {vals.length > 1 && (
                  <div
                    className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 px-2 py-0.5 rounded-lg ${
                      isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {direction === 'up' ? (
                      <TrendingUp size={12} />
                    ) : direction === 'down' ? (
                      <TrendingDown size={12} />
                    ) : (
                      <Minus size={12} />
                    )}
                    {Math.abs(percent).toFixed(1)}%
                  </div>
                )}
              </div>

              {!isReadOnly && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                  <button
                    onClick={() => setHistoryStatId(stat.id)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="История значений"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteStat(stat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Удалить статистику"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Chart */}
            {vals.length > 0 && (
              <div className="p-4 bg-slate-50">
                <StatsChart
                  values={vals}
                  inverted={stat.inverted}
                  isDouble={stat.is_double}
                  title={stat.title}
                />
              </div>
            )}

            {/* Add Value Form */}
            {!isReadOnly && (
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={newStatDate}
                    onChange={e => setNewStatDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex-shrink-0"
                  />
                  <input
                    type="number"
                    value={newValueInput[stat.id] || ''}
                    onChange={e => setNewValueInput(prev => ({ ...prev, [stat.id]: e.target.value }))}
                    placeholder="Значение"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  {stat.is_double && (
                    <input
                      type="number"
                      value={newValueInput2[stat.id] || ''}
                      onChange={e => setNewValueInput2(prev => ({ ...prev, [stat.id]: e.target.value }))}
                      placeholder="Значение 2"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  )}
                  <button
                    onClick={() => handleAddValue(stat.id, stat.is_double || false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            )}

            {/* History Modal */}
            {historyStatId === stat.id && (
              <div className="absolute inset-0 bg-white z-30 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold">История: {stat.title}</h4>
                  <button
                    onClick={() => setHistoryStatId(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-2">
                  {statsValues
                    .filter(v => v.definition_id === stat.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(val => (
                      <div
                        key={val.id}
                        className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"
                      >
                        <span className="text-sm font-medium">
                          {format(new Date(val.date), 'dd.MM.yyyy')}
                        </span>
                        <span className="text-lg font-bold">
                          {val.value}
                          {stat.is_double && val.value2 !== undefined && ` / ${val.value2}`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

