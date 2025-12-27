import React, { useState, useEffect } from 'react';
import { Department, SubDepartment, DepartmentSection, StatisticDefinition, StatisticValue } from '../types';
import { 
  Edit2, Save, X, Target, AlertTriangle, 
  Zap, BookOpen, Settings, Users, TrendingUp, TrendingDown, FileText, Plus, Trash2,
  ArrowRight, Link as LinkIcon, CheckCircle, Info, BarChart3
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import StatsChart from './StatsChart';
import { analyzeTrend, getFilteredValues } from '../utils/statistics';

interface DepartmentDetailViewProps {
  department: Department;
  subDepartment?: SubDepartment;
  section?: DepartmentSection;
  isAdmin?: boolean;
  onSave?: (data: Partial<Department | SubDepartment | DepartmentSection>) => void;
}

export const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({
  department,
  subDepartment,
  section,
  isAdmin = false,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<StatisticDefinition[]>([]);
  const [statValues, setStatValues] = useState<Record<string, StatisticValue[]>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3w');

  const currentEntity = section || subDepartment || department;
  const entityType = section ? 'section' : subDepartment ? 'subdepartment' : 'department';
  const entityId = section?.id || subDepartment?.id || department.id;

  const handleStartEdit = () => {
    setEditData({ ...currentEntity });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave && editData) {
      onSave(editData);
    }
    setIsEditing(false);
    setEditData(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const updateField = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const addListItem = (field: string) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const updateListItem = (field: string, index: number, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: prev[field].map((item: string, i: number) => i === index ? value : item)
    }));
  };

  const removeListItem = (field: string, index: number) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: prev[field].filter((_: string, i: number) => i !== index)
    }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        setActiveSection(null);
      }, 2000);
    }
  };

  // Загружаем статистики для текущего департамента/отдела/секции
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        if (!supabase) return;

        // Загружаем определения статистик
        const { data: defs, error: defsError } = await supabase
          .from('statistics_definitions')
          .select('*')
          .eq('owner_id', entityId)
          .order('title');

        if (defsError) {
          console.warn('Ошибка загрузки статистик:', defsError);
          return;
        }

        if (defs && defs.length > 0) {
          setStatistics(defs);

          // Загружаем значения для всех статистик
          const statIds = defs.map(s => s.id);
          const { data: values, error: valuesError } = await supabase
            .from('statistics_values')
            .select('*')
            .in('definition_id', statIds)
            .order('date', { ascending: true });

          if (valuesError) {
            console.warn('Ошибка загрузки значений статистик:', valuesError);
            return;
          }

          // Группируем значения по definition_id
          const grouped: Record<string, StatisticValue[]> = {};
          if (values) {
            values.forEach(v => {
              if (!grouped[v.definition_id]) {
                grouped[v.definition_id] = [];
              }
              grouped[v.definition_id].push(v as StatisticValue);
            });
          }
          setStatValues(grouped);
        }
      } catch (error) {
        console.warn('Ошибка при загрузке статистик:', error);
      }
    };

    loadStatistics();
  }, [entityId]);

  const renderEditableText = (label: string, field: string, value?: string, multiline = false, description?: string) => {
    if (isEditing) {
      return (
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{label}</label>
          {description && (
            <p className="text-xs text-slate-500 mb-2 italic">{description}</p>
          )}
          {multiline ? (
            <textarea
              value={editData[field] || ''}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[140px] text-sm leading-relaxed transition-all"
              placeholder={`Введите ${label.toLowerCase()}...`}
            />
          ) : (
            <input
              type="text"
              value={editData[field] || ''}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
              placeholder={`Введите ${label.toLowerCase()}...`}
            />
          )}
        </div>
      );
    }
    if (!value) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h3>
          {description && (
            <Info size={14} className="text-slate-400" title={description} />
          )}
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>
        </div>
      </div>
    );
  };

  const renderStatCard = (stat: StatisticDefinition) => {
    const allVals = statValues[stat.id] || [];
    const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const vals = getFilteredValues(sortedVals, selectedPeriod as any);
    const { current, percent, direction, isGood } = analyzeTrend(vals, stat.inverted);
    const trendColorHex = isGood ? "#10b981" : "#f43f5e";
    const deptColor = department.color;

    return (
      <div 
        key={stat.id} 
        onClick={() => {
          // TODO: Добавить модальное окно для детального просмотра
          console.log('Stat clicked:', stat.id);
        }}
        className="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[180px] md:h-[210px] lg:h-[240px] transition-all group cursor-pointer hover:shadow-md hover:border-slate-300"
      >
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: deptColor }}></div>
        <div className="p-3 md:p-4 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1 pr-4">
              <h3 className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase leading-tight mb-0.5 line-clamp-2">{stat.title}</h3>
              <div className="text-[8px] md:text-[9px] text-slate-400 font-medium line-clamp-2 min-h-[20px] leading-snug">{stat.description || 'Описание показателя отсутствует'}</div>
            </div>
            {stat.inverted && <span className="text-[7px] md:text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-bold ml-1 flex-shrink-0">ОБР</span>}
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-base md:text-xl font-black text-slate-900">{current.toLocaleString()}</span>
            {vals.length > 1 && (
              <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                {direction === 'up' && <TrendingUp size={9} className="md:w-[10px] md:h-[10px]" />}
                {direction === 'down' && <TrendingDown size={9} className="md:w-[10px] md:h-[10px]" />}
                {Math.abs(percent).toFixed(0)}%
              </div>
            )}
          </div>
          <div className="flex-1 w-full min-h-0 relative">
            <StatsChart values={vals} color={trendColorHex} inverted={stat.inverted} isDouble={stat.is_double} />
          </div>
          {stat.is_favorite && <div className="absolute bottom-2 right-2 text-[8px] font-black text-amber-500 uppercase tracking-widest opacity-60">ГСД</div>}
        </div>
      </div>
    );
  };

  const renderEditableList = (label: string, field: string, items?: string[], description?: string) => {
    if (isEditing) {
      return (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</label>
              {description && (
                <p className="text-xs text-slate-500 mt-1 italic">{description}</p>
              )}
            </div>
            <button
              onClick={() => addListItem(field)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Добавить элемент"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {(editData[field] || []).map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateListItem(field, index, e.target.value)}
                  className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  placeholder={`${label} ${index + 1}...`}
                />
                <button
                  onClick={() => removeListItem(field, index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h3>
          {description && (
            <Info size={14} className="text-slate-400" title={description} />
          )}
          <span className="ml-auto text-xs text-slate-400 font-medium">({items.length})</span>
        </div>
        <div className="space-y-2 w-full">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-3 bg-gradient-to-r from-slate-50 to-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-all group w-full">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <p className="flex-1 text-sm text-slate-700 leading-relaxed break-words min-w-0">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in">
      {/* Кнопки редактирования */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-2 pb-4 border-b border-slate-200">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 text-sm shadow-md transition-all"
              >
                <Save size={18} />
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 flex items-center gap-2 text-sm transition-all"
              >
                <X size={18} />
                Отмена
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 flex items-center gap-2 text-sm transition-all"
            >
              <Edit2 size={18} />
              Редактировать
            </button>
          )}
        </div>
      )}

      {/* Главная статистика */}
      {(currentEntity.mainStat || isAdmin) && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 md:p-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-700 uppercase tracking-widest mb-1">Главная статистика</h3>
              <p className="text-xs text-slate-500">Ключевой показатель эффективности</p>
            </div>
          </div>
          {isEditing ? (
            <textarea
              value={editData?.mainStat || currentEntity.mainStat || ''}
              onChange={(e) => updateField('mainStat', e.target.value)}
              className="w-full text-sm font-bold text-blue-900 p-4 bg-white rounded-xl border-2 border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              rows={3}
              placeholder="Введите главную статистику..."
            />
          ) : currentEntity.mainStat ? (
            <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md">
              <p className="text-sm font-bold text-blue-900 leading-relaxed">{currentEntity.mainStat}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-md">
              <p className="text-sm text-slate-400 italic">Статистика не указана</p>
            </div>
          )}
        </div>
      )}

      {/* Все статистики */}
      {statistics.length > 0 && (
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 md:p-8 border-2 border-slate-200 shadow-lg">
          <div className="mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-500" />
                <h3 className="text-base font-black text-slate-700 uppercase tracking-widest">Все статистики</h3>
              </div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="1w">1 Нед.</option>
                <option value="3w">3 Нед.</option>
                <option value="1m">1 Мес.</option>
                <option value="3m">3 Мес.</option>
                <option value="6m">Полгода</option>
                <option value="1y">Год</option>
                <option value="all">Все</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">Статистики для {entityType === 'section' ? 'секции' : entityType === 'subdepartment' ? 'отдела' : 'департамента'}</p>
          </div>
          <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 pb-2">
            <div className="flex gap-3 md:gap-4 min-w-max">
              {statistics.map(stat => (
                <div key={stat.id} className="flex-shrink-0 w-[240px] md:w-[260px] lg:w-[280px]">
                  {renderStatCard(stat)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Основная информация */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 md:p-8 border-2 border-slate-200 shadow-lg">
        <div className="mb-6 pb-4 border-b border-slate-200">
          <h3 className="text-base font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Info size={16} className="text-slate-500" />
            Основная информация
          </h3>
          <p className="text-xs text-slate-500">Полное описание и характеристики</p>
        </div>
        {/* Показываем описание: если есть longDescription, показываем его как основное, description как краткое */}
        {currentEntity.longDescription ? (
          <>
            {currentEntity.description && currentEntity.description !== currentEntity.longDescription && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Краткое описание</h3>
                  <Info size={14} className="text-slate-400" title="Краткая версия описания" />
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                  <p className="text-sm text-slate-700 leading-relaxed">{currentEntity.description}</p>
                </div>
              </div>
            )}
            {renderEditableText('Детальное описание', 'longDescription', currentEntity.longDescription, true, 'Подробное описание всех аспектов деятельности')}
          </>
        ) : (
          renderEditableText('Описание', 'description', currentEntity.description, true, 'Описание назначения и роли')
        )}
        {renderEditableText('Цель', 'goal', currentEntity.goal, true, 'Главная цель и направление работы')}
        {renderEditableText('ЦКП (Ценный Конечный Продукт)', 'vfp', currentEntity.vfp, true, 'Ожидаемый результат работы')}
      </div>

      {/* Интерактивные карточки навигации */}
      {((currentEntity.functions && currentEntity.functions.length > 0) ||
        (currentEntity.tasks && currentEntity.tasks.length > 0) ||
        (currentEntity.tools && currentEntity.tools.length > 0) ||
        (currentEntity.processes && currentEntity.processes.length > 0) ||
        (entityType === 'department' && currentEntity.troubleSigns && currentEntity.troubleSigns.length > 0) ||
        (entityType === 'department' && currentEntity.developmentActions && currentEntity.developmentActions.length > 0) ||
        (currentEntity.keyIndicators && currentEntity.keyIndicators.length > 0)) && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 md:p-8 border-2 border-slate-200 shadow-lg">
          <div className="mb-6 pb-4 border-b border-slate-200">
            <h3 className="text-base font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Target size={16} className="text-slate-500" />
              Быстрая навигация
            </h3>
            <p className="text-xs text-slate-500">Нажмите на карточку для перехода к разделу</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {(currentEntity.functions && currentEntity.functions.length > 0) && (
              <button
                onClick={() => scrollToSection('functions')}
                className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'functions' ? 'border-blue-500 ring-4 ring-blue-200' : 'border-blue-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                  <Target className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Функции</span>
                <span className="text-xs text-slate-600">({currentEntity.functions.length})</span>
              </button>
            )}

            {(currentEntity.tasks && currentEntity.tasks.length > 0) && (
              <button
                onClick={() => scrollToSection('tasks')}
                className={`bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'tasks' ? 'border-emerald-500 ring-4 ring-emerald-200' : 'border-emerald-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                  <CheckCircle className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Задачи</span>
                <span className="text-xs text-slate-600">({currentEntity.tasks.length})</span>
              </button>
            )}

            {(currentEntity.tools && currentEntity.tools.length > 0) && (
              <button
                onClick={() => scrollToSection('tools')}
                className={`bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'tools' ? 'border-purple-500 ring-4 ring-purple-200' : 'border-purple-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                  <Settings className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Инструменты</span>
                <span className="text-xs text-slate-600">({currentEntity.tools.length})</span>
              </button>
            )}

            {(currentEntity.processes && currentEntity.processes.length > 0) && (
              <button
                onClick={() => scrollToSection('processes')}
                className={`bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'processes' ? 'border-amber-500 ring-4 ring-amber-200' : 'border-amber-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <Zap className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Процессы</span>
                <span className="text-xs text-slate-600">({currentEntity.processes.length})</span>
              </button>
            )}

            {entityType === 'department' && (currentEntity.troubleSigns && currentEntity.troubleSigns.length > 0) && (
              <button
                onClick={() => scrollToSection('troubleSigns')}
                className={`bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'troubleSigns' ? 'border-red-500 ring-4 ring-red-200' : 'border-red-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Признаки проблем</span>
                <span className="text-xs text-slate-600">({currentEntity.troubleSigns.length})</span>
              </button>
            )}

            {entityType === 'department' && (currentEntity.developmentActions && currentEntity.developmentActions.length > 0) && (
              <button
                onClick={() => scrollToSection('developmentActions')}
                className={`bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'developmentActions' ? 'border-emerald-500 ring-4 ring-emerald-200' : 'border-emerald-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Действия по развитию</span>
                <span className="text-xs text-slate-600">({currentEntity.developmentActions.length})</span>
              </button>
            )}

            {(currentEntity.keyIndicators && currentEntity.keyIndicators.length > 0) && (
              <button
                onClick={() => scrollToSection('keyIndicators')}
                className={`bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 md:p-5 border-2 shadow-md transition-all hover:shadow-xl hover:scale-105 flex flex-col items-center gap-2 ${
                  activeSection === 'keyIndicators' ? 'border-blue-500 ring-4 ring-blue-200' : 'border-blue-200'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <span className="font-bold text-slate-800 text-sm md:text-base text-center">Ключевые показатели</span>
                <span className="text-xs text-slate-600">({currentEntity.keyIndicators.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Функции и задачи */}
      {((currentEntity.functions && currentEntity.functions.length > 0) || (currentEntity.tasks && currentEntity.tasks.length > 0)) && (
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {(currentEntity.functions && currentEntity.functions.length > 0) && (
            <div id="section-functions" className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 md:p-8 border-2 border-blue-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
                  <Target className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Функции</h3>
                  <p className="text-xs text-slate-500">Основные направления деятельности</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Функции', 'functions', currentEntity.functions, 'Список основных функций и обязанностей')}
              </div>
            </div>
          )}

          {(currentEntity.tasks && currentEntity.tasks.length > 0) && (
            <div id="section-tasks" className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 md:p-8 border-2 border-emerald-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                  <CheckCircle className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Задачи</h3>
                  <p className="text-xs text-slate-500">Конкретные задачи и обязанности</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Задачи', 'tasks', currentEntity.tasks, 'Список задач, которые необходимо выполнять')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Инструменты и процессы */}
      {((currentEntity.tools && currentEntity.tools.length > 0) || (currentEntity.processes && currentEntity.processes.length > 0)) && (
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {(currentEntity.tools && currentEntity.tools.length > 0) && (
            <div id="section-tools" className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 md:p-8 border-2 border-purple-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-200">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-md">
                  <Settings className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Инструменты</h3>
                  <p className="text-xs text-slate-500">Используемые инструменты и ресурсы</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Инструменты', 'tools', currentEntity.tools, 'Список инструментов, программ и ресурсов')}
              </div>
            </div>
          )}

          {(currentEntity.processes && currentEntity.processes.length > 0) && (
            <div id="section-processes" className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 md:p-8 border-2 border-amber-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-200">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md">
                  <Zap className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Процессы</h3>
                  <p className="text-xs text-slate-500">Рабочие процессы и процедуры</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Процессы', 'processes', currentEntity.processes, 'Описание рабочих процессов и процедур')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Признаки проблем и действия по развитию - только для департаментов */}
      {entityType === 'department' && (currentEntity.troubleSigns || currentEntity.developmentActions) && (
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {currentEntity.troubleSigns && (
            <div id="section-troubleSigns" className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-6 md:p-8 border-2 border-red-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-red-200">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md">
                  <AlertTriangle className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Признаки проблем</h3>
                  <p className="text-xs text-slate-500">Индикаторы неэффективности</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Признаки проблем', 'troubleSigns', currentEntity.troubleSigns, 'Симптомы, указывающие на проблемы в работе')}
              </div>
            </div>
          )}

          {currentEntity.developmentActions && (
            <div id="section-developmentActions" className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 md:p-8 border-2 border-emerald-200 shadow-lg scroll-mt-4 w-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Действия по развитию</h3>
                  <p className="text-xs text-slate-500">Шаги для улучшения</p>
                </div>
              </div>
              <div className="w-full max-w-none">
                {renderEditableList('Действия по развитию', 'developmentActions', currentEntity.developmentActions, 'Конкретные действия для развития и улучшения')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Примеры */}
      {currentEntity.examples && currentEntity.examples.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 md:p-8 border-2 border-indigo-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-indigo-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Примеры</h3>
              <p className="text-xs text-slate-500">Конкретные примеры и кейсы</p>
            </div>
          </div>
          {renderEditableList('Примеры', 'examples', currentEntity.examples, 'Примеры работы и практические кейсы')}
        </div>
      )}

      {/* Ключевые показатели */}
      {currentEntity.keyIndicators && currentEntity.keyIndicators.length > 0 && (
        <div id="section-keyIndicators" className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border-2 border-blue-200 shadow-lg scroll-mt-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-md">
              <TrendingUp className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Ключевые показатели</h3>
              <p className="text-xs text-slate-500">Метрики эффективности</p>
            </div>
          </div>
          {renderEditableList('Ключевые показатели', 'keyIndicators', currentEntity.keyIndicators, 'KPI и метрики для оценки работы')}
        </div>
      )}

      {/* Поток продукта (только для департамента) */}
      {entityType === 'department' && currentEntity.productFlow && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 md:p-8 border-2 border-blue-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-200">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
              <ArrowRight className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Поток продукта</h3>
              <p className="text-xs text-slate-500">Описание движения продукта</p>
            </div>
          </div>
          {renderEditableText('Поток продукта', 'productFlow', currentEntity.productFlow, true, 'Описание того, как продукт движется через департамент')}
        </div>
      )}

      {/* Связи с другими департаментами */}
      {entityType === 'department' && currentEntity.connections && currentEntity.connections.length > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 md:p-8 border-2 border-purple-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-200">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-md">
              <LinkIcon className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Связи с другими департаментами</h3>
              <p className="text-xs text-slate-500">Взаимодействие с другими подразделениями</p>
            </div>
          </div>
          {renderEditableList('Связи', 'connections', currentEntity.connections, 'Список департаментов, с которыми происходит взаимодействие')}
        </div>
      )}
    </div>
  );
};
