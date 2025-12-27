import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { StatisticDefinition, StatisticValue, WiseCondition, Employee } from '../types';
import { ORGANIZATION_STRUCTURE, HANDBOOK_STATISTICS } from '../constants';
import StatsChart from './StatsChart';
import ConfirmationModal from './ConfirmationModal';
import { TrendingUp, TrendingDown, LayoutDashboard, Info, HelpCircle, Building2, Layers, Calendar, Edit2, X, List, Search, Plus, Trash2, Sliders, Save, AlertCircle, ArrowDownUp, Download, Upload, Maximize2, MoreHorizontal, Minus, ChevronDown, ChevronUp, FileSpreadsheet, Target, Award, Crown, FileText, BarChart3, FileText as FileTextIcon, CheckCircle, User } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { exportStatisticsToCSV, exportStatisticsToExcel, exportStatisticsWeekly } from '../utils/exportUtils';
import { analyzeTrend, getFilteredValues } from '../utils/statistics';
import { useToast } from './Toast';
import { useErrorHandler } from '../utils/errorHandler';
import { getAllStats, getStatById, updateStatPlan, getSuggestedConditionForStat } from '../features/api/mockAdminTechApi';
import { Stat, StatCondition } from '../shared/types/adminTech';
import { PlanFactChart } from '../shared/components/PlanFactChart';
import { TrendBadge } from '../shared/components/TrendBadge';
import { getConditionColor, getConditionLabel } from '../shared/utils/statCalculations';
import { ProgramCreator, Program } from './ProgramCreator';
import { PersonalStatsView } from './PersonalStatsView';
import { useAuth } from '../hooks/useAuth';

interface StatisticsTabProps {
  employees: Employee[];
  isOffline?: boolean;
  selectedDeptId?: string | null;
  isAdmin?: boolean;
}

const DEMO_DEFINITIONS: StatisticDefinition[] = HANDBOOK_STATISTICS.map((s, i) => ({ ...s, id: `demo-stat-${i}`, type: 'department', description: s.title.includes('ГСД') ? 'Ключевой показатель эффективности подразделения.' : 'Вспомогательная статистика для мониторинга деятельности.' }));
const generateMockHistory = (baseVal: number, weeks: number = 52) => {
  return Array.from({ length: weeks }).map((_, i) => {
    const weekOffset = weeks - 1 - i;
    const d = new Date();
    d.setDate(d.getDate() - (weekOffset * 7));
    const trend = Math.sin(i / 8) * (baseVal * 0.1) + (i / weeks * baseVal * 0.4);
    const noise = (Math.random() - 0.5) * (baseVal * 0.1);
    let val = Math.max(0, Math.floor(baseVal + trend + noise));
    let val2 = val * 0.7;
    return { id: `mock-val-${Date.now()}-${i}`, definition_id: 'temp', date: format(d, 'yyyy-MM-dd'), value: val, value2: val2 };
  });
};
const DEMO_VALUES: Record<string, StatisticValue[]> = {};
DEMO_DEFINITIONS.forEach((def) => { let base = 100; if (def.title.includes('Выручка') || def.title.includes('Доход')) base = 1500000; DEMO_VALUES[def.id] = generateMockHistory(base, 52).map(v => ({ ...v, definition_id: def.id })); });

const DEPT_ORDER = ['owner', 'dept7', 'dept1', 'dept2', 'dept3', 'dept4', 'dept5', 'dept6'];

const PERIODS = [
  { id: '1w', label: '1 Нед.' },
  { id: '3w', label: '3 Нед.' },
  { id: '1m', label: '1 Мес.' },
  { id: '3m', label: '3 Мес.' },
  { id: '6m', label: 'Полгода' },
  { id: '1y', label: 'Год' },
  { id: 'all', label: 'Все' },
];

// analyzeTrend теперь импортируется из utils/statistics

const StatisticsTab: React.FC<StatisticsTabProps> = ({ employees, isOffline, selectedDeptId, isAdmin }) => {
  const toast = useToast();
  const { handleError } = useErrorHandler();
  const { session } = useAuth();

  const [viewMode, setViewMode] = useState<'department' | 'personal'>('department');
  const [definitions, setDefinitions] = useState<StatisticDefinition[]>([]);
  const [allLatestValues, setAllLatestValues] = useState<Record<string, StatisticValue[]>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3w');
  const [displayMode, setDisplayMode] = useState<'dashboard' | 'list'>('dashboard');
  const [trendFilter, setTrendFilter] = useState<'all' | 'growing' | 'declining'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'achieved' | 'not_achieved'>('all');
  const [statPlanFactMap, setStatPlanFactMap] = useState<Record<string, { plan: number; fact: number }>>({});
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStatDef, setEditingStatDef] = useState<Partial<StatisticDefinition> | null>(null);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [selectedStatForValues, setSelectedStatForValues] = useState<StatisticDefinition | null>(null);
  const [currentStatValues, setCurrentStatValues] = useState<StatisticValue[]>([]);
  const [editingValue, setEditingValue] = useState<Partial<StatisticValue>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plan/Fact state for modal
  const [planFactData, setPlanFactData] = useState<Stat | null>(null);
  const [planFactCondition, setPlanFactCondition] = useState<StatCondition | null>(null);
  const [editingPlan, setEditingPlan] = useState<string>('');
  const [editingFact, setEditingFact] = useState<string>('');
  const [isEditingPlanFact, setIsEditingPlanFact] = useState(false);
  const [planFactLoading, setPlanFactLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'view' | 'create_program'>('view');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    statId: string | null;
  }>({ isOpen: false, title: '', message: '', statId: null });

  // Получаем ID текущего пользователя
  const currentUserId = session?.user?.id;
  const currentEmployee = employees.find(e => e.id === currentUserId);

  // Если режим "Мои статистики" и нет пользователя, переключаемся на дашборд отдела
  useEffect(() => {
    if (viewMode === 'personal' && !currentUserId) {
      setViewMode('department');
    }
  }, [viewMode, currentUserId]);

  useEffect(() => {
    // Загружаем данные только для дашборда отдела
    if (viewMode === 'department') {
      if (isOffline) {
        fetchDefinitions();
        fetchAllValues();
      } else {
        Promise.all([fetchDefinitions(), fetchAllValues()]);
      }
    }
  }, [isOffline, viewMode]);

  // Вычисляем план/факт для всех статистик с учетом периода (используем useMemo вместо useEffect)
  const computedPlanFactMap = useMemo(() => {
    if (definitions.length === 0 || displayMode !== 'dashboard') {
      return {};
    }

    const planFactMap: Record<string, { plan: number; fact: number }> = {};
    
    definitions.forEach(stat => {
      // ВАЖНО: используем отфильтрованные значения по выбранному периоду
      // Сортируем данные перед фильтрацией для гарантии правильного порядка
      const vals = allLatestValues[stat.id] || [];
      const sortedVals = [...vals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const filteredVals = getFilteredValues(sortedVals, selectedPeriod as import('../utils/statistics').PeriodType);
      const { current } = analyzeTrend(filteredVals, stat.inverted);
      
      planFactMap[stat.id] = {
        plan: current * 1.1,
        fact: current,
      };
    });
    
    return planFactMap;
  }, [definitions, displayMode, allLatestValues, selectedPeriod]);

  // Загружаем данные план/факт из API только один раз при загрузке definitions (асинхронно, не блокируя рендер)
  const [apiPlanFactData, setApiPlanFactData] = useState<Record<string, { plan: number; fact: number }>>({});
  
  useEffect(() => {
    if (definitions.length > 0 && displayMode === 'dashboard') {
      // Загружаем асинхронно, не блокируя рендер - используем setTimeout для отложенной загрузки
      const timer = setTimeout(() => {
        getAllStats()
          .then(allStats => {
            const apiPlanFactMap: Record<string, { plan: number; fact: number }> = {};
            
            definitions.forEach(stat => {
              const planFactStat = allStats.find(s => s.name === stat.title);
              if (planFactStat) {
                apiPlanFactMap[stat.id] = {
                  plan: planFactStat.plan,
                  fact: planFactStat.fact,
                };
              }
            });
            
            setApiPlanFactData(apiPlanFactMap);
          })
          .catch(error => {
            console.error('Error loading plan/fact from API:', error);
            setApiPlanFactData({});
          });
      }, 100); // Небольшая задержка чтобы не блокировать рендер
      
      return () => clearTimeout(timer);
    } else {
      setApiPlanFactData({});
    }
  }, [definitions, displayMode]);

  // Объединяем данные из API с вычисленными (API имеет приоритет, но факт обновляется из периода)
  // Используем useMemo для мгновенного обновления при изменении периода
  const mergedPlanFactMap = useMemo(() => {
    const merged: Record<string, { plan: number; fact: number }> = {};
    
    Object.keys(computedPlanFactMap).forEach(statId => {
      // Если есть данные из API, используем план из API, но факт из вычисленных (с учетом периода)
      if (apiPlanFactData[statId]) {
        merged[statId] = {
          plan: apiPlanFactData[statId].plan,
          fact: computedPlanFactMap[statId].fact, // Факт обновляется при изменении периода
        };
      } else {
        // Если нет данных из API, используем вычисленные
        merged[statId] = computedPlanFactMap[statId];
      }
    });
    
    return merged;
  }, [computedPlanFactMap, apiPlanFactData]);

  // Обновляем statPlanFactMap только когда mergedPlanFactMap изменился
  useEffect(() => {
    setStatPlanFactMap(mergedPlanFactMap);
  }, [mergedPlanFactMap]);

  // Загружаем данные план/факт при открытии модального окна или изменении периода
  useEffect(() => {
    if (expandedStatId) {
      const loadPlanFactForStat = async () => {
        setPlanFactLoading(true);
        try {
          const stat = definitions.find(d => d.id === expandedStatId);
          if (!stat) return;

          // ВАЖНО: используем отфильтрованные значения по выбранному периоду
          // Сортируем данные перед фильтрацией для гарантии правильного порядка
          const allVals = allLatestValues[stat.id] || [];
          const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const vals = getFilteredValues(sortedVals, selectedPeriod as import('../utils/statistics').PeriodType);
          const { current } = analyzeTrend(vals, stat.inverted);
          
          // Пытаемся получить данные из mock API
          try {
            const allStats = await getAllStats();
            let planFactStat = allStats.find(s => s.name === stat.title);
            if (!planFactStat) {
              planFactStat = {
                id: stat.id,
                name: stat.title,
                ownerType: stat.type === 'department' ? 'DEPARTMENT' : stat.type === 'employee' ? 'EMPLOYEE' : 'COMPANY',
                ownerId: stat.owner_id || '',
                unit: 'шт',
                period: 'WEEK',
                plan: current * 1.1,
                fact: current,
                previousFact: vals.length > 1 ? vals[vals.length - 2].value : current,
                trend: 'FLAT',
                changePercent: 0,
                history: vals.map(v => v.value), // Используем все отфильтрованные значения по выбранному периоду
              };
            }
            setPlanFactData(planFactStat);
            setEditingPlan(planFactStat.plan.toString());
            setEditingFact(planFactStat.fact.toString());
            
            const condition = await getSuggestedConditionForStat(planFactStat.id);
            setPlanFactCondition(condition);
          } catch (error) {
            console.error('Error loading plan/fact from API:', error);
            const planFactStat = {
              id: stat.id,
              name: stat.title,
              ownerType: stat.type === 'department' ? 'DEPARTMENT' : stat.type === 'employee' ? 'EMPLOYEE' : 'COMPANY',
              ownerId: stat.owner_id || '',
              unit: 'шт',
              period: 'WEEK',
              plan: current * 1.1,
              fact: current,
              previousFact: vals.length > 1 ? vals[vals.length - 2].value : current,
              trend: 'FLAT',
              changePercent: 0,
              history: vals.map(v => v.value), // Используем все отфильтрованные значения по выбранному периоду
            };
            setPlanFactData(planFactStat);
            setEditingPlan(planFactStat.plan.toString());
            setEditingFact(planFactStat.fact.toString());
          }
        } catch (error) {
          console.error('Error loading plan/fact:', error);
        } finally {
          setPlanFactLoading(false);
        }
      };
      loadPlanFactForStat();
      setModalTab('view');
    } else {
      setPlanFactData(null);
      setPlanFactCondition(null);
      setModalTab('view');
    }
  }, [expandedStatId, selectedPeriod, definitions, allLatestValues]);

  const fetchDefinitions = async () => {
    try {
      if (isOffline) {
        if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
        return;
      }
      
      if (!supabase) {
        console.warn('Supabase не инициализирован, используем демо-данные');
        if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
        return;
      }

      const { data, error } = await supabase
        .from('statistics_definitions')
        .select('*')
        .order('title');
        
      if (error) {
        // Если ошибка 401 (Unauthorized) - проблема с аутентификацией
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401')) {
          console.warn('Ошибка аутентификации при загрузке статистик, используем демо-данные');
          if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
          return;
        }
        
        // Если таблица не существует
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Таблица statistics_definitions не существует, используем демо-данные');
          if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
          return;
        }
        
        handleError(error, 'Ошибка загрузки определений статистик');
        return;
      }
      
      if (data) {
        setDefinitions(data);
      } else {
        // Если данных нет, используем демо-данные
        if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
      }
    } catch (error: any) {
      // Обработка сетевых ошибок (Failed to fetch)
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        console.warn('Сетевая ошибка при загрузке статистик, используем демо-данные');
        if (definitions.length === 0) setDefinitions(DEMO_DEFINITIONS);
        return;
      }
      handleError(error, 'Ошибка при получении статистик');
    }
  };

  const fetchAllValues = async () => {
    try {
      if (isOffline) {
        if (Object.keys(allLatestValues).length === 0) {
          const sortedDemo: Record<string, StatisticValue[]> = {};
          for (const k in DEMO_VALUES) {
            sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          setAllLatestValues(sortedDemo);
        }
        return;
      }
      
      if (!supabase) {
        console.warn('Supabase не инициализирован, используем демо-данные');
        if (Object.keys(allLatestValues).length === 0) {
          const sortedDemo: Record<string, StatisticValue[]> = {};
          for (const k in DEMO_VALUES) {
            sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          setAllLatestValues(sortedDemo);
        }
        return;
      }

      // Optimized select to reduce payload - используем индексы для ускорения
      // Загружаем с лимитом и сортировкой на стороне БД для оптимизации
      const { data, error } = await supabase
        .from('statistics_values')
        .select('id, definition_id, date, value, value2')
        .order('date', { ascending: true }); // Сортировка на стороне БД
      
      if (error) {
        // Если ошибка 401 (Unauthorized) - проблема с аутентификацией
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401')) {
          console.warn('Ошибка аутентификации при загрузке значений статистик, используем демо-данные');
          if (Object.keys(allLatestValues).length === 0) {
            const sortedDemo: Record<string, StatisticValue[]> = {};
            for (const k in DEMO_VALUES) {
              sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
            setAllLatestValues(sortedDemo);
          }
          return;
        }
        
        // Если таблица не существует
        if (error.code === '42P01' || error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('Таблица statistics_values не существует, используем демо-данные');
          if (Object.keys(allLatestValues).length === 0) {
            const sortedDemo: Record<string, StatisticValue[]> = {};
            for (const k in DEMO_VALUES) {
              sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
            setAllLatestValues(sortedDemo);
          }
          return;
        }
        
        handleError(error, 'Ошибка загрузки значений статистик');
        return;
      }
      
      if (data) {
        const grouped: Record<string, StatisticValue[]> = {};
        data.forEach((v: StatisticValue) => {
          if (!grouped[v.definition_id]) grouped[v.definition_id] = [];
          grouped[v.definition_id].push(v);
        });
        // Данные уже отсортированы БД, но пересортируем для надежности
        for (const k in grouped) {
          grouped[k].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        setAllLatestValues(grouped);
      } else {
        // Если данных нет, используем демо-данные
        if (Object.keys(allLatestValues).length === 0) {
          const sortedDemo: Record<string, StatisticValue[]> = {};
          for (const k in DEMO_VALUES) {
            sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          setAllLatestValues(sortedDemo);
        }
      }
    } catch (error: any) {
      // Обработка сетевых ошибок (Failed to fetch)
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        console.warn('Сетевая ошибка при загрузке значений статистик, используем демо-данные');
        if (Object.keys(allLatestValues).length === 0) {
          const sortedDemo: Record<string, StatisticValue[]> = {};
          for (const k in DEMO_VALUES) {
            sortedDemo[k] = [...DEMO_VALUES[k]].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          }
          setAllLatestValues(sortedDemo);
        }
        return;
      }
      handleError(error, 'Ошибка при получении значений статистик');
    }
  };

  const handleExportStats = () => {
    exportStatisticsToCSV(definitions, allLatestValues, selectedPeriod);
  };

  const handleExportExcel = () => {
    try {
      exportStatisticsToExcel(definitions, allLatestValues, selectedPeriod);
      toast.success('Статистики экспортированы в Excel');
    } catch (error) {
      handleError(error, 'Ошибка при экспорте в Excel');
    }
  };

  const handleExportWeekly = () => {
    try {
      exportStatisticsWeekly(definitions, allLatestValues);
      toast.success('Шаблон для недельных данных экспортирован');
    } catch (error) {
      handleError(error, 'Ошибка при экспорте недельных данных');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const content = ev.target?.result as string;
          if (!content) {
            toast.error('Файл пуст или не может быть прочитан');
            return;
          }

          const lines = content.split('\n');
          const headers = lines[0]?.split(',').map(h => h.replace(/"/g, '').trim()) || [];

          // Проверяем, это недельный формат (есть даты в заголовках) или обычный
          const isWeeklyFormat = headers.some(h => /\d{2}\.\d{2}\.\d{4}/.test(h));

          if (isWeeklyFormat) {
            // Импорт недельных данных
            await handleImportWeeklyData(lines, headers);
          } else {
            // Обычный импорт
            let importCount = 0;
            const errors: string[] = [];

            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              try {
                const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const statId = cols[0]?.replace(/"/g, '').trim();
                const dateInput = cols[9]?.replace(/"/g, '').trim();
                const valInput = cols[10]?.replace(/"/g, '').trim();

                if (statId && dateInput && valInput && !isNaN(parseFloat(valInput))) {
                  const payload = { definition_id: statId, date: dateInput, value: parseFloat(valInput) };

                  if (isOffline || !supabase) {
                    setAllLatestValues(prev => {
                      const existing = prev[statId] || [];
                      return { ...prev, [statId]: [...existing, { ...payload, id: `local-${Date.now()}-${i}` }] };
                    });
                  } else {
                    const { error } = await supabase.from('statistics_values').insert([payload]);
                    if (error) {
                      errors.push(`Строка ${i + 1}: ${error.message}`);
                      continue;
                    }
                  }
                  importCount++;
                }
              } catch (rowError) {
                errors.push(`Строка ${i + 1}: ошибка парсинга`);
              }
            }

            if (importCount > 0) {
              toast.success(`Успешно импортировано значений: ${importCount}`);
              await fetchAllValues();
            }

            if (errors.length > 0) {
              toast.warning(`Ошибки при импорте: ${errors.length} строк`);
              console.warn('Ошибки импорта:', errors);
            }
          }
        } catch (error) {
          handleError(error, 'Ошибка при чтении CSV файла');
        }
      };

      reader.onerror = () => {
        toast.error('Ошибка чтения файла');
      };

      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleError(error, 'Ошибка при импорте CSV');
    }
  };

  const handleImportWeeklyData = async (lines: string[], headers: string[]) => {
    const { parse } = await import('date-fns');
    let importCount = 0;
    const errors: string[] = [];

    // Находим индексы колонок с датами (недели)
    const weekIndices: number[] = [];
    headers.forEach((h, idx) => {
      if (/\d{2}\.\d{2}\.\d{4}/.test(h)) {
        weekIndices.push(idx);
      }
    });

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      try {
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const statId = cols[0]?.replace(/"/g, '').trim();

        if (!statId) continue;

        // Обрабатываем каждую неделю
        for (const weekIdx of weekIndices) {
          const weekDateStr = headers[weekIdx];
          const valueStr = cols[weekIdx]?.replace(/"/g, '').trim();

          if (!valueStr || valueStr === '') continue;

          try {
            // Парсим дату недели (dd.MM.yyyy) и конвертируем в начало недели
            const weekDate = parse(weekDateStr, 'dd.MM.yyyy', new Date());
            const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
            const dateStr = format(weekStart, 'yyyy-MM-dd');
            const value = parseFloat(valueStr);

            if (isNaN(value)) continue;

            const payload = { definition_id: statId, date: dateStr, value };

            if (isOffline || !supabase) {
              setAllLatestValues(prev => {
                const existing = prev[statId] || [];
                // Проверяем, нет ли уже значения для этой даты
                const existingIndex = existing.findIndex(v => v.date === dateStr);
                if (existingIndex >= 0) {
                  const updated = [...existing];
                  updated[existingIndex] = { ...updated[existingIndex], value };
                  return { ...prev, [statId]: updated };
                }
                return { ...prev, [statId]: [...existing, { ...payload, id: `local-${Date.now()}-${i}-${weekIdx}` }] };
              });
            } else {
              // Используем upsert для обновления или создания
              const { error } = await supabase
                .from('statistics_values')
                .upsert([payload], { onConflict: 'definition_id,date' });

              if (error) {
                errors.push(`Строка ${i + 1}, неделя ${weekDateStr}: ${error.message}`);
                continue;
              }
            }
            importCount++;
          } catch (dateError) {
            errors.push(`Строка ${i + 1}, неделя ${weekDateStr}: ошибка парсинга даты`);
          }
        }
      } catch (rowError) {
        errors.push(`Строка ${i + 1}: ошибка парсинга`);
      }
    }

    if (importCount > 0) {
      toast.success(`Успешно импортировано недельных значений: ${importCount}`);
      await fetchAllValues();
    }

    if (errors.length > 0) {
      toast.warning(`Ошибки при импорте: ${errors.length} значений`);
      console.warn('Ошибки импорта недельных данных:', errors);
    }
  };

  const handleSaveDefinition = async () => {
    if (!editingStatDef || !editingStatDef.title || !editingStatDef.owner_id) {
      toast.warning('Заполните название и выберите владельца статистики');
      return;
    }

    const payload = {
      title: editingStatDef.title,
      description: editingStatDef.description || '',
      type: editingStatDef.type || 'department',
      owner_id: editingStatDef.owner_id,
      inverted: editingStatDef.inverted || false,
      is_favorite: editingStatDef.is_favorite || false,
      is_double: editingStatDef.is_double || false,
      calculation_method: editingStatDef.calculation_method || ''
    };

    try {
      if (isOffline || !supabase) {
        const newDef = { ...payload, id: editingStatDef.id || `local-def-${Date.now()}` } as StatisticDefinition;
        setDefinitions(prev => editingStatDef.id ? prev.map(d => d.id === editingStatDef.id ? newDef : d) : [...prev, newDef]);
        if (selectedStatForValues?.id === editingStatDef.id) setSelectedStatForValues(newDef);
        toast.success('Статистика сохранена');
      } else {
        if (editingStatDef.id) {
          const { error } = await supabase.from('statistics_definitions').update(payload).eq('id', editingStatDef.id);
          if (error) {
            handleError(error, 'Ошибка обновления статистики');
            return;
          }
        } else {
          const { error } = await supabase.from('statistics_definitions').insert([payload]);
          if (error) {
            handleError(error, 'Ошибка создания статистики');
            return;
          }
        }
        await fetchDefinitions();
        if (selectedStatForValues?.id === editingStatDef.id) {
          const { data, error } = await supabase.from('statistics_definitions').select('*').eq('id', editingStatDef.id).single();
          if (error) {
            handleError(error, 'Ошибка получения обновленной статистики');
          } else if (data) {
            setSelectedStatForValues(data);
          }
        }
        toast.success('Статистика сохранена');
      }
      setEditingStatDef(null);
    } catch (err) {
      handleError(err, 'Ошибка при сохранении статистики');
    }
  };

  const openDeleteConfirm = (id: string) => {
    const stat = definitions.find(d => d.id === id);
    if (!stat) return;
    setConfirmModal({
      isOpen: true,
      title: 'Удаление статистики',
      message: `Вы действительно хотите удалить "${stat.title}"?\nВсе исторические данные (график) будут стерты без возможности восстановления.`,
      statId: id
    });
  };

  const executeDeleteStat = async () => {
    const id = confirmModal.statId;
    if (!id) return;
    try {
      if (isOffline || !supabase) {
        setDefinitions(prev => prev.filter(d => d.id !== id));
        setAllLatestValues(prev => { const next = { ...prev }; delete next[id]; return next; });
      } else {
        await supabase.from('statistics_values').delete().eq('definition_id', id);
        await supabase.from('statistics_definitions').delete().eq('id', id);
        await fetchDefinitions();
        await fetchAllValues();
      }
      setConfirmModal({ isOpen: false, title: '', message: '', statId: null });
      if (expandedStatId === id) setExpandedStatId(null);
    } catch (err) { }
  };

  // Используем общую утилиту getFilteredValues из utils/statistics
  // ВАЖНО: НЕ мемоизируем - нужно чтобы компоненты перерисовывались при изменении периода
  // Эта функция используется только в модальном окне, в карточках используем напрямую
  const getFilteredValuesForStat = (statId: string) => {
    const vals = allLatestValues[statId] || [];
    // Убеждаемся что данные отсортированы по дате (по возрастанию)
    const sortedVals = [...vals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return getFilteredValues(sortedVals, selectedPeriod as import('../utils/statistics').PeriodType);
  };

  // Функция для определения последней недели (четверг-среда)
  const getLastWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = воскресенье, 4 = четверг
    // Находим последний четверг
    let daysToLastThursday = (dayOfWeek + 7 - 4) % 7;
    if (daysToLastThursday === 0 && dayOfWeek !== 4) {
      daysToLastThursday = 7; // Если сегодня не четверг, берем предыдущий четверг
    }
    const lastThursday = new Date(today);
    lastThursday.setDate(today.getDate() - daysToLastThursday);
    lastThursday.setHours(0, 0, 0, 0);
    
    // Среда следующей недели (через 6 дней после четверга)
    const nextWednesday = new Date(lastThursday);
    nextWednesday.setDate(lastThursday.getDate() + 6);
    nextWednesday.setHours(23, 59, 59, 999);
    
    return { start: lastThursday, end: nextWednesday };
  };

  // Подсчет статистик с учетом выбранного департамента и временного периода
  const getLastWeekStats = useMemo(() => {
    let growingCount = 0;
    let decliningCount = 0;
    let achievedPlanCount = 0;
    let notAchievedPlanCount = 0;
    let totalCount = 0;

    // Определяем список ID департаментов для фильтрации
    let deptIdsToFilter: string[] = [];
    if (selectedDeptId) {
      const dept = ORGANIZATION_STRUCTURE[selectedDeptId];
      if (dept) {
        // Включаем основной департамент и все его поддепартаменты
        const subIds = dept.departments ? Object.keys(dept.departments) : [];
        deptIdsToFilter = [selectedDeptId, ...subIds];
      } else {
        deptIdsToFilter = [selectedDeptId];
      }
    }

    definitions.forEach(stat => {
      // Фильтруем по департаменту, если выбран
      if (selectedDeptId && stat.owner_id && !deptIdsToFilter.includes(stat.owner_id)) {
        return; // Пропускаем статистики других департаментов
      }

      totalCount++;

      const vals = allLatestValues[stat.id] || [];
      // Используем выбранный период для фильтрации значений
      const filteredValues = getFilteredValues(vals, selectedPeriod as import('../utils/statistics').PeriodType);

      if (filteredValues.length >= 2) {
        // Сортируем по дате
        const sorted = [...filteredValues].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstValue = sorted[0].value;
        const lastValue = sorted[sorted.length - 1].value;
        
        // Определяем направление тренда
        const direction = stat.inverted 
          ? (lastValue < firstValue ? 'up' : lastValue > firstValue ? 'down' : 'flat')
          : (lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'flat');
        
        if (direction === 'up') growingCount++;
        if (direction === 'down') decliningCount++;
      }

      // Проверяем достижение плана
      const planFact = statPlanFactMap[stat.id];
      if (planFact !== undefined) {
        const achievedPlan = planFact.fact >= planFact.plan;
        if (achievedPlan) {
          achievedPlanCount++;
        } else {
          notAchievedPlanCount++;
        }
      }
    });

    return { totalCount, growingCount, decliningCount, achievedPlanCount, notAchievedPlanCount };
  }, [definitions, allLatestValues, statPlanFactMap, selectedDeptId, selectedPeriod]);

  const getOwnerName = (ownerId: string) => {
    if (ORGANIZATION_STRUCTURE[ownerId]) return ORGANIZATION_STRUCTURE[ownerId].name;
    for (const key in ORGANIZATION_STRUCTURE) {
      const d = ORGANIZATION_STRUCTURE[key];
      if (d.departments && d.departments[ownerId]) return `${d.name.split('.')[0]} -> ${d.departments[ownerId].name}`;
    }
    return ownerId;
  };

  const handleOpenValues = async (stat: StatisticDefinition) => {
    if (!isAdmin) return;
    setSelectedStatForValues(stat);
    if (isOffline || !supabase) { setCurrentStatValues(allLatestValues[stat.id] || []); }
    else { const { data } = await supabase.from('statistics_values').select('*').eq('definition_id', stat.id).order('date', { ascending: false }); setCurrentStatValues(data || []); }
    setEditingValue({ definition_id: stat.id, date: new Date().toISOString().split('T')[0], value: 0, value2: 0 });
    setIsValueModalOpen(true);
  };

  const handleSaveValue = async () => {
    if (!editingValue || !selectedStatForValues) {
      toast.warning('Заполните данные для сохранения');
      return;
    }

    try {
      const payload = {
        definition_id: selectedStatForValues.id,
        date: editingValue.date || new Date().toISOString().split('T')[0],
        value: editingValue.value || 0,
        value2: editingValue.value2 || 0
      };

      if (isOffline || !supabase) {
        const newVal = { ...payload, id: editingValue.id || `local-val-${Date.now()}` } as StatisticValue;
        const updatedList = editingValue.id ? currentStatValues.map(v => v.id === editingValue.id ? newVal : v) : [newVal, ...currentStatValues];
        updatedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCurrentStatValues(updatedList);
        setAllLatestValues(prev => ({ ...prev, [selectedStatForValues.id]: updatedList }));
        toast.success('Значение сохранено');
      } else {
        if (editingValue.id) {
          const { error } = await supabase.from('statistics_values').update(payload).eq('id', editingValue.id);
          if (error) {
            handleError(error, 'Ошибка обновления значения');
            return;
          }
        } else {
          const { error } = await supabase.from('statistics_values').insert([payload]);
          if (error) {
            handleError(error, 'Ошибка сохранения значения');
            return;
          }
        }

        const { data, error } = await supabase.from('statistics_values').select('*').eq('definition_id', selectedStatForValues.id).order('date', { ascending: false });
        if (error) {
          handleError(error, 'Ошибка получения значений');
          return;
        }

        setCurrentStatValues(data || []);
        await fetchAllValues();
        toast.success('Значение сохранено');
      }
      setEditingValue({ definition_id: selectedStatForValues.id, date: new Date().toISOString().split('T')[0], value: 0, value2: 0 });
    } catch (err) {
      handleError(err, 'Ошибка при сохранении значения');
    }
  };

  const handleDeleteValue = async (id: string) => {
    if (!confirm("Удалить запись?")) return;

    try {
      if (isOffline || !supabase) {
        setCurrentStatValues(prev => prev.filter(v => v.id !== id));
        toast.success('Значение удалено');
        return;
      }

      const { error } = await supabase.from('statistics_values').delete().eq('id', id);
      if (error) {
        handleError(error, 'Ошибка удаления значения');
        return;
      }

      setCurrentStatValues(prev => prev.filter(v => v.id !== id));
      await fetchAllValues();
      toast.success('Значение удалено');
    } catch (err) {
      handleError(err, 'Ошибка при удалении значения');
    }
  };

  const renderStatCard = (stat: StatisticDefinition, deptColor: string, contextKey: string) => {
    // ВАЖНО: получаем отфильтрованные значения с учетом выбранного периода
    // Используем напрямую allLatestValues и selectedPeriod для гарантии обновления
    const allVals = allLatestValues[stat.id] || [];
    // Убеждаемся что данные отсортированы по дате (по возрастанию)
    const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const vals = getFilteredValues(sortedVals, selectedPeriod as import('../utils/statistics').PeriodType);
    const { current, percent, direction, isGood } = analyzeTrend(vals, stat.inverted);
    const trendColorHex = isGood ? "#10b981" : "#f43f5e";

    // Получаем данные план/факт для статистики
    const planFact = statPlanFactMap[stat.id];
    const hasPlanFact = planFact !== undefined;
    const achievedPlan = hasPlanFact ? planFact.fact >= planFact.plan : null;

    // Фильтрация по тренду
    if (trendFilter === 'growing' && direction !== 'up') return null;
    if (trendFilter === 'declining' && direction !== 'down') return null;
    
    // Фильтрация по плану/факту
    if (planFilter === 'achieved' && (achievedPlan === null || !achievedPlan)) return null;
    if (planFilter === 'not_achieved' && (achievedPlan === null || achievedPlan)) return null;

    // ВАЖНО: используем selectedPeriod в ключе для принудительного перерисовывания при изменении периода
    const cardKey = `${contextKey}-${stat.id}-${selectedPeriod}-${vals.length > 0 ? vals[vals.length - 1].value : 0}`;
    
    return (
      <div key={cardKey} onClick={() => !isEditMode && setExpandedStatId(stat.id)} className={`relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[180px] md:h-[210px] lg:h-[240px] transition-all group ${isEditMode ? 'ring-2 ring-blue-400 ring-offset-2' : 'cursor-pointer hover:shadow-md hover:border-slate-300'}`}>
        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: deptColor }}></div>
        <div className="p-3 md:p-4 flex flex-col h-full relative z-10">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1 pr-4 md:pr-6">
              <h3 className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase leading-tight mb-0.5 md:mb-1 line-clamp-2">{stat.title}</h3>
              <div className="text-[8px] md:text-[9px] text-slate-400 font-medium line-clamp-2 min-h-[20px] md:min-h-[22px] leading-snug">{stat.description || 'Описание показателя отсутствует'}</div>
            </div>
            {stat.inverted && <span className="text-[7px] md:text-[8px] bg-purple-100 text-purple-700 px-0.5 md:px-1 rounded font-bold ml-1 flex-shrink-0">ОБР</span>}
          </div>
          <div className="flex items-baseline gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <span className="text-base md:text-xl lg:text-2xl font-black text-slate-900">{current.toLocaleString()}</span>
            {vals.length > 1 && (
              <div className={`flex items-center gap-1 text-[9px] md:text-[10px] font-bold ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                {direction === 'up' && <TrendingUp size={9} className="md:w-[10px] md:h-[10px]" />}
                {direction === 'down' && <TrendingDown size={9} className="md:w-[10px] md:h-[10px]" />}
                {Math.abs(percent).toFixed(0)}%
                {/* Индикатор достижения плана - рядом с процентом */}
                {hasPlanFact && (
                  <div className={`px-1.5 py-0.5 rounded-full text-[7px] md:text-[8px] font-bold flex items-center gap-0.5 ml-1 ${
                    achievedPlan 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                  }`}>
                    {achievedPlan ? (
                      <CheckCircle size={7} className="md:w-[8px] md:h-[8px]" />
                    ) : (
                      <X size={7} className="md:w-[8px] md:h-[8px]" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className={`flex-1 w-full min-h-0 relative`}><StatsChart values={vals} color={trendColorHex} inverted={stat.inverted} isDouble={stat.is_double} /></div>

          {stat.is_favorite && <div className="absolute bottom-2 right-2 text-[8px] font-black text-amber-500 uppercase tracking-widest opacity-60">ГСД</div>}

          {isEditMode && isAdmin && (
            <div className="absolute top-2 right-2 flex gap-1 bg-white/90 p-1 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all z-20">
              <button onClick={(e) => { e.stopPropagation(); setEditingStatDef(stat); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 size={12} /></button>
              <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(stat.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDashboardView = () => {
    if (!selectedDeptId) {
      return (
        <div className="space-y-6 md:space-y-8 lg:space-y-12 animate-in fade-in pb-20">
          {DEPT_ORDER.map(deptId => {
            const dept = ORGANIZATION_STRUCTURE[deptId];
            if (!dept) return null;
            const subIds = dept.departments ? Object.keys(dept.departments) : [];
            const allDeptIds = [deptId, ...subIds];
            const favStats = definitions.filter(d => allDeptIds.includes(d.owner_id || '') && d.is_favorite);
            if (favStats.length === 0 && !isEditMode) return null;

            return (
              <div key={deptId} className="space-y-3 md:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center text-white font-black shadow-md text-[9px] md:text-[10px] lg:text-xs flex-shrink-0" style={{ backgroundColor: dept.color }}>{deptId === 'owner' ? <Crown size={11} className="md:w-3 md:h-3 lg:w-3.5 lg:h-3.5" /> : dept.name.split('.')[0]}</div>
                    <h2 className="text-[11px] md:text-xs lg:text-sm font-black text-slate-800 uppercase tracking-tight">{dept.name}</h2>
                  </div>
                  <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">ГЛАВНЫЕ ПОКАЗАТЕЛИ (ГСД)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                  {favStats.map(stat => renderStatCard(stat, dept.color, 'dash'))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const dept = ORGANIZATION_STRUCTURE[selectedDeptId];
    if (!dept) return null;
    const deptMainStats = definitions.filter(d => d.owner_id === selectedDeptId);
    const subDepts = dept.departments ? Object.values(dept.departments) : [];

    return (
      <div className="space-y-6 md:space-y-8 animate-in fade-in pb-20 md:pb-24">
        <div className="bg-white p-3 md:p-4 lg:p-6 rounded-lg md:rounded-xl lg:rounded-3xl border border-slate-200 shadow-sm space-y-2 md:space-y-3 lg:space-y-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-7 h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black text-[10px] md:text-xs lg:text-sm shadow-lg flex-shrink-0" style={{ backgroundColor: dept.color }}>
              {selectedDeptId === 'owner' ? <Crown size={14} className="md:w-4 md:h-4 lg:w-5 lg:h-5" /> : dept.name.split('.')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[11px] md:text-xs lg:text-sm font-black text-slate-800 uppercase tracking-tight leading-tight break-words">{dept.fullName}</h1>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold mt-0.5 uppercase">РУКОВОДИТЕЛЬ: {dept.manager}</p>
            </div>
          </div>
          {dept.vfp && (
            <div className="p-3 md:p-4 bg-slate-50 rounded-lg md:rounded-2xl border border-slate-100">
              <div className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Award size={9} className="md:w-[10px] md:h-[10px]" /> ЦЕННЫЙ КОНЕЧНЫЙ ПРОДУКТ (ЦКП)</div>
              <p className="text-xs md:text-sm font-semibold text-slate-600 italic">"{dept.vfp}"</p>
            </div>
          )}
        </div>

        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-1.5 md:gap-2 px-1">
            <div className="p-1 md:p-1.5 bg-slate-100 rounded-lg text-slate-500"><Layers size={12} className="md:w-3.5 md:h-3.5" /></div>
            <span className="text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">Общие статистики департамента</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {deptMainStats.map(stat => renderStatCard(stat, dept.color, 'dept-main'))}
            {isEditMode && isAdmin && (
              <div onClick={() => setEditingStatDef({ owner_id: selectedDeptId, type: 'department', is_favorite: false, title: '', description: '' })} className="border-2 border-dashed border-slate-200 rounded-xl h-[180px] md:h-[210px] lg:h-[240px] flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                <Plus size={24} className="md:w-8 md:h-8" /><span className="text-[10px] md:text-xs font-bold mt-1.5 md:mt-2">Добавить</span>
              </div>
            )}
          </div>
        </div>

        {subDepts.map(sub => {
          const subStats = definitions.filter(d => d.owner_id === sub.id);
          if (subStats.length === 0 && !isEditMode) return null;
          return (
            <div key={sub.id} className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 md:gap-2 px-1">
                <div className="bg-amber-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg text-amber-700 text-[9px] md:text-[10px] font-black border border-amber-200 uppercase tracking-tight">DIV {sub.code}</div>
                <span className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-tight">{sub.name}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
                {subStats.map(stat => renderStatCard(stat, dept.color, `sub-${sub.id}`))}
                {isEditMode && isAdmin && (
                  <div onClick={() => setEditingStatDef({ owner_id: sub.id, type: 'department', is_favorite: false, title: '', description: '' })} className="border-2 border-dashed border-slate-200 rounded-xl h-[180px] md:h-[210px] lg:h-[240px] flex flex-col items-center justify-center text-slate-300 cursor-pointer hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50/50 transition-all">
                    <Plus size={24} className="md:w-7 md:h-7" /><span className="text-[9px] md:text-[10px] font-bold mt-1 uppercase">В отдел {sub.code}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const sortedDefs = [...definitions].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Название</th>
                  <th className="px-6 py-4">Владелец</th>
                  <th className="px-6 py-4">Тип</th>
                  <th className="px-6 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDefs.map(stat => (
                  <tr key={stat.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{stat.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 italic line-clamp-1">{stat.description || 'Описание отсутствует'}</div>
                      <div className="flex gap-1 mt-2">
                        {stat.is_favorite && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ГСД</span>}
                        {stat.inverted && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ОБР</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{getOwnerName(stat.owner_id || '')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-xs font-bold uppercase">{stat.type}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setExpandedStatId(stat.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Посмотреть график"><TrendingUp size={16} /></button>
                        {isAdmin && (
                          <>
                            <button onClick={() => handleOpenValues(stat)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Ввод данных"><Calendar size={16} /></button>
                            <button onClick={() => setEditingStatDef(stat)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Редактировать"><Edit2 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(stat.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Удалить"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col h-full animate-in fade-in space-y-2 md:space-y-4">
      <div className="bg-white p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 md:gap-3 flex-shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2 md:gap-0">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
            {/* Переключатель между дашбордом отдела и личными статистиками */}
            <button
              onClick={() => setViewMode('department')}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                viewMode === 'department'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              <Building2 size={14} className="md:w-4 md:h-4" /> 
              <span className="hidden sm:inline">Дашборд</span>
              <span className="sm:hidden">Даш</span>
            </button>
            {currentUserId && (
              <button
                onClick={() => setViewMode('personal')}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                  viewMode === 'personal'
                    ? 'bg-white shadow text-emerald-600'
                    : 'text-slate-500'
                }`}
              >
                <User size={14} className="md:w-4 md:h-4" /> 
                <span className="hidden sm:inline">Мои статистики</span>
                <span className="sm:hidden">Мои</span>
              </button>
            )}
          </div>
          {viewMode === 'department' && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
              <button onClick={() => setDisplayMode('dashboard')} className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${displayMode === 'dashboard' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                <LayoutDashboard size={14} className="md:w-4 md:h-4" /> 
                <span className="hidden sm:inline">Дашборд</span>
                <span className="sm:hidden">Даш</span>
              </button>
              <button onClick={() => setDisplayMode('list')} className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 ${displayMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                <List size={14} className="md:w-4 md:h-4" /> 
                <span className="hidden sm:inline">Список</span>
                <span className="sm:hidden">Спис</span>
              </button>
            </div>
          )}
          {viewMode === 'department' && isAdmin && (
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv" />
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer flex-shrink-0" title="Импорт CSV"><Upload size={14} className="md:w-[18px] md:h-[18px]" /></button>
              <button onClick={handleExportStats} className="p-1.5 md:p-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer flex-shrink-0" title="Экспорт CSV (Краткий)"><Download size={14} className="md:w-[18px] md:h-[18px]" /></button>
              <button onClick={handleExportExcel} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 cursor-pointer flex-shrink-0" title="Экспорт Excel (Детальный)"><FileText size={14} className="md:w-[18px] md:h-[18px]" /></button>
              <button onClick={handleExportWeekly} className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer flex-shrink-0" title="Экспорт недельных данных (Шаблон)"><FileSpreadsheet size={14} className="md:w-[18px] md:h-[18px]" /></button>
              <button onClick={() => setIsEditMode(!isEditMode)} className={`p-1.5 md:p-2 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${isEditMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`} title="Конструктор (Редактирование)"><Edit2 size={14} className="md:w-[18px] md:h-[18px]" /></button>
            </div>
          )}
        </div>
        {viewMode === 'department' && displayMode === 'dashboard' && (
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1 touch-pan-x mb-2 md:mb-3">
            <button
              onClick={() => {
                setTrendFilter('all');
                setPlanFilter('all');
              }}
              className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${trendFilter === 'all' && planFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
            >
              <span className="whitespace-nowrap">Все</span>
              <span className={`ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${trendFilter === 'all' && planFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getLastWeekStats.totalCount}
              </span>
            </button>
            <button
              onClick={() => setTrendFilter('growing')}
              className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${trendFilter === 'growing' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-300'}`}
            >
              <TrendingUp size={11} className="md:w-[14px] md:h-[14px] flex-shrink-0" /> 
              <span className="hidden sm:inline whitespace-nowrap">Растущие</span>
              <span className="sm:hidden">↑</span>
              <span className={`ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${trendFilter === 'growing' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {getLastWeekStats.growingCount}
              </span>
            </button>
            <button
              onClick={() => setTrendFilter('declining')}
              className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${trendFilter === 'declining' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-rose-600 border-rose-200 hover:border-rose-300'}`}
            >
              <TrendingDown size={11} className="md:w-[14px] md:h-[14px] flex-shrink-0" /> 
              <span className="hidden sm:inline whitespace-nowrap">Падающие</span>
              <span className="sm:hidden">↓</span>
              <span className={`ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${trendFilter === 'declining' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
                {getLastWeekStats.decliningCount}
              </span>
            </button>
            <button
              onClick={() => setPlanFilter('achieved')}
              className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${planFilter === 'achieved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-300'}`}
            >
              <CheckCircle size={11} className="md:w-[14px] md:h-[14px] flex-shrink-0" /> 
              <span className="hidden sm:inline whitespace-nowrap">Достиг план</span>
              <span className="sm:hidden">✓</span>
              <span className={`ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${planFilter === 'achieved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                {getLastWeekStats.achievedPlanCount}
              </span>
            </button>
            <button
              onClick={() => setPlanFilter('not_achieved')}
              className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${planFilter === 'not_achieved' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-amber-600 border-amber-200 hover:border-amber-300'}`}
            >
              <AlertCircle size={11} className="md:w-[14px] md:h-[14px] flex-shrink-0" /> 
              <span className="hidden sm:inline whitespace-nowrap">Не достиг</span>
              <span className="sm:hidden">!</span>
              <span className={`ml-0.5 md:ml-1 px-1 md:px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold ${planFilter === 'not_achieved' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {getLastWeekStats.notAchievedPlanCount}
              </span>
            </button>
            {(planFilter !== 'all' || trendFilter !== 'all') && (
              <button
                onClick={() => {
                  setPlanFilter('all');
                  setTrendFilter('all');
                }}
                className="flex-shrink-0 px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-500 hover:text-slate-700 rounded-lg border border-slate-200 hover:border-slate-300"
                title="Сбросить все фильтры"
              >
                <X size={12} className="md:w-[14px] md:h-[14px]" />
              </button>
            )}
          </div>
        )}
        {viewMode === 'department' && (
          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1 touch-pan-x">
            {PERIODS.map(p => (
              <button key={p.id} onClick={() => setSelectedPeriod(p.id)} className={`flex-shrink-0 px-2.5 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all border cursor-pointer whitespace-nowrap ${selectedPeriod === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}>{p.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-1">
        {viewMode === 'personal' && currentUserId ? (
          <PersonalStatsView
            employeeId={currentUserId}
            employeeName={currentEmployee?.full_name}
            isReadOnly={!isAdmin}
          />
        ) : (
          <>
            {displayMode === 'dashboard' && renderDashboardView()}
            {displayMode === 'list' && renderListView()}
          </>
        )}
      </div>

      {/* STAT MODAL */}
      {expandedStatId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-6" onClick={() => setExpandedStatId(null)}>
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Fixed */}
            <div className="p-5 md:p-6 border-b border-slate-200 bg-white flex justify-between items-start gap-4 flex-shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-lg md:text-2xl text-slate-800 leading-tight break-words mb-2">{definitions.find(d => d.id === expandedStatId)?.title}</h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium">{getOwnerName(definitions.find(d => d.id === expandedStatId)?.owner_id || '')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {isAdmin && (
                  <button onClick={() => openDeleteConfirm(expandedStatId)} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl cursor-pointer transition-colors" title="Удалить статистику"><Trash2 size={20} /></button>
                )}
                <button onClick={() => setExpandedStatId(null)} className="p-2.5 hover:bg-slate-100 rounded-xl flex-shrink-0 cursor-pointer transition-colors" title="Закрыть"><X size={20} /></button>
              </div>
            </div>
            {/* Content - Scrollable */}
            <div className="flex-1 p-5 md:p-8 bg-slate-50 overflow-y-auto custom-scrollbar min-h-0">
              {(() => {
                const stat = definitions.find(d => d.id === expandedStatId);
                if (!stat) return null;
                // ВАЖНО: используем отфильтрованные значения с учетом выбранного периода
                const allVals = allLatestValues[stat.id] || [];
                const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const vals = getFilteredValues(sortedVals, selectedPeriod as import('../utils/statistics').PeriodType);
                const { current, percent, direction, isGood } = analyzeTrend(vals, stat.inverted);
                return (
                  <div className="space-y-6 max-w-5xl mx-auto">
                    {/* Description Card */}
                    <div className="p-5 md:p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm relative group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2"><Info size={14} /> Справка</h4>
                        {isAdmin && (
                          <button onClick={() => setEditingStatDef(stat)} className="p-2 text-blue-500 hover:text-blue-700 bg-white rounded-lg shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity border border-blue-200" title="Редактировать описание"><Edit2 size={14} /></button>
                        )}
                      </div>
                      <p className="text-sm md:text-base font-medium text-blue-900 leading-relaxed whitespace-pre-wrap">{stat.description || 'Описание отсутствует. Добавьте его через конструктор.'}</p>
                    </div>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="p-5 md:p-6 bg-white rounded-2xl shadow-md border border-slate-200">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-2 tracking-wider">Текущее значение</div>
                        <div className="text-3xl md:text-4xl font-black text-slate-900">{current.toLocaleString()}</div>
                      </div>
                      <div className="p-5 md:p-6 bg-white rounded-2xl shadow-md border border-slate-200">
                        <div className="text-xs text-slate-500 font-bold uppercase mb-2 tracking-wider">Динамика периода</div>
                        <div className={`text-2xl md:text-3xl font-bold flex items-center gap-2 ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {direction === 'up' ? <TrendingUp size={28} /> : (direction === 'down' ? <TrendingDown size={28} /> : <Minus size={28} />)}
                          {Math.abs(percent).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex gap-2 border-b-2 border-slate-200 mb-6 pb-2 bg-white -mx-5 md:-mx-8 px-5 md:px-8 sticky top-0 z-10">
                      <button
                        onClick={() => {
                          console.log('[Modal] Switching to view tab, current:', modalTab);
                          setModalTab('view');
                        }}
                        className={`px-4 py-2.5 text-sm md:text-base font-semibold border-b-2 transition-colors ${
                          modalTab === 'view'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Просмотр
                      </button>
                      <button
                        onClick={() => {
                          console.log('[Modal] Switching to create_program tab, current:', modalTab);
                          setModalTab('create_program');
                        }}
                        className={`px-4 py-2.5 text-sm md:text-base font-semibold border-b-2 transition-colors ${
                          modalTab === 'create_program'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Создать Программу
                      </button>
                    </div>

                    {/* Tab Content */}
                    {modalTab === 'view' && (
                      <>
                        {/* Chart Card - Plan/Fact */}
                        {planFactData && !planFactLoading && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6 mb-6">
                            <div className="text-xs text-slate-500 font-bold uppercase mb-3 tracking-wider">График План/Факт</div>
                            <div className="h-72 md:h-96 w-full flex items-center justify-center overflow-x-auto">
                              <PlanFactChart
                                planData={Array(planFactData.history.length).fill(planFactData.plan)}
                                factData={planFactData.history}
                                width={Math.max(800, planFactData.history.length * 60)}
                                height={300}
                              />
                            </div>
                          </div>
                        )}
                        {/* Original Chart */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6 mb-6">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-3 tracking-wider">График динамики</div>
                          <div className="h-72 md:h-96 lg:h-[450px] w-full"><StatsChart values={vals} inverted={stat.inverted} isDouble={stat.is_double} /></div>
                        </div>
                        {/* Edit Plan/Fact */}
                        {planFactData && isAdmin && (
                          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">План и Факт</div>
                              {!isEditingPlanFact && (
                                <button
                                  onClick={() => setIsEditingPlanFact(true)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                  <Edit2 size={16} />
                                  Редактировать
                                </button>
                              )}
                            </div>
                            {isEditingPlanFact ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">План</label>
                                    <input
                                      type="number"
                                      value={editingPlan}
                                      onChange={e => setEditingPlan(e.target.value)}
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Факт</label>
                                    <input
                                      type="number"
                                      value={editingFact}
                                      onChange={e => setEditingFact(e.target.value)}
                                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      if (!planFactData) return;
                                      const planValue = parseFloat(editingPlan);
                                      const factValue = parseFloat(editingFact);
                                      if (isNaN(planValue) || planValue < 0 || isNaN(factValue) || factValue < 0) {
                                        toast.error('Введите корректные значения');
                                        return;
                                      }
                                      setPlanFactLoading(true);
                                      try {
                                        await updateStatPlan(planFactData.id, planValue);
                                        setPlanFactData({ ...planFactData, plan: planValue, fact: factValue });
                                        toast.success('План и факт обновлены');
                                        setIsEditingPlanFact(false);
                                      } catch (error) {
                                        console.error('Error saving:', error);
                                        toast.error('Ошибка сохранения');
                                      } finally {
                                        setPlanFactLoading(false);
                                      }
                                    }}
                                    disabled={planFactLoading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                  >
                                    <Save size={16} />
                                    {planFactLoading ? 'Сохранение...' : 'Сохранить'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setIsEditingPlanFact(false);
                                      if (planFactData) {
                                        setEditingPlan(planFactData.plan.toString());
                                        setEditingFact(planFactData.fact.toString());
                                      }
                                    }}
                                    className="px-6 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                  >
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">План</div>
                                  <div className="text-2xl font-bold text-slate-800">
                                    {planFactData.plan.toLocaleString()} {planFactData.unit}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 mb-1">Факт</div>
                                  <div className="text-2xl font-bold text-slate-800">
                                    {planFactData.fact.toLocaleString()} {planFactData.unit}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Condition */}
                        {planFactCondition && (
                          <div
                            className="rounded-xl p-6 border-2 mb-6"
                            style={{
                              backgroundColor: `${getConditionColor(planFactCondition.level)}15`,
                              borderColor: getConditionColor(planFactCondition.level),
                            }}
                          >
                            <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Рекомендуемое условие</h3>
                            <div className="flex items-center gap-3">
                              <span
                                className="px-3 py-1 rounded-full font-bold text-white text-sm"
                                style={{ backgroundColor: getConditionColor(planFactCondition.level) }}
                              >
                                {getConditionLabel(planFactCondition.level)}
                              </span>
                              <span className="text-slate-700">{planFactCondition.reason}</span>
                            </div>
                          </div>
                        )}
                        {/* Action Button */}
                        {isAdmin && (
                          <button onClick={() => { setExpandedStatId(null); handleOpenValues(stat); }} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 cursor-pointer hover:bg-blue-700 transition-all uppercase tracking-wider text-sm md:text-base">
                            Редактировать данные (Ввод)
                          </button>
                        )}
                      </>
                    )}

                    {modalTab === 'create_program' && (
                      <ProgramCreator
                        employees={employees}
                        relatedStat={planFactData ? { id: planFactData.id, name: planFactData.name } : undefined}
                        onSave={(program) => {
                          console.log('Saving program:', program);
                          toast.success(`Программа "${program.title}" успешно создана`);
                          // Здесь можно добавить сохранение в БД через Supabase
                          setModalTab('view');
                        }}
                        onCancel={() => setModalTab('view')}
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* DEFINITION EDITOR MODAL (CONSTRUCTOR) */}
      {editingStatDef && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">{editingStatDef.id ? 'Редактировать' : 'Новая статистика'}</h3>
              <button onClick={() => setEditingStatDef(null)} className="cursor-pointer text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Название статистики</label>
                <input value={editingStatDef.title || ''} onChange={e => setEditingStatDef({ ...editingStatDef, title: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 shadow-sm" placeholder="Напр: Валовая выручка" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Описание / Метод подсчета</label>
                <textarea value={editingStatDef.description || ''} onChange={e => setEditingStatDef({ ...editingStatDef, description: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm font-medium text-slate-700 shadow-sm leading-relaxed" placeholder="Опишите, что именно измеряет этот показатель..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Владелец (Ответственное подразделение)</label>
                <select value={editingStatDef.owner_id || ''} onChange={e => setEditingStatDef({ ...editingStatDef, owner_id: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm shadow-sm font-semibold">
                  <option value="">Выберите подразделение...</option>
                  {Object.values(ORGANIZATION_STRUCTURE).map(dept => (
                    <React.Fragment key={dept.id}>
                      <option value={dept.id} className="font-bold">⭐ {dept.name}</option>
                      {dept.departments && Object.values(dept.departments).map(sub => (
                        <option key={sub.id} value={sub.id}>&nbsp;&nbsp;&nbsp;↳ {sub.name}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingStatDef.is_favorite || false} onChange={e => setEditingStatDef({ ...editingStatDef, is_favorite: e.target.checked })} className="w-4 h-4 rounded text-blue-600 border-slate-300" /><span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">ГСД (Отображать на Дашборде)</span></label>
                <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingStatDef.inverted || false} onChange={e => setEditingStatDef({ ...editingStatDef, inverted: e.target.checked })} className="w-4 h-4 rounded text-purple-600 border-slate-300" /><span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Обратная (Меньше = Лучше)</span></label>
                <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingStatDef.is_double || false} onChange={e => setEditingStatDef({ ...editingStatDef, is_double: e.target.checked })} className="w-4 h-4 rounded text-indigo-600 border-slate-300" /><span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Двойная статистика (Два графика)</span></label>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setEditingStatDef(null)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors">Отмена</button>
              <button onClick={handleSaveDefinition} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg cursor-pointer hover:bg-blue-700 transition-all uppercase text-xs tracking-widest">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* VALUES EDITOR MODAL (DATA INPUT) */}
      {isValueModalOpen && selectedStatForValues && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <div className="min-w-0 pr-4">
                <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Редактор статистики</div>
                <h3 className="font-bold text-xs sm:text-base text-slate-800 leading-tight truncate max-w-[250px]">{selectedStatForValues.title}</h3>
              </div>
              <button onClick={() => setIsValueModalOpen(false)} className="p-1.5 bg-slate-200/50 rounded-full flex-shrink-0 cursor-pointer text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>

            {/* QUICK DESCRIPTION SECTION */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2 flex-shrink-0 group">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info size={10} /> Справка / Методика</h4>
                <button onClick={() => setEditingStatDef(selectedStatForValues)} className="text-[9px] font-bold text-blue-600 hover:underline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">Изменить</button>
              </div>
              <p className="text-xs font-medium text-slate-600 italic leading-relaxed">{selectedStatForValues.description || 'Описание не указано. Добавьте его в настройках статистики.'}</p>
            </div>

            <div className="p-3 md:p-4 bg-blue-50 border-b border-blue-100 flex flex-col gap-3 flex-shrink-0 shadow-inner">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-blue-400 uppercase mb-1 ml-1">Дата</label>
                  <input type="date" value={editingValue?.date || ''} onChange={e => setEditingValue({ ...editingValue, date: e.target.value })} className="w-full h-10 border border-blue-200 bg-white rounded-lg px-2 text-[11px] md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-center sm:text-left" />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-black text-blue-400 uppercase mb-1 ml-1">Значение 1</label>
                  <input type="number" value={editingValue?.value || ''} onChange={e => setEditingValue({ ...editingValue, value: parseFloat(e.target.value) })} className="w-full h-10 border border-blue-200 bg-white rounded-lg px-2 text-[11px] md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" placeholder="0" />
                </div>
                {selectedStatForValues.is_double && (
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1 ml-1">Значение 2</label>
                    <input type="number" value={editingValue?.value2 || ''} onChange={e => setEditingValue({ ...editingValue, value2: parseFloat(e.target.value) })} className="w-full h-10 border border-blue-200 bg-white rounded-lg px-2 text-[11px] md:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 shadow-sm" placeholder="0" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                {editingValue?.id && (
                  <button onClick={() => setEditingValue({ definition_id: selectedStatForValues.id, date: new Date().toISOString().split('T')[0], value: 0, value2: 0 })} className="px-3 py-1.5 text-slate-500 font-bold hover:bg-slate-200 rounded-lg text-[10px] transition-colors cursor-pointer">Отмена</button>
                )}
                <button onClick={handleSaveValue} className="h-10 px-6 bg-blue-600 text-white text-[10px] md:text-xs font-black rounded-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all flex-1 sm:flex-none cursor-pointer"><Plus size={14} /> {editingValue?.id ? 'Обновить' : 'Добавить'}</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-white">
              {currentStatValues.length === 0 ? (
                <div className="p-8 text-center text-slate-300 flex flex-col items-center gap-2"><Calendar size={32} className="opacity-20" /><p className="text-[11px] font-medium">История пуста</p></div>
              ) : (
                <table className="w-full text-[11px] md:text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-black text-[9px] uppercase sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-3 md:px-4 py-2 text-left">Дата</th>
                      <th className="px-3 md:px-4 py-2 text-right">Значение</th>
                      {selectedStatForValues.is_double && <th className="px-3 md:px-4 py-2 text-right">Вал 2</th>}
                      <th className="px-3 md:px-4 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentStatValues.map(val => (
                      <tr key={val.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-3 md:px-4 py-2 text-slate-600 font-bold">{format(new Date(val.date), 'dd.MM.yyyy')}</td>
                        <td className="px-3 md:px-4 py-2 text-right font-black text-slate-800">{val.value.toLocaleString()}</td>
                        {selectedStatForValues.is_double && <td className="px-3 md:px-4 py-2 text-right font-black text-slate-400">{(val.value2 || 0).toLocaleString()}</td>}
                        <td className="px-3 md:px-4 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditingValue(val)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteValue(val.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={executeDeleteStat}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDanger={true}
        confirmLabel="Удалить навсегда"
      />
    </div>
  );
};

export default StatisticsTab;
