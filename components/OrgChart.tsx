import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { Employee, Department, SubDepartment } from '../types';
import { User, X, Search, FileText, ChevronRight, Users, Crown, Target, Award, Copy, Check, MessageCircle, Phone, Hash, AlertTriangle, Zap, ChevronDown, ChevronUp, Edit2, Save, Trash2, Plus } from 'lucide-react';
import { useToast } from './Toast';
import { useDebounce } from '../hooks/useDebounce';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
  }
  const [editBuffer, setEditBuffer] = useState<EditBuffer | null>(null);
  const [companyEditMode, setCompanyEditMode] = useState<'goal' | 'vfp' | null>(null);
  const [companyValue, setCompanyValue] = useState('');

  useEffect(() => {
      setIsDescExpanded(false);
      setIsEditing(false);
      setEditBuffer(null);
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
                  manager: editBuffer.manager ?? '',
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
                  manager: editBuffer.manager !== undefined ? editBuffer.manager : newStruct[selectedDeptId].manager,
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
                                                     <div className="min-w-0"><div className="text-[8px] md:text-[9px] font-semibold md:font-bold text-slate-700 leading-tight truncate">{dept.manager}</div></div>
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
                                                    <div className="font-semibold md:font-bold text-slate-700 text-[9px] md:text-[11px] leading-snug mb-0.5 md:mb-1 group-hover/item:text-slate-900 break-words">{sub.name}</div>
                                                    <div className="flex items-center justify-between border-t border-slate-50 pt-0.5 md:pt-1">
                                                        <div className="flex items-center gap-0.5 md:gap-1 text-[7px] md:text-[8px] text-slate-400"><User size={7} className="md:w-2 md:h-2"/><span className="font-medium truncate max-w-[60px] md:max-w-[80px]">{sub.manager.split(' ')[0]}</span></div>
                                                        <span className="text-[7px] md:text-[8px] font-bold bg-slate-100 text-slate-400 px-0.5 md:px-1 rounded-md">{employees.filter(e => e.subdepartment?.includes(sub.id)).length}</span>
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
                                    <input value={editBuffer.fullName || editBuffer.name} onChange={e => setEditBuffer({...editBuffer, [editBuffer.fullName ? 'fullName' : 'name']: e.target.value})} className="w-full text-sm md:text-lg font-black text-slate-800 border-b-2 border-blue-500 outline-none" />
                                ) : (
                                    <h3 className="text-sm md:text-lg font-black text-slate-800 leading-tight break-words">{(selectedSubDeptId && currentDept.departments) ? currentDept.departments[selectedSubDeptId].name : currentDept.fullName}</h3>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
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
                                         <div className={`text-xs md:text-sm text-slate-700 leading-relaxed font-medium transition-all ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                                             {isDescExpanded && currentDept.longDescription ? currentDept.longDescription : (selectedSubDeptId ? currentDept.departments![selectedSubDeptId].description : currentDept.description)}
                                         </div>
                                         {!selectedSubDeptId && currentDept.longDescription && (
                                             <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="mt-1.5 md:mt-2 text-[10px] md:text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">{isDescExpanded ? <>Свернуть <ChevronUp size={11} className="md:w-3 md:h-3"/></> : <>Читать полностью <ChevronDown size={11} className="md:w-3 md:h-3"/></>}</button>
                                         )}
                                     </>
                                 )}
                             </div>

                             {isEditing && !selectedSubDeptId && (
                                 <div className="mb-4 md:mb-5">
                                     <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5">Главная Статистика</h4>
                                     <input 
                                         value={editBuffer.mainStat ?? ''} 
                                         onChange={e => setEditBuffer({...editBuffer, mainStat: e.target.value})} 
                                         className="w-full text-xs md:text-sm font-bold p-2 border rounded-lg" 
                                         placeholder="Введите главную статистику"
                                     />
                                 </div>
                             )}

                             {!isEditing && !selectedSubDeptId && currentDept.mainStat && (
                                 <div className="mb-4 md:mb-5 p-3 md:p-4 bg-blue-50 rounded-lg md:rounded-xl border border-blue-100">
                                      <h4 className="text-[9px] md:text-[10px] uppercase font-black text-blue-400 tracking-widest mb-1.5">Главная Статистика</h4>
                                      <p className="text-xs md:text-sm font-bold text-blue-900">{currentDept.mainStat}</p>
                                 </div>
                             )}

                             {/* Functions List - Editable */}
                             {(isEditing || (!selectedSubDeptId && currentDept.functions && currentDept.functions.length > 0)) && (
                                 <div className="mb-4 md:mb-5">
                                      <h4 className="text-[9px] md:text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 md:mb-2 flex justify-between items-center">Основные функции {isEditing && <button onClick={() => setEditBuffer({...editBuffer, functions: [...(editBuffer.functions || []), "Новая функция"]})} className="text-blue-600"><Plus size={11} className="md:w-3 md:h-3"/></button>}</h4>
                                      <ul className="space-y-1.5 md:space-y-2">
                                          {(isEditing ? (editBuffer.functions || []) : currentDept.functions || []).map((fn: string, idx: number) => (
                                              <li key={idx} className="text-[11px] md:text-xs text-slate-700 font-semibold flex items-start gap-1.5 md:gap-2 bg-slate-50 p-1.5 md:p-2 rounded-lg border border-slate-100 group">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
                                                  {isEditing ? (
                                                      <div className="flex-1 flex gap-1.5 md:gap-2">
                                                          <input value={fn} onChange={e => { const newFns = [...editBuffer.functions]; newFns[idx] = e.target.value; setEditBuffer({...editBuffer, functions: newFns}); }} className="flex-1 bg-transparent outline-none text-[11px] md:text-xs" />
                                                          <button onClick={() => setEditBuffer({...editBuffer, functions: editBuffer.functions.filter((_:any, i:number) => i !== idx)})} className="text-red-400"><Trash2 size={11} className="md:w-3 md:h-3"/></button>
                                                      </div>
                                                  ) : fn}
                                              </li>
                                          ))}
                                      </ul>
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

                             <div className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-200 bg-slate-50">
                                 <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm"><User size={16} className="md:w-5 md:h-5"/></div>
                                 <div className="flex-1">
                                     <div className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 tracking-wider">Ответственный руководитель</div>
                                     {isEditing ? (
                                         <input 
                                             value={editBuffer.manager ?? ''} 
                                             onChange={e => setEditBuffer({...editBuffer, manager: e.target.value})} 
                                             className="w-full text-xs md:text-sm font-bold border-b border-slate-300 bg-transparent outline-none" 
                                             placeholder="Введите имя руководителя"
                                         />
                                     ) : (
                                         <div className="text-xs md:text-sm font-bold text-slate-800">{selectedSubDeptId ? currentDept.departments![selectedSubDeptId].manager : currentDept.manager}</div>
                                     )}
                                 </div>
                             </div>
                        </div>

                        <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 px-4 md:px-6 py-2 md:py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                            <h4 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 md:gap-2"><Users size={11} className="md:w-3 md:h-3"/> Сотрудники ({filteredList.length})</h4>
                            <div className="relative w-full sm:w-40">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={11} className="md:w-3 md:h-3"/>
                                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} type="text" placeholder="Поиск..." className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs md:text-sm outline-none focus:ring-1 focus:ring-blue-300"/>
                            </div>
                        </div>

                        <div className="p-3 md:p-4 space-y-2 md:space-y-3 pb-20 md:pb-20">
                            {filteredList.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl mx-2"><p className="font-medium text-xs">Нет сотрудников в этом отделе</p></div>
                            ) : (
                                filteredList.map(emp => (
                                    <div key={emp.id} onClick={() => onSelectEmployee(emp)} className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 shadow-sm border border-slate-200 flex gap-3 md:gap-4 items-start cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group/card">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm relative">
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
                                                    <User size={20} className="md:w-6 md:h-6"/>
                                                </div>
                                             )}
                                             <div className="absolute bottom-0 left-0 right-0 h-3 md:h-4 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex-1 min-w-0"><div className="font-bold text-slate-800 text-xs md:text-sm leading-tight group-hover/card:text-blue-600 transition-colors truncate">{emp.full_name}</div><div className="text-[10px] md:text-xs text-blue-600 font-bold mt-0.5 truncate">{emp.position}</div></div>
                                                <button onClick={(e) => { e.stopPropagation(); handleCopyAll(emp); }} className="p-1 md:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0" title="Скопировать данные">{copiedId === `all-${emp.id}` ? <Check size={13} className="md:w-3.5 md:h-3.5 text-green-500"/> : <Copy size={13} className="md:w-3.5 md:h-3.5"/>}</button>
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div className="bg-slate-50 rounded-lg px-2 py-1.5 flex items-center justify-between border border-slate-100 group"><div className="flex items-center gap-2 min-w-0"><Hash size={10} className="text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-600 font-medium truncate">{emp.nickname || 'нет ника'}</span></div>{emp.nickname && (<button onClick={(e) => { e.stopPropagation(); handleCopy(emp.nickname || '', `nik-${emp.id}`); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-blue-600 transition-opacity">{copiedId === `nik-${emp.id}` ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}</button>)}</div>
                                                <div className="bg-slate-50 rounded-lg px-2 py-1.5 flex items-center justify-between border border-slate-100 group"><div className="flex items-center gap-2 min-w-0"><Phone size={10} className="text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-600 font-medium truncate">{emp.phone || '-'}</span></div>{emp.phone && (<button onClick={(e) => { e.stopPropagation(); handleCopy(emp.phone || '', `ph-${emp.id}`); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-blue-600 transition-opacity">{copiedId === `ph-${emp.id}` ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}</button>)}</div>
                                                <div className="bg-slate-50 rounded-lg px-2 py-1.5 flex items-center justify-between border border-slate-100 group sm:col-span-2"><div className="flex items-center gap-2 min-w-0"><MessageCircle size={10} className="text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-600 font-medium truncate">{emp.telegram || '-'}</span></div>{emp.telegram && (<button onClick={(e) => { e.stopPropagation(); handleCopy(emp.telegram || '', `tg-${emp.id}`); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-blue-600 transition-opacity">{copiedId === `tg-${emp.id}` ? <Check size={10} className="text-green-500"/> : <Copy size={10}/>}</button>)}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default OrgChart;
