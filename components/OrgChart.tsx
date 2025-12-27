import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { Employee, Department, SubDepartment, DepartmentSection, StatisticDefinition, StatisticValue } from '../types';
import { User, X, Search, FileText, ChevronRight, Users, Crown, Target, Award, Copy, Check, MessageCircle, Phone, Hash, AlertTriangle, Zap, ChevronDown, ChevronUp, Edit2, Save, Trash2, Plus, BookOpen, TrendingUp, TrendingDown, BarChart3, Minus, Info } from 'lucide-react';
import { useToast } from './Toast';
import { useDebounce } from '../hooks/useDebounce';
import { DepartmentDetailView } from './DepartmentDetailView';
import { supabase } from '../supabaseClient';
import StatsChart from './StatsChart';
import { analyzeTrend, getFilteredValues } from '../utils/statistics';
import { getAllStats } from '../features/api/mockAdminTechApi';
import { PlanFactChart } from '../shared/components/PlanFactChart';

interface OrgChartProps {
  employees: Employee[];
  orgStructure: Record<string, Department>;
  onUpdateOrg: (newStruct: Record<string, Department>) => void;
  onSelectEmployee: (emp: Employee) => void;
  isAdmin?: boolean;
}

const HORIZONTAL_DEPT_ORDER = ['dept7', 'dept1', 'dept2', 'dept3', 'dept4', 'dept5', 'dept6'];

// Функция для создания мягкого градиента на основе цвета департамента
const getDeptGradient = (color: string): string => {
  // Конвертируем hex в rgba для градиента
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Создаем мягкий градиент от цвета с прозрачностью к прозрачному
  return `linear-gradient(to bottom, rgba(${r}, ${g}, ${b}, 0.12), rgba(${r}, ${g}, ${b}, 0.06), rgba(${r}, ${g}, ${b}, 0.02), transparent)`;
};

const OrgChart: React.FC<OrgChartProps> = ({ employees, orgStructure, onUpdateOrg, onSelectEmployee, isAdmin }) => {
  const toast = useToast();
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedSubDeptId, setSelectedSubDeptId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'detail'>('classic');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [statistics, setStatistics] = useState<Record<string, StatisticDefinition[]>>({});
  const [statValues, setStatValues] = useState<Record<string, StatisticValue[]>>({});
  const [selectedPeriod, setSelectedPeriod] = useState<string>('3w');
  const [expandedStatId, setExpandedStatId] = useState<string | null>(null);
  const [planFactData, setPlanFactData] = useState<any>(null);
  const [planFactLoading, setPlanFactLoading] = useState(false);
  const [modalTab, setModalTab] = useState<'view' | 'create_program'>('view');
  
  // Функция для получения имени владельца статистики
  const getOwnerName = (ownerId: string) => {
    if (!ownerId) return 'Не указан';
    for (const deptId in orgStructure) {
      const dept = orgStructure[deptId];
      if (deptId === ownerId) return dept.name;
      if (dept.departments) {
        for (const subId in dept.departments) {
          if (subId === ownerId) return dept.departments[subId].name;
          if (dept.departments[subId].sections) {
            for (const secId in dept.departments[subId].sections) {
              if (secId === ownerId) return dept.departments[subId].sections[secId].name;
            }
          }
        }
      }
    }
    return ownerId;
  };
  
  // Debounce search term для оптимизации производительности
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Local edit state for the drawer
  interface EditBuffer {
    deptId?: string;
    subDeptId?: string;
    field?: 'goal' | 'vfp' | 'description' | 'manager';
    value?: string;
    // Department fields
    name?: string;
    fullName?: string;
    description?: string;
    longDescription?: string;
    vfp?: string;
    goal?: string;
    manager?: string;
    mainStat?: string;
    functions?: string[];
    troubleSigns?: string[];
    developmentActions?: string[];
    // SubDepartment fields
    code?: string;
    employeeName?: string;
  }
  const [editBuffer, setEditBuffer] = useState<EditBuffer | null>(null);
  const [companyEditMode, setCompanyEditMode] = useState<'goal' | 'vfp' | null>(null);
  const [companyValue, setCompanyValue] = useState('');

  useEffect(() => {
      setIsDescExpanded(false);
      setIsEditing(false);
      setEditBuffer(null);
      setSelectedSectionId(null);
  }, [selectedDeptId, selectedSubDeptId]);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      if (scrollWidth > clientWidth) {
        scrollContainerRef.current.scrollLeft = (scrollWidth - clientWidth) / 2;
      }
    }
  }, []);

  const handleDeptClick = (deptId: string, subDeptId?: string) => {
      setSelectedDeptId(deptId);
      setSelectedSubDeptId(subDeptId || null);
      setSearchTerm('');
      setIsDrawerOpen(true);
  };

  const getFilteredEmployees = () => {
      if (!selectedDeptId) return [];
      return employees.filter(emp => {
          const deptMatch = emp.department?.includes(selectedDeptId);
          if (selectedSubDeptId) {
              return deptMatch && emp.subdepartment?.includes(selectedSubDeptId);
          }
          return deptMatch;
      }).filter(emp => 
        emp.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        emp.position.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
  };

  const handleStartEdit = () => {
      if (!selectedDeptId) return;
      const dept = orgStructure[selectedDeptId];
      if (selectedSubDeptId && dept.departments) {
          const subDept = dept.departments[selectedSubDeptId];
          setEditBuffer({ 
              subDeptId: selectedSubDeptId,
              deptId: selectedDeptId,
              field: 'description',
              value: '',
              ...subDept,
              name: subDept.name,
              code: subDept.code,
              description: subDept.description || '',
              vfp: subDept.vfp || '',
              manager: subDept.manager || '',
              employeeName: subDept.employeeName || '',
          });
      } else {
          setEditBuffer({ 
              deptId: selectedDeptId,
              field: 'description',
              value: '',
              ...dept,
              name: dept.name,
              fullName: dept.fullName,
              description: dept.description || '',
              longDescription: dept.longDescription || '',
              vfp: dept.vfp || '',
              goal: dept.goal || '',
              manager: dept.manager || '',
              mainStat: dept.mainStat || '',
              functions: dept.functions || [],
              troubleSigns: dept.troubleSigns || [],
              developmentActions: dept.developmentActions || [],
          });
      }
      setIsEditing(true);
  };

  const handleSaveEdit = async () => {
      if (!editBuffer || !selectedDeptId) return;
      
      try {
          const newStruct = JSON.parse(JSON.stringify(orgStructure)); // Глубокое копирование
          
          if (selectedSubDeptId && newStruct[selectedDeptId].departments) {
              // Обновляем поддепартамент
              const subDept = {
                  id: selectedSubDeptId,
                  name: editBuffer.name ?? '',
                  code: editBuffer.code ?? '',
                  manager: (editBuffer.manager && editBuffer.manager.trim()) || '',
                  employeeName: (editBuffer.employeeName && editBuffer.employeeName.trim()) || undefined,
                  description: editBuffer.description ?? '',
                  vfp: editBuffer.vfp ?? '',
              } as SubDepartment;
              
              newStruct[selectedDeptId].departments![selectedSubDeptId] = subDept;
          } else {
              // Обновляем департамент - используем значения из editBuffer, даже если они пустые
              const dept = {
                  ...newStruct[selectedDeptId],
                  name: editBuffer.name !== undefined ? editBuffer.name : newStruct[selectedDeptId].name,
                  fullName: editBuffer.fullName !== undefined ? editBuffer.fullName : newStruct[selectedDeptId].fullName,
                  description: editBuffer.description !== undefined ? editBuffer.description : newStruct[selectedDeptId].description,
                  longDescription: editBuffer.longDescription !== undefined ? editBuffer.longDescription : (editBuffer.description !== undefined ? editBuffer.description : newStruct[selectedDeptId].longDescription),
                  vfp: editBuffer.vfp !== undefined ? editBuffer.vfp : newStruct[selectedDeptId].vfp,
                  goal: editBuffer.goal !== undefined ? editBuffer.goal : newStruct[selectedDeptId].goal,
                  manager: editBuffer.manager !== undefined ? (editBuffer.manager.trim() || '') : newStruct[selectedDeptId].manager,
                  mainStat: editBuffer.mainStat !== undefined ? editBuffer.mainStat : newStruct[selectedDeptId].mainStat,
                  functions: editBuffer.functions !== undefined ? editBuffer.functions : (newStruct[selectedDeptId].functions || []),
                  troubleSigns: editBuffer.troubleSigns !== undefined ? editBuffer.troubleSigns : (newStruct[selectedDeptId].troubleSigns || []),
                  developmentActions: editBuffer.developmentActions !== undefined ? editBuffer.developmentActions : (newStruct[selectedDeptId].developmentActions || []),
              };
              
              newStruct[selectedDeptId] = dept;
          }
          
          console.log('Сохранение данных:', {
              deptId: selectedDeptId,
              mainStat: newStruct[selectedDeptId].mainStat,
              functions: newStruct[selectedDeptId].functions,
              troubleSigns: newStruct[selectedDeptId].troubleSigns,
              developmentActions: newStruct[selectedDeptId].developmentActions,
              vfp: newStruct[selectedDeptId].vfp,
          });
          
          await onUpdateOrg(newStruct);
          toast.success('Изменения сохранены успешно');
          setIsEditing(false);
          setEditBuffer(null);
      } catch (error) {
          console.error('Ошибка при сохранении:', error);
          toast.error('Ошибка при сохранении изменений');
      }
  };

  const handleUpdateCompanyMeta = () => {
      if (!companyEditMode) return;
      const newStruct = { ...orgStructure };
      if (newStruct['owner']) {
          if (companyEditMode === 'goal') newStruct['owner'].goal = companyValue;
          if (companyEditMode === 'vfp') newStruct['owner'].vfp = companyValue;
          onUpdateOrg(newStruct);
      }
      setCompanyEditMode(null);
  };

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = (emp: Employee) => {
      const text = [
          `Имя: ${emp.full_name}`,
          `Должность: ${emp.position}`,
          `NIK: ${emp.nickname || '-'}`,
          `Телефон: ${emp.phone || '-'}`,
          `Telegram: ${emp.telegram || '-'}`
      ].join('\n');
      handleCopy(text, `all-${emp.id}`);
  };

  const currentDept = selectedDeptId ? orgStructure[selectedDeptId] : null;
  const filteredList = getFilteredEmployees();
  
  // Отладочный лог для проверки данных
  useEffect(() => {
    if (currentDept && selectedDeptId && !selectedSubDeptId) {
      console.log('Текущий департамент:', {
        id: selectedDeptId,
        mainStat: currentDept.mainStat,
        functions: currentDept.functions,
        troubleSigns: currentDept.troubleSigns,
        developmentActions: currentDept.developmentActions,
        vfp: currentDept.vfp,
      });
    }
  }, [currentDept, selectedDeptId, selectedSubDeptId]);

  // Загружаем статистики для текущего департамента/отдела/секции
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        if (!supabase || !currentDept) return;

        const entityIds: string[] = [currentDept.id];
        if (selectedSubDeptId && currentDept.departments?.[selectedSubDeptId]) {
          entityIds.push(selectedSubDeptId);
          if (selectedSectionId && currentDept.departments[selectedSubDeptId].sections?.[selectedSectionId]) {
            entityIds.push(selectedSectionId);
          }
        }

        const { data: defs, error: defsError } = await supabase
          .from('statistics_definitions')
          .select('*')
          .in('owner_id', entityIds)
          .order('title');

        if (defsError) {
          console.warn('Ошибка загрузки статистик:', defsError);
          return;
        }

        if (defs && defs.length > 0) {
          // Группируем статистики по owner_id
          const grouped: Record<string, StatisticDefinition[]> = {};
          defs.forEach(stat => {
            if (!grouped[stat.owner_id]) {
              grouped[stat.owner_id] = [];
            }
            grouped[stat.owner_id].push(stat);
          });
          setStatistics(grouped);

          // Загружаем значения
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

          const groupedValues: Record<string, StatisticValue[]> = {};
          if (values) {
            values.forEach(v => {
              if (!groupedValues[v.definition_id]) {
                groupedValues[v.definition_id] = [];
              }
              groupedValues[v.definition_id].push(v as StatisticValue);
            });
          }
          setStatValues(groupedValues);
        } else {
          setStatistics({});
          setStatValues({});
        }
      } catch (error) {
        console.warn('Ошибка при загрузке статистик:', error);
      }
    };

    if (isDrawerOpen && currentDept) {
      loadStatistics();
    }
  }, [isDrawerOpen, currentDept, selectedSubDeptId, selectedSectionId]);

  const renderStatCard = (stat: StatisticDefinition, deptColor: string) => {
    const allVals = statValues[stat.id] || [];
    const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const vals = getFilteredValues(sortedVals, selectedPeriod as any);
    const { current, percent, direction, isGood } = analyzeTrend(vals, stat.inverted);
    const trendColorHex = isGood ? "#10b981" : "#f43f5e";

    return (
      <div 
        key={stat.id} 
        onClick={() => setExpandedStatId(stat.id)}
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
          <div className="flex items-baseline gap-1.5 md:gap-2 mb-1.5 md:mb-2">
            <span className="text-base md:text-xl lg:text-2xl font-black text-slate-900">{current.toLocaleString()}</span>
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

  const ownerStruct = orgStructure['owner'];
  const directorName = orgStructure['dept7']?.departments?.['dept7_19']?.manager || "ИД";

  return (
    <div className="h-full flex flex-col relative bg-slate-50/50 overflow-hidden">
        <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar p-3 md:p-4 lg:p-8">
            <div className="w-full md:min-w-max mx-auto flex flex-col items-center"> 
                <div className="flex flex-col items-center mb-4 md:mb-6 relative z-10">
                    <div onClick={() => handleDeptClick('owner')} className="w-full max-w-[280px] md:w-56 lg:w-60 bg-white rounded-lg md:rounded-xl shadow-md border-2 border-amber-200 p-2 md:p-2.5 cursor-pointer hover:-translate-y-1 transition-transform relative z-20">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shadow-inner flex-shrink-0"><Crown size={16} className="md:w-5 md:h-5"/></div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[8px] md:text-[9px] uppercase font-bold text-amber-600 tracking-wider mb-0.5">Основатель</div>
                                <div className="font-bold text-slate-800 text-xs md:text-sm leading-tight truncate">{ownerStruct.manager}</div>
                            </div>
                        </div>
                        <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-bold shadow-md border-2 border-white">
                             {employees.filter(e => e.department?.includes('owner')).length}
                        </div>
                    </div>
                    <div className="h-3 md:h-4 w-px bg-slate-300"></div>
                    <div onClick={() => handleDeptClick('dept7', 'dept7_19')} className="w-full max-w-[280px] md:w-56 lg:w-60 bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-300 p-2 md:p-2.5 cursor-pointer hover:-translate-y-1 transition-transform relative z-20">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shadow-inner flex-shrink-0"><User size={16} className="md:w-5 md:h-5"/></div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[8px] md:text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Исполнительный Директор</div>
                                <div className="font-bold text-slate-800 text-xs md:text-sm leading-tight truncate">{directorName}</div>
                            </div>
                        </div>
                    </div>
                    <div className="h-4 md:h-6 w-px bg-slate-300"></div>
                </div>

                <div className="relative mb-6 md:mb-8 w-full max-w-[100vw] md:max-w-none">
                    <div className="absolute top-0 left-4 md:left-10 right-4 md:right-10 h-px bg-slate-300 -z-10"></div>
                    <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4 pt-4 md:pt-6">
                        {HORIZONTAL_DEPT_ORDER.map(deptId => {
                            const dept = orgStructure[deptId];
                            // Проверяем, что департамент существует
                            if (!dept) {
                                console.warn(`Департамент ${deptId} не найден в orgStructure`);
                                return null;
                            }
                            // Fix: Explicitly type subDepts to resolve 'unknown' type errors in the map function.
                            const subDepts: SubDepartment[] = dept.departments ? Object.values(dept.departments) : [];
                            const deptColor = dept.color;
                            return (
                                <div key={deptId} className="flex-shrink-0 w-full md:w-64 flex flex-col group relative px-2 sm:px-3 md:px-0">
                                    <div className="absolute -top-4 md:-top-6 left-1/2 -translate-x-1/2 w-px h-4 md:h-6 bg-slate-300 hidden md:block"></div>
                                    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-md md:shadow-lg shadow-slate-200/50 flex flex-col transition-all duration-300 hover:shadow-xl">
                                        <div onClick={() => handleDeptClick(deptId)} className="relative cursor-pointer overflow-hidden border-b border-slate-50 flex-shrink-0" style={{ background: getDeptGradient(deptColor) }}>
                                            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: deptColor }}></div>
                                            <div className="p-2.5 md:p-3 pb-2 md:pb-2.5">
                                                <div className="flex justify-between items-center mb-1.5 md:mb-2 gap-1.5">
                                                    <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                                                        <span className="text-[10px] md:text-xs font-black flex-shrink-0 leading-none" style={{ color: deptColor }}>{dept.name.split('.')[0]}</span>
                                                        <h3 className="text-[10px] md:text-xs font-semibold md:font-bold text-slate-800 leading-tight break-words truncate">{dept.fullName.split(':')[1]?.trim() || dept.name.replace(/^\d+\.\s*/, '')}</h3>
                                                    </div>
                                                    <div className="bg-slate-100 px-1.5 md:px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-bold text-slate-600 flex items-center gap-0.5 md:gap-1 flex-shrink-0"><Users size={9} className="md:w-[10px] md:h-[10px]" />{employees.filter(e => e.department?.includes(deptId)).length}</div>
                                                </div>
                                                <div className="flex items-center gap-1.5 md:gap-2 p-1 md:p-1.5 rounded-lg border border-slate-100 bg-white/60 backdrop-blur-sm">
                                                     <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400"><User size={7} className="md:w-2 md:h-2"/></div>
                                                     <div className="min-w-0"><div className="text-[10px] md:text-xs font-bold text-slate-800 leading-tight truncate">{dept.manager}</div></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-1.5 md:p-2 pb-1.5 md:pb-2 space-y-1 md:space-y-1.5 bg-slate-50/50">
                                            {subDepts.map(sub => (
                                                <div key={sub.id} onClick={() => handleDeptClick(deptId, sub.id)} className="bg-white p-1.5 md:p-2 rounded-lg border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group/item relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 transition-all group-hover/item:bg-opacity-100 bg-opacity-0" style={{ backgroundColor: deptColor }}></div>
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className="text-[6px] md:text-[7px] font-black uppercase text-slate-300 tracking-widest">DIV {sub.code}</span>
                                                        <ChevronRight size={7} className="md:w-2 md:h-2 text-slate-300 group-hover/item:text-slate-500 transition-colors"/>
                                                    </div>
                                                    <div className="font-semibold md:font-bold text-slate-700 text-[9px] md:text-[11px] leading-snug mb-0.5 md:mb-1 group-hover/item:text-slate-900 break-words line-clamp-2">{sub.name}</div>
                                                    <div className="flex items-center justify-between border-t border-slate-50 pt-0.5 md:pt-1 gap-1">
                                                        <div className="flex items-center gap-0.5 md:gap-1 text-[7px] md:text-[8px] text-slate-600 min-w-0 flex-1">
                                                            <User size={7} className="md:w-2 md:h-2 flex-shrink-0"/>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium truncate" title={sub.manager}>{sub.manager}</div>
                                                                {sub.employeeName && (
                                                                    <div className="text-[6px] md:text-[7px] text-slate-500 truncate" title={sub.employeeName}>{sub.employeeName}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[7px] md:text-[8px] font-bold bg-slate-100 text-slate-400 px-0.5 md:px-1 rounded-md flex-shrink-0">{employees.filter(e => e.subdepartment?.includes(sub.id)).length}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4 mb-6 md:mb-8 max-w-3xl w-full px-3 md:px-4 lg:px-0">
                    <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform"><Target size={14} className="md:w-4 md:h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-xs md:text-sm mb-1 flex items-center gap-1.5 md:gap-2">
                           Цель Компании
                           {isAdmin && <button onClick={() => { setCompanyEditMode('goal'); setCompanyValue(ownerStruct.goal || ''); }} className="p-0.5 md:p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-amber-600"><Edit2 size={11} className="md:w-3 md:h-3"/></button>}
                        </h3>
                        {companyEditMode === 'goal' ? (
                            <div className="w-full space-y-2 mt-2">
                                <textarea autoFocus value={companyValue} onChange={e => setCompanyValue(e.target.value)} className="w-full text-xs md:text-sm p-2 border rounded-lg focus:ring-1 focus:ring-amber-300 outline-none" rows={3}/>
                                <div className="flex justify-center gap-2"><button onClick={handleUpdateCompanyMeta} className="p-1.5 bg-amber-600 text-white rounded-lg"><Save size={12}/></button><button onClick={() => setCompanyEditMode(null)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><X size={12}/></button></div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed">{ownerStruct.goal || "Цель не задана."}</p>
                        )}
                    </div>
                    <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-1.5 md:mb-2 group-hover:scale-110 transition-transform"><Award size={14} className="md:w-4 md:h-4"/></div>
                        <h3 className="font-bold text-slate-800 text-xs md:text-sm mb-1 flex items-center gap-1.5 md:gap-2">
                            ЦКП Компании
                            {isAdmin && <button onClick={() => { setCompanyEditMode('vfp'); setCompanyValue(ownerStruct.vfp || ''); }} className="p-0.5 md:p-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"><Edit2 size={11} className="md:w-3 md:h-3"/></button>}
                        </h3>
                        {companyEditMode === 'vfp' ? (
                            <div className="w-full space-y-2 mt-2">
                                <textarea autoFocus value={companyValue} onChange={e => setCompanyValue(e.target.value)} className="w-full text-xs md:text-sm p-2 border rounded-lg focus:ring-1 focus:ring-blue-300 outline-none" rows={3}/>
                                <div className="flex justify-center gap-2"><button onClick={handleUpdateCompanyMeta} className="p-1.5 bg-blue-600 text-white rounded-lg"><Save size={12}/></button><button onClick={() => setCompanyEditMode(null)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg"><X size={12}/></button></div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed">{ownerStruct.vfp || "ЦКП не задан."}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {isDrawerOpen && currentDept && (
            <div className="absolute inset-0 z-50 flex justify-end bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setIsDrawerOpen(false)}>
                <div className="w-full md:w-[600px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-100" onClick={e => e.stopPropagation()}>
                    <div className="p-3 md:p-4 border-b border-slate-100 bg-white relative overflow-hidden flex items-start justify-between shadow-sm z-30">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2 md:pr-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-lg shadow-md flex-shrink-0" style={{ backgroundColor: currentDept.color }}>
                                {selectedDeptId === 'owner' ? <Crown size={16} className="md:w-5 md:h-5"/> : currentDept.name.substring(0,1)}
                            </div>
                            <div className="min-w-0 flex-1">
                                {isEditing ? (
                                    <input value={editBuffer.name || ''} onChange={e => setEditBuffer({...editBuffer, name: e.target.value})} className="w-full text-sm md:text-lg font-black text-slate-800 border-b-2 border-blue-500 outline-none" />
                                ) : (
                                    <h3 className="text-sm md:text-lg font-black text-slate-800 leading-tight break-words">{(selectedSubDeptId && currentDept.departments) ? currentDept.departments[selectedSubDeptId].name : currentDept.name}</h3>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                           {!isEditing && (
                               <button 
                                   onClick={() => setViewMode(viewMode === 'detail' ? 'classic' : 'detail')}
                                   className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
                                   title={viewMode === 'detail' ? 'Классический вид' : 'Детальный вид'}
                               >
                                   <BookOpen size={16} className="md:w-5 md:h-5 text-slate-500"/>
                               </button>
                           )}
                           {isAdmin && (
                               isEditing ? (
                                   <button onClick={handleSaveEdit} className="p-1.5 md:p-2 bg-emerald-500 text-white rounded-full shadow-md"><Save size={16} className="md:w-5 md:h-5"/></button>
                               ) : (
                                   <button onClick={handleStartEdit} className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"><Edit2 size={16} className="md:w-5 md:h-5"/></button>
                               )
                           )}
                           <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 md:p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"><X size={16} className="md:w-5 md:h-5 text-slate-500"/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative">
                        {/* Detail View Mode */}
                        {viewMode === 'detail' ? (
                            <div className="p-4 md:p-6">
                                {/* Navigation sidebar for departments and sections */}
                                {!selectedSubDeptId && currentDept.departments && Object.keys(currentDept.departments).length > 0 && (
                                    <div className="mb-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <Users className="text-slate-600" size={18} />
                                            Отделы департамента
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.values(currentDept.departments).map((subDept) => (
                                                <button
                                                    key={subDept.id}
                                                    onClick={() => {
                                                        setSelectedSubDeptId(subDept.id);
                                                        setSelectedSectionId(null);
                                                    }}
                                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                        selectedSubDeptId === subDept.id
                                                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-semibold text-sm truncate">{subDept.name}</h5>
                                                            {subDept.vfp && (
                                                                <p className="text-xs text-slate-500 mt-1 truncate">ЦКП: {subDept.vfp}</p>
                                                            )}
                                                        </div>
                                                        <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Navigation for sections within subdepartment */}
                                {selectedSubDeptId && currentDept.departments?.[selectedSubDeptId]?.sections && Object.keys(currentDept.departments[selectedSubDeptId].sections!).length > 0 && (
                                    <div className="mb-6 bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <BookOpen className="text-slate-600" size={18} />
                                                Секции отдела
                                            </h4>
                                            <button
                                                onClick={() => {
                                                    setSelectedSubDeptId(null);
                                                    setSelectedSectionId(null);
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                            >
                                                ← Назад к отделам
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.values(currentDept.departments[selectedSubDeptId].sections!).map((sec) => (
                                                <button
                                                    key={sec.id}
                                                    onClick={() => setSelectedSectionId(sec.id)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                        selectedSectionId === sec.id
                                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-semibold text-sm truncate">{sec.name}</h5>
                                                            {sec.vfp && (
                                                                <p className="text-xs text-slate-500 mt-1 truncate">ЦКП: {sec.vfp}</p>
                                                            )}
                                                        </div>
                                                        <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <DepartmentDetailView
                                    department={currentDept}
                                    subDepartment={selectedSubDeptId && currentDept.departments ? currentDept.departments[selectedSubDeptId] : undefined}
                                    section={selectedSectionId && selectedSubDeptId && currentDept.departments?.[selectedSubDeptId]?.sections?.[selectedSectionId]}
                                    isAdmin={isAdmin}
                                    onSave={(data) => {
                                        // TODO: Implement save logic
                                        console.log('Save data:', data);
                                    }}
                                />
                            </div>
                        ) : (
                            /* Classic View Mode */
                            <div className="bg-white p-4 md:p-6 border-b border-slate-100">
                             <div className="mb-4 md:mb-5">
                                 <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 md:mb-2 flex items-center gap-1"><FileText size={9} className="md:w-[10px] md:h-[10px]"/> Описание</h4>
                                 {isEditing ? (
                                     <textarea 
                                         value={editBuffer.description ?? ''} 
                                         onChange={e => setEditBuffer({...editBuffer, description: e.target.value, longDescription: e.target.value})} 
                                         className="w-full text-sm p-3 bg-slate-50 rounded-xl border focus:ring-1 outline-none font-medium" 
                                         rows={4} 
                                     />
                                 ) : (
                                     <>
                                         {(() => {
                                             const descriptionText = selectedSubDeptId 
                                                 ? currentDept.departments![selectedSubDeptId].description 
                                                 : (currentDept.longDescription || currentDept.description || '');
                                             // Увеличиваем лимит до 300 символов (примерно 5-6 строк текста)
                                             const needsExpansion = descriptionText.length > 300;
                                             
                                             return (
                                                 <>
                                                     <div className={`text-xs md:text-sm text-slate-700 leading-relaxed font-medium transition-all ${isDescExpanded || !needsExpansion ? '' : 'line-clamp-5'}`}>
                                                         {descriptionText}
                                                     </div>
                                                     {needsExpansion && (
                                                         <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="mt-1.5 md:mt-2 text-[10px] md:text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                                                             {isDescExpanded ? <>Свернуть <ChevronUp size={11} className="md:w-3 md:h-3"/></> : <>Читать полностью <ChevronDown size={11} className="md:w-3 md:h-3"/></>}
                                                         </button>
                                                     )}
                                                 </>
                                             );
                                         })()}
                                     </>
                                 )}
                             </div>

                             {/* Главная статистика для департамента */}
                             {(isEditing || currentDept.mainStat || (isAdmin && !selectedSubDeptId)) && (
                                 <div className="mb-4 md:mb-5">
                                     <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5">Главная Статистика</h4>
                                     {isEditing ? (
                                         <input 
                                             value={editBuffer.mainStat ?? ''} 
                                             onChange={e => setEditBuffer({...editBuffer, mainStat: e.target.value})} 
                                             className="w-full text-xs md:text-sm font-bold p-2 border rounded-lg" 
                                             placeholder="Введите главную статистику"
                                         />
                                     ) : currentDept.mainStat ? (
                                         <div className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg md:rounded-xl border-2 border-blue-200 shadow-md">
                                             <h4 className="text-[9px] md:text-[10px] uppercase font-black text-blue-500 tracking-widest mb-1.5 flex items-center gap-1">
                                                 <TrendingUp size={10} className="md:w-3 md:h-3" />
                                                 Главная Статистика
                                             </h4>
                                             <p className="text-xs md:text-sm font-bold text-blue-900">{currentDept.mainStat}</p>
                                         </div>
                                     ) : (
                                         <div className="p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg md:rounded-xl border-2 border-blue-200 shadow-md">
                                             <h4 className="text-[9px] md:text-[10px] uppercase font-black text-blue-500 tracking-widest mb-1.5 flex items-center gap-1">
                                                 <TrendingUp size={10} className="md:w-3 md:h-3" />
                                                 Главная Статистика
                                             </h4>
                                             <p className="text-xs md:text-sm text-slate-400 italic">Статистика не указана</p>
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* Главная статистика для отдела */}
                             {selectedSubDeptId && (currentDept.departments?.[selectedSubDeptId]?.mainStat || (isAdmin && !selectedSectionId)) && (
                                 <div className="mb-4 md:mb-5 p-3 md:p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg md:rounded-xl border-2 border-emerald-200 shadow-md">
                                      <h4 className="text-[9px] md:text-[10px] uppercase font-black text-emerald-500 tracking-widest mb-1.5 flex items-center gap-1">
                                          <TrendingUp size={10} className="md:w-3 md:h-3" />
                                          Главная Статистика Отдела
                                      </h4>
                                      {currentDept.departments[selectedSubDeptId].mainStat ? (
                                          <p className="text-xs md:text-sm font-bold text-emerald-900">{currentDept.departments[selectedSubDeptId].mainStat}</p>
                                      ) : (
                                          <p className="text-xs md:text-sm text-slate-400 italic">Статистика не указана</p>
                                      )}
                                 </div>
                             )}

                             {/* Главная статистика для секции */}
                             {selectedSectionId && selectedSubDeptId && (currentDept.departments?.[selectedSubDeptId]?.sections?.[selectedSectionId]?.mainStat || isAdmin) && (
                                 <div className="mb-4 md:mb-5 p-3 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg md:rounded-xl border-2 border-purple-200 shadow-md">
                                      <h4 className="text-[9px] md:text-[10px] uppercase font-black text-purple-500 tracking-widest mb-1.5 flex items-center gap-1">
                                          <TrendingUp size={10} className="md:w-3 md:h-3" />
                                          Главная Статистика Секции
                                      </h4>
                                      {currentDept.departments[selectedSubDeptId].sections![selectedSectionId].mainStat ? (
                                          <p className="text-xs md:text-sm font-bold text-purple-900">{currentDept.departments[selectedSubDeptId].sections![selectedSectionId].mainStat}</p>
                                      ) : (
                                          <p className="text-xs md:text-sm text-slate-400 italic">Статистика не указана</p>
                                      )}
                                 </div>
                             )}

                             {/* Все статистики для департамента */}
                             {!selectedSubDeptId && statistics[currentDept.id] && statistics[currentDept.id].length > 0 && (
                                 <div className="mb-4 md:mb-5">
                                     <div className="flex items-center justify-between mb-2">
                                         <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1">
                                             <BarChart3 size={10} className="md:w-3 md:h-3" />
                                             Все статистики департамента
                                         </h4>
                                         <select
                                             value={selectedPeriod}
                                             onChange={(e) => setSelectedPeriod(e.target.value)}
                                             className="text-[8px] md:text-[9px] px-1.5 py-0.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                     <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 pb-2">
                                         <div className="flex gap-3 md:gap-4 min-w-max">
                                             {statistics[currentDept.id].map(stat => (
                                                 <div key={stat.id} className="flex-shrink-0 w-[240px] md:w-[260px] lg:w-[280px]">
                                                     {renderStatCard(stat, currentDept.color)}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Все статистики для отдела */}
                             {selectedSubDeptId && !selectedSectionId && statistics[selectedSubDeptId] && statistics[selectedSubDeptId].length > 0 && (
                                 <div className="mb-4 md:mb-5">
                                     <div className="flex items-center justify-between mb-2">
                                         <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1">
                                             <BarChart3 size={10} className="md:w-3 md:h-3" />
                                             Все статистики отдела
                                         </h4>
                                         <select
                                             value={selectedPeriod}
                                             onChange={(e) => setSelectedPeriod(e.target.value)}
                                             className="text-[8px] md:text-[9px] px-1.5 py-0.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                     <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 pb-2">
                                         <div className="flex gap-3 md:gap-4 min-w-max">
                                             {statistics[selectedSubDeptId].map(stat => (
                                                 <div key={stat.id} className="flex-shrink-0 w-[240px] md:w-[260px] lg:w-[280px]">
                                                     {renderStatCard(stat, currentDept.color)}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Все статистики для секции */}
                             {selectedSectionId && selectedSubDeptId && statistics[selectedSectionId] && statistics[selectedSectionId].length > 0 && (
                                 <div className="mb-4 md:mb-5">
                                     <div className="flex items-center justify-between mb-2">
                                         <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1">
                                             <BarChart3 size={10} className="md:w-3 md:h-3" />
                                             Все статистики секции
                                         </h4>
                                         <select
                                             value={selectedPeriod}
                                             onChange={(e) => setSelectedPeriod(e.target.value)}
                                             className="text-[8px] md:text-[9px] px-1.5 py-0.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                     <div className="overflow-x-auto custom-scrollbar -mx-2 px-2 pb-2">
                                         <div className="flex gap-3 md:gap-4 min-w-max">
                                             {statistics[selectedSectionId].map(stat => (
                                                 <div key={stat.id} className="flex-shrink-0 w-[240px] md:w-[260px] lg:w-[280px]">
                                                     {renderStatCard(stat, currentDept.color)}
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {/* Functions List - Editable and View */}
                             {!selectedSubDeptId && (isEditing || (currentDept.functions && currentDept.functions.length > 0)) && (
                                 <div className="mb-4 md:mb-5">
                                      <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 md:mb-2 flex justify-between items-center">
                                          <span>Основные функции</span>
                                          {isEditing && (
                                              <button onClick={() => setEditBuffer({...editBuffer, functions: [...(editBuffer.functions || []), "Новая функция"]})} className="text-blue-600 hover:text-blue-800 transition-colors">
                                                  <Plus size={11} className="md:w-3 md:h-3"/>
                                              </button>
                                          )}
                                      </h4>
                                      {(() => {
                                          const functionsToShow = isEditing ? (editBuffer.functions || []) : (currentDept.functions || []);
                                          return functionsToShow.length > 0 ? (
                                              <ul className="space-y-1.5 md:space-y-2">
                                                  {functionsToShow.map((fn: string, idx: number) => (
                                                      <li key={idx} className="text-[11px] md:text-xs text-slate-700 font-semibold flex items-start gap-1.5 md:gap-2 bg-slate-50 p-1.5 md:p-2 rounded-lg border border-slate-100 group">
                                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
                                                          {isEditing ? (
                                                              <div className="flex-1 flex gap-1.5 md:gap-2">
                                                                  <input value={fn} onChange={e => { const newFns = [...editBuffer.functions]; newFns[idx] = e.target.value; setEditBuffer({...editBuffer, functions: newFns}); }} className="flex-1 bg-transparent outline-none text-[11px] md:text-xs" />
                                                                  <button onClick={() => setEditBuffer({...editBuffer, functions: editBuffer.functions.filter((_:any, i:number) => i !== idx)})} className="text-red-400 hover:text-red-600 transition-colors">
                                                                      <Trash2 size={11} className="md:w-3 md:h-3"/>
                                                                  </button>
                                                              </div>
                                                          ) : (
                                                              <span>{fn}</span>
                                                          )}
                                                      </li>
                                                  ))}
                                              </ul>
                                          ) : (
                                              <div className="text-[11px] md:text-xs text-slate-400 italic p-2">Основные функции не указаны</div>
                                          );
                                      })()}
                                 </div>
                             )}

                             {/* Trouble Signs & Actions - Editable and View modes */}
                             {!selectedSubDeptId && (
                                 <div className="space-y-3 md:space-y-4 mb-4 md:mb-5">
                                     {/* Признаки проблем */}
                                     {(isEditing || (currentDept.troubleSigns && currentDept.troubleSigns.length > 0)) && (
                                    <div className="bg-red-50 p-3 md:p-4 rounded-lg md:rounded-xl border border-red-100">
                                        <h4 className="text-[9px] md:text-[10px] uppercase font-black text-red-500 mb-1.5 md:mb-2">Признаки проблем:</h4>
                                             {isEditing ? (
                                                 <textarea 
                                                     value={(editBuffer.troubleSigns || []).join('\n')} 
                                                     onChange={e => {
                                                         const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                                                         setEditBuffer({...editBuffer, troubleSigns: lines});
                                                     }} 
                                                     className="w-full text-[11px] md:text-xs p-2 bg-white border rounded" 
                                                     rows={4}
                                                     placeholder="Введите признаки проблем, каждое с новой строки"
                                                 />
                                             ) : (
                                                 <ul className="space-y-1 md:space-y-1.5">
                                                     {currentDept.troubleSigns && currentDept.troubleSigns.length > 0 ? (
                                                         currentDept.troubleSigns.map((sign: string, idx: number) => (
                                                             <li key={idx} className="text-[11px] md:text-xs text-red-700 font-medium flex items-start gap-1.5 md:gap-2 bg-white p-1.5 md:p-2 rounded border border-red-200">
                                                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                                                                 <span>{sign}</span>
                                                             </li>
                                                         ))
                                                     ) : (
                                                         <li className="text-[11px] md:text-xs text-red-400 italic">Признаки проблем не указаны</li>
                                                     )}
                                                 </ul>
                                             )}
                                         </div>
                                     )}
                                     
                                     {/* Действия */}
                                    {(isEditing || (currentDept.developmentActions && currentDept.developmentActions.length > 0)) && (
                                        <div className="bg-emerald-50 p-3 md:p-4 rounded-lg md:rounded-xl border border-emerald-100">
                                            <h4 className="text-[9px] md:text-[10px] uppercase font-black text-emerald-500 mb-1.5 md:mb-2">Первоочередные действия:</h4>
                                             {isEditing ? (
                                                 <textarea 
                                                     value={(editBuffer.developmentActions || []).join('\n')} 
                                                     onChange={e => {
                                                         const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                                                         setEditBuffer({...editBuffer, developmentActions: lines});
                                                     }} 
                                                     className="w-full text-[11px] md:text-xs p-2 bg-white border rounded" 
                                                     rows={4}
                                                     placeholder="Введите действия, каждое с новой строки"
                                                 />
                                             ) : (
                                                 <ul className="space-y-1 md:space-y-1.5">
                                                     {currentDept.developmentActions && currentDept.developmentActions.length > 0 ? (
                                                         currentDept.developmentActions.map((action: string, idx: number) => (
                                                             <li key={idx} className="text-[11px] md:text-xs text-emerald-700 font-medium flex items-start gap-1.5 md:gap-2 bg-white p-1.5 md:p-2 rounded border border-emerald-200">
                                                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                                                                 <span>{action}</span>
                                                             </li>
                                                         ))
                                                     ) : (
                                                         <li className="text-[11px] md:text-xs text-emerald-400 italic">Действия не указаны</li>
                                                     )}
                                                 </ul>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* VFP Section */}
                             <div className="mb-5 md:mb-6">
                                 <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 md:mb-2 flex items-center gap-1"><Award size={9} className="md:w-[10px] md:h-[10px]"/> Ценный Конечный Продукт (ЦКП)</h4>
                                 {isEditing ? (
                                     <textarea 
                                         value={editBuffer.vfp ?? ''} 
                                         onChange={e => setEditBuffer({...editBuffer, vfp: e.target.value})} 
                                         className="w-full text-xs md:text-sm font-bold p-2.5 md:p-3 border rounded-lg md:rounded-xl italic" 
                                         rows={3}
                                         placeholder="Введите ценный конечный продукт"
                                     />
                                 ) : (
                                     (selectedSubDeptId ? currentDept.departments![selectedSubDeptId].vfp : currentDept.vfp) ? (
                                         <div className="bg-gradient-to-r from-slate-50 to-white border-l-4 border-slate-300 p-3 md:p-4 rounded-r-lg md:rounded-r-xl shadow-sm">
                                             <p className="text-xs md:text-sm font-bold text-slate-800 italic leading-relaxed">"{selectedSubDeptId ? currentDept.departments![selectedSubDeptId].vfp : currentDept.vfp}"</p>
                                         </div>
                                     ) : (
                                         <div className="text-[11px] md:text-xs text-slate-400 italic">ЦКП не указан</div>
                                     )
                                 )}
                             </div>

                             <div className="space-y-3 md:space-y-4">
                                 {/* Ответственный руководитель (должность) */}
                                 <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50">
                                     <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0"><User size={16} className="md:w-5 md:h-5"/></div>
                                     <div className="flex-1 min-w-0">
                                         <div className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Ответственный руководитель</div>
                                         {isEditing ? (
                                             <div className="flex items-center gap-2">
                                                 <input 
                                                     value={editBuffer.manager ?? ''} 
                                                     onChange={e => setEditBuffer({...editBuffer, manager: e.target.value})} 
                                                     className="flex-1 text-xs md:text-sm font-bold border-b-2 border-blue-400 bg-transparent outline-none focus:border-blue-600 transition-colors" 
                                                     placeholder="Введите должность (например: Менеджер)"
                                                 />
                                                 {editBuffer.manager && (
                                                     <button 
                                                         onClick={() => setEditBuffer({...editBuffer, manager: ''})} 
                                                         className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                         title="Очистить"
                                                     >
                                                         <X size={14} className="md:w-4 md:h-4"/>
                                                     </button>
                                                 )}
                                             </div>
                                         ) : (
                                             <div className="text-xs md:text-sm font-bold text-slate-800 break-words">
                                                 {(() => {
                                                     const managerName = selectedSubDeptId 
                                                         ? currentDept.departments![selectedSubDeptId].manager 
                                                         : currentDept.manager;
                                                     return managerName && managerName.trim() ? managerName : (
                                                         <span className="text-slate-400 italic">Не указан</span>
                                                     );
                                                 })()}
                                             </div>
                                         )}
                                     </div>
                                 </div>

                                 {/* Имя сотрудника (только для подотделов) */}
                                 {selectedSubDeptId && (
                                     <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-blue-50/50">
                                         <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-blue-200 flex items-center justify-center text-blue-400 shadow-sm flex-shrink-0"><User size={16} className="md:w-5 md:h-5"/></div>
                                         <div className="flex-1 min-w-0">
                                             <div className="text-[8px] md:text-[9px] uppercase font-bold text-blue-500 tracking-wider mb-1">Имя сотрудника</div>
                                             {isEditing ? (
                                                 <div className="flex items-center gap-2">
                                                     <input 
                                                         value={editBuffer.employeeName ?? ''} 
                                                         onChange={e => setEditBuffer({...editBuffer, employeeName: e.target.value})} 
                                                         className="flex-1 text-xs md:text-sm font-bold border-b-2 border-blue-400 bg-transparent outline-none focus:border-blue-600 transition-colors" 
                                                         placeholder="Введите имя сотрудника (необязательно)"
                                                     />
                                                     {editBuffer.employeeName && (
                                                         <button 
                                                             onClick={() => setEditBuffer({...editBuffer, employeeName: ''})} 
                                                             className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                                                             title="Очистить"
                                                         >
                                                             <X size={14} className="md:w-4 md:h-4"/>
                                                         </button>
                                                     )}
                                                 </div>
                                             ) : (
                                                 <div className="text-xs md:text-sm font-bold text-slate-800 break-words">
                                                     {(() => {
                                                         const employeeName = currentDept.departments![selectedSubDeptId].employeeName;
                                                         return employeeName && employeeName.trim() ? employeeName : (
                                                             <span className="text-slate-400 italic">Не указано</span>
                                                         );
                                                     })()}
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )}
                             </div>

                            <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 px-4 md:px-6 py-2 md:py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                                <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 md:gap-2"><Users size={11} className="md:w-3 md:h-3"/> Сотрудники ({filteredList.length})</h4>
                                <div className="relative w-full sm:w-40">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 md:w-3 md:h-3" size={11}/>
                                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} type="text" placeholder="Поиск..." className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs md:text-sm outline-none focus:ring-1 focus:ring-blue-300"/>
                                </div>
                            </div>

                            <div className="p-3 md:p-4 space-y-2 md:space-y-3 pb-20 md:pb-20">
                            {filteredList.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl mx-2"><p className="font-medium text-xs">Нет сотрудников в этом отделе</p></div>
                            ) : (
                                filteredList.map(emp => (
                                    <div key={emp.id} onClick={() => onSelectEmployee(emp)} className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group/card">
                                        {/* Первая строка: Фото, Имя, Должность, Кнопка копирования */}
                                        <div className="flex items-center gap-2.5 md:gap-3 mb-2">
                                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 shadow-sm">
                                                {emp.photo_url ? (
                                                    <img 
                                                        src={emp.photo_url} 
                                                        className="w-full h-full object-cover" 
                                                        loading="lazy"
                                                        decoding="async"
                                                        alt={emp.full_name}
                                                        onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${emp.full_name}&background=f1f5f9&color=64748b`)}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <User size={18} className="md:w-5 md:h-5"/>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-800 text-sm md:text-base leading-tight group-hover/card:text-blue-600 transition-colors truncate">{emp.full_name}</div>
                                                <div className="text-xs md:text-sm text-blue-600 font-semibold mt-0.5 truncate">{emp.position}</div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); handleCopyAll(emp); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0" title="Скопировать данные">{copiedId === `all-${emp.id}` ? <Check size={14} className="md:w-4 md:h-4 text-green-500"/> : <Copy size={14} className="md:w-4 md:h-4"/>}</button>
                                        </div>
                                        {/* Вторая строка: Контакты в одну линию - компактно, адаптивно */}
                                        <div className="flex items-center gap-1 md:gap-1.5 flex-nowrap overflow-hidden">
                                            {emp.nickname && (
                                                <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 rounded px-1 md:px-1.5 py-0.5 border border-slate-100 group/contact flex-shrink-0">
                                                    <Hash size={9} className="md:w-[10px] md:h-[10px] text-slate-400 flex-shrink-0"/>
                                                    <span className="text-[9px] md:text-[10px] text-slate-600 font-medium truncate max-w-[50px] md:max-w-[60px]">{emp.nickname}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy(emp.nickname || '', `nik-${emp.id}`); }} className="opacity-0 group-hover/contact:opacity-100 p-0.5 hover:text-blue-600 transition-opacity ml-0.5 flex-shrink-0">{copiedId === `nik-${emp.id}` ? <Check size={7} className="md:w-2 md:h-2 text-green-500"/> : <Copy size={7} className="md:w-2 md:h-2"/>}</button>
                                                </div>
                                            )}
                                            {emp.phone && (
                                                <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 rounded px-1 md:px-1.5 py-0.5 border border-slate-100 group/contact flex-shrink-0">
                                                    <Phone size={9} className="md:w-[10px] md:h-[10px] text-slate-400 flex-shrink-0"/>
                                                    <span className="text-[9px] md:text-[10px] text-slate-600 font-medium truncate max-w-[75px] md:max-w-[90px]">{emp.phone}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy(emp.phone || '', `ph-${emp.id}`); }} className="opacity-0 group-hover/contact:opacity-100 p-0.5 hover:text-blue-600 transition-opacity ml-0.5 flex-shrink-0">{copiedId === `ph-${emp.id}` ? <Check size={7} className="md:w-2 md:h-2 text-green-500"/> : <Copy size={7} className="md:w-2 md:h-2"/>}</button>
                                                </div>
                                            )}
                                            {emp.telegram && (
                                                <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 rounded px-1 md:px-1.5 py-0.5 border border-slate-100 group/contact flex-shrink-0">
                                                    <MessageCircle size={9} className="md:w-[10px] md:h-[10px] text-slate-400 flex-shrink-0"/>
                                                    <span className="text-[9px] md:text-[10px] text-slate-600 font-medium truncate max-w-[85px] md:max-w-[100px]">{emp.telegram}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopy(emp.telegram || '', `tg-${emp.id}`); }} className="opacity-0 group-hover/contact:opacity-100 p-0.5 hover:text-blue-600 transition-opacity ml-0.5 flex-shrink-0">{copiedId === `tg-${emp.id}` ? <Check size={7} className="md:w-2 md:h-2 text-green-500"/> : <Copy size={7} className="md:w-2 md:h-2"/>}</button>
                                                </div>
                                            )}
                                            {!emp.nickname && !emp.phone && !emp.telegram && (
                                                <span className="text-[9px] md:text-[10px] text-slate-400 italic flex-shrink-0">Контакты не указаны</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            </div>
                        </div>
                            )}
                    </div>
                </div>
            </div>
        )}

      {/* STAT MODAL */}
      {expandedStatId && (() => {
        const allStats = Object.values(statistics).flat();
        const stat = allStats.find(s => s.id === expandedStatId);
        if (!stat) return null;
        const allVals = statValues[stat.id] || [];
        const sortedVals = [...allVals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const vals = getFilteredValues(sortedVals, selectedPeriod as any);
        const { current, percent, direction, isGood } = analyzeTrend(vals, stat.inverted);
        
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-6" onClick={() => setExpandedStatId(null)}>
            <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 border border-slate-200" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 md:p-6 border-b border-slate-200 bg-white flex justify-between items-start gap-4 flex-shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-lg md:text-2xl text-slate-800 leading-tight break-words mb-2">{stat.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 font-medium">{getOwnerName(stat.owner_id || '')}</p>
                </div>
                <button onClick={() => setExpandedStatId(null)} className="p-2.5 hover:bg-slate-100 rounded-xl flex-shrink-0 cursor-pointer transition-colors" title="Закрыть"><X size={20} /></button>
              </div>
              {/* Content */}
              <div className="flex-1 p-5 md:p-8 bg-slate-50 overflow-y-auto custom-scrollbar min-h-0">
                <div className="space-y-6 max-w-5xl mx-auto">
                  {/* Description Card */}
                  <div className="p-5 md:p-6 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-3"><Info size={14} /> Справка</h4>
                    <p className="text-sm md:text-base font-medium text-blue-900 leading-relaxed whitespace-pre-wrap">{stat.description || 'Описание отсутствует.'}</p>
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
                  {/* Chart */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6">
                    <div className="text-xs text-slate-500 font-bold uppercase mb-3 tracking-wider">График динамики</div>
                    <div className="h-72 md:h-96 lg:h-[450px] w-full">
                      <StatsChart values={vals} inverted={stat.inverted} isDouble={stat.is_double} />
                    </div>
                  </div>
                  {/* Plan/Fact Chart */}
                  {planFactData && !planFactLoading && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 md:p-6">
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
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default OrgChart;
