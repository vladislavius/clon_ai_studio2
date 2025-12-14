
import React, { useState, useEffect, useRef } from 'react';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { X, Save, Upload, FileText, Trash2, Plus, TrendingUp, TrendingDown, CheckCircle2, Printer, Download, Link as LinkIcon, Image as ImageIcon, Calendar, Info, HelpCircle, ArrowDownUp } from 'lucide-react';
import { Employee as EmployeeType, Attachment, EmergencyContact, StatisticDefinition, StatisticValue, WiseCondition } from '../types';
import { supabase } from '../supabaseClient';
import StatsChart from './StatsChart';
import { format } from 'date-fns';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeType) => void;
  initialData: EmployeeType | null;
}

const DEFAULT_EMPLOYEE: EmployeeType = {
  id: '',
  created_at: '',
  updated_at: '',
  full_name: '',
  position: '',
  nickname: '',
  email: '',
  email2: '',
  phone: '',
  whatsapp: '',
  telegram: '',
  birth_date: '',
  join_date: '',
  actual_address: '',
  registration_address: '',
  inn: '',
  passport_number: '',
  passport_date: '',
  passport_issuer: '',
  foreign_passport: '',
  foreign_passport_date: '',
  foreign_passport_issuer: '',
  bank_name: '',
  bank_details: '',
  crypto_wallet: '',
  crypto_network: '',
  crypto_currency: '',
  additional_info: '',
  emergency_contacts: [],
  custom_fields: [],
  attachments: [],
  department: [],
  subdepartment: []
};

// Demo Data Generator
const generateDemoPersonalStats = () => {
    const generateHistory = (base: number) => Array.from({length: 52}).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - ((51-i) * 7)); // Weekly points for a year
        return {
            id: `demo-${i}`, 
            definition_id: 'demo', 
            date: d.toISOString().split('T')[0], 
            value: Math.max(0, Math.floor(base + Math.sin(i/5)*20 + Math.random()*10 - 5))
        };
    });
    return [
        { 
            def: { id: 'p1', title: 'Личная Продуктивность (Баллы)', type: 'employee', owner_id: 'demo', description: 'Суммарный объем выполненных задач в баллах' },
            vals: generateHistory(100)
        },
        { 
            def: { id: 'p2', title: 'Завершенные циклы действий', type: 'employee', owner_id: 'demo', description: 'Количество полностью закрытых задач без возврата' },
            vals: generateHistory(45)
        }
    ];
};

const PERIODS = [
    { id: '1w', label: 'Неделя' },
    { id: '3w', label: '3 Нед.' },
    { id: '1m', label: 'Месяц' },
    { id: '3m', label: '3 Мес.' },
    { id: '6m', label: 'Полгода' },
    { id: '1y', label: 'Год' },
    { id: 'all', label: 'Все' },
];

const analyzeTrend = (vals: StatisticValue[], inverted: boolean = false) => {
    if (!vals || vals.length < 2) return { condition: 'non_existence' as WiseCondition, change: 0, current: 0 };
    const sorted = [...vals].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentVal = sorted[sorted.length - 1].value;
    const prevVal = sorted[sorted.length - 2].value;
    let change = 0;
    if (prevVal !== 0) change = (currentVal - prevVal) / Math.abs(prevVal);
    else if (currentVal > 0) change = 1;
    
    // Condition Logic
    let condition: WiseCondition = 'normal';
    if (change > 0.1) condition = 'affluence';
    else if (change > 0) condition = 'normal';
    else if (change > -0.1) condition = 'emergency';
    else condition = 'danger';

    if (inverted) {
        change = -change;
        if (condition === 'affluence') condition = 'danger';
        else if (condition === 'danger') condition = 'affluence';
        else if (condition === 'normal') condition = 'emergency';
        else if (condition === 'emergency') condition = 'normal';
    }
    
    return { condition, change, current: currentVal };
};

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<EmployeeType>(DEFAULT_EMPLOYEE);
  const [activeTab, setActiveTab] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats State
  const [statsDefinitions, setStatsDefinitions] = useState<StatisticDefinition[]>([]);
  const [statsValues, setStatsValues] = useState<StatisticValue[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isDemoStats, setIsDemoStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<string>('3m');
  const [newValueInput, setNewValueInput] = useState<Record<string, string>>({}); // {statId: value}
  const [infoStatId, setInfoStatId] = useState<string | null>(null); // For overlay description

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...DEFAULT_EMPLOYEE, ...initialData });
        fetchPersonalStats(initialData.id);
      } else {
        setFormData({ ...DEFAULT_EMPLOYEE, id: crypto.randomUUID(), created_at: new Date().toISOString() });
        setStatsDefinitions([]);
        setStatsValues([]);
      }
      setActiveTab('general');
      setStatsPeriod('3m');
      setInfoStatId(null);
    }
  }, [isOpen, initialData]);

  const fetchPersonalStats = async (empId: string) => {
      setIsLoadingStats(true);
      setIsDemoStats(false);
      
      let foundData = false;
      if (supabase) {
          const { data: defs } = await supabase.from('statistics_definitions').select('*').eq('owner_id', empId);
          if (defs && defs.length > 0) {
              setStatsDefinitions(defs);
              const ids = defs.map(d => d.id);
              const { data: vals } = await supabase.from('statistics_values').select('*').in('definition_id', ids).order('date', { ascending: true });
              setStatsValues(vals || []);
              foundData = true;
          }
      }

      // If no real data found, inject DEMO data for visual
      if (!foundData) {
          const demo = generateDemoPersonalStats();
          setStatsDefinitions(demo.map(d => d.def as StatisticDefinition));
          // Flatten values
          const allVals: StatisticValue[] = [];
          demo.forEach(d => {
              d.vals.forEach(v => allVals.push({...v, definition_id: d.def.id}));
          });
          setStatsValues(allVals);
          setIsDemoStats(true);
      }
      setIsLoadingStats(false);
  };

  const getFilteredValues = (statId: string) => {
      const vals = statsValues.filter(v => v.definition_id === statId);
      if (!vals.length) return [];
      
      const cutoffDate = new Date();
      switch (statsPeriod) {
          case '1w': cutoffDate.setDate(cutoffDate.getDate() - 7); break;
          case '3w': cutoffDate.setDate(cutoffDate.getDate() - 21); break;
          case '1m': cutoffDate.setMonth(cutoffDate.getMonth() - 1); break;
          case '3m': cutoffDate.setMonth(cutoffDate.getMonth() - 3); break;
          case '6m': cutoffDate.setMonth(cutoffDate.getMonth() - 6); break;
          case '1y': cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); break;
          case 'all': cutoffDate.setTime(0); break;
          default: cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      }

      if (statsPeriod === 'all') return vals;

      const cutoffString = format(cutoffDate, 'yyyy-MM-dd');
      const filtered = vals.filter(v => v.date >= cutoffString);
      
      // Ensure we have at least 2 points for a line if possible, even if outside period slightly
      if (filtered.length < 2 && vals.length >= 2) {
          const sorted = [...vals].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          return sorted.slice(-4); 
      }
      return filtered;
  };

  const handleAddValue = async (statId: string) => {
      const valStr = newValueInput[statId];
      if (!valStr) return;
      const val = parseFloat(valStr);
      const date = new Date().toISOString().split('T')[0];

      if (isDemoStats || !supabase) {
          const newVal: StatisticValue = {
              id: `local-${Date.now()}`,
              definition_id: statId,
              date: date,
              value: val
          };
          setStatsValues(prev => [...prev, newVal]);
          setNewValueInput(prev => ({...prev, [statId]: ''}));
          return;
      }

      const { data, error } = await supabase.from('statistics_values').insert([{ definition_id: statId, value: val, date: date }]).select();
      if (!error && data) {
          setStatsValues(prev => [...prev, data[0]]);
          setNewValueInput(prev => ({...prev, [statId]: ''}));
      } else {
          alert("Ошибка сохранения");
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDepartment = (deptId: string) => {
      setFormData(prev => {
          const current = prev.department || [];
          const exists = current.includes(deptId);
          let newDepts;
          if (exists) {
              newDepts = current.filter(d => d !== deptId);
              // Remove subdepts linked to this dept
              const deptObj = ORGANIZATION_STRUCTURE[deptId];
              const subIdsToRemove = deptObj.departments ? Object.keys(deptObj.departments) : [];
              const newSubs = (prev.subdepartment || []).filter(s => !subIdsToRemove.includes(s));
              return { ...prev, department: newDepts, subdepartment: newSubs };
          } else {
              newDepts = [...current, deptId];
              return { ...prev, department: newDepts };
          }
      });
  };

  const toggleSubDepartment = (subId: string) => {
      setFormData(prev => {
          const current = prev.subdepartment || [];
          const exists = current.includes(subId);
          const newSubs = exists ? current.filter(s => s !== subId) : [...current, subId];
          return { ...prev, subdepartment: newSubs };
      });
  };

  // ... (Emergency, File Upload functions kept same) ...
  const handleEmergencyChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const newContacts = [...formData.emergency_contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, emergency_contacts: newContacts }));
  };
  const addEmergencyContact = () => { setFormData(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, { name: '', relation: '', phone: '' }] })); };
  const removeEmergencyContact = (index: number) => { setFormData(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index) })); };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newAttachments: Attachment[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let publicUrl = '';
        let storagePath = '';
        if (supabase) {
           const fileExt = file.name.split('.').pop();
           const fileName = `${formData.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
           const { data, error } = await supabase.storage.from('employee-docs').upload(fileName, file);
           if (!error) {
               storagePath = data?.path || '';
               const { data: urlData } = supabase.storage.from('employee-docs').getPublicUrl(storagePath);
               publicUrl = urlData.publicUrl;
           } else { publicUrl = URL.createObjectURL(file); }
        } else { publicUrl = URL.createObjectURL(file); }
        newAttachments.push({
          id: crypto.randomUUID(), employee_id: formData.id, file_name: file.name, file_type: file.type, file_size: file.size, storage_path: storagePath, public_url: publicUrl, uploaded_at: new Date().toISOString()
        });
      }
      setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    } catch (error) { console.error('File error:', error); } finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const removeAttachment = (id: string) => { setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) })); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, updated_at: new Date().toISOString() });
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400 hover:border-slate-300";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1 tracking-wide";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
              <h2 className="text-2xl font-bold text-slate-800">{initialData ? 'Редактирование сотрудника' : 'Новый Сотрудник'}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-600">{formData.id.substring(0,8)}</span>
                  <span>• Личное дело (Full Profile)</span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Отмена</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"><Save size={18} /> Сохранить</button>
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-1 overflow-hidden bg-slate-50/50">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1 overflow-y-auto shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
                {[
                    { id: 'general', label: '1. Основное & Структура' },
                    { id: 'contacts', label: '2. Контакты & Адреса' },
                    { id: 'docs', label: '3. Документы (Паспорта)' },
                    { id: 'finance', label: '4. Финансы & Крипта' },
                    { id: 'files', label: '5. Файлы & Экстренные' },
                    { id: 'stats', label: '6. Личная Статистика', icon: <TrendingUp size={14}/> }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        type="button" // Prevent form submit
                        onClick={() => setActiveTab(tab.id)} 
                        className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-between group ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">{tab.label}</span>
                        {tab.icon && <span className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}>{tab.icon}</span>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <form className="max-w-4xl mx-auto space-y-8 pb-20">
                    
                    {/* TAB: GENERAL */}
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-500 rounded-full"></div> Личные Данные</h3>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className={labelClass}>ФИО (Полностью)</label><input name="full_name" value={formData.full_name} onChange={handleChange} className={inputClass} placeholder="Иванов Иван Иванович" /></div>
                                    <div><label className={labelClass}>Должность</label><input name="position" value={formData.position} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Дата Рождения</label><input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className={inputClass} /></div>
                                    <div><label className={labelClass}>Дата Приема</label><input type="date" name="join_date" value={formData.join_date} onChange={handleChange} className={inputClass} /></div>
                                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                         <div><label className={labelClass}>Системный NIK</label><input name="nickname" value={formData.nickname || ''} onChange={handleChange} className={inputClass} placeholder="ivan_hr" /></div>
                                         <div className="opacity-50 pointer-events-none"><label className={labelClass}>Фото URL (Дублируется в файлах)</label><input name="photo_url" value={formData.photo_url || ''} readOnly className={inputClass + " bg-slate-50"} /></div>
                                    </div>
                                </div>
                            </section>
                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-amber-500 rounded-full"></div> Организационная Структура</h3>
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Департамент (Владелец)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {Object.values(ORGANIZATION_STRUCTURE).map(d => {
                                                const isSelected = formData.department?.includes(d.id);
                                                return (
                                                    <div key={d.id} onClick={() => toggleDepartment(d.id)} className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden group ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-md ring-0' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}>
                                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-sm transition-transform group-hover:scale-105" style={{backgroundColor: d.color}}>{d.name.substring(0,1)}</div>
                                                        <div className="flex-1 min-w-0 z-10"><div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{d.name.split(':')[0]}</div><div className="text-[10px] text-slate-400 truncate font-medium">{d.manager}</div></div>
                                                        {isSelected && <div className="absolute top-2 right-2 text-blue-500"><CheckCircle2 size={18} fill="currentColor" className="text-white"/></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {formData.department && formData.department.length > 0 && (
                                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Отдел / Секция (Функциональная роль)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {formData.department.map(deptId => {
                                                    const dept = ORGANIZATION_STRUCTURE[deptId];
                                                    if (!dept?.departments) return null;
                                                    return Object.values(dept.departments).map(sub => {
                                                        const isSelected = formData.subdepartment?.includes(sub.id);
                                                        return (
                                                            <div key={sub.id} onClick={() => toggleSubDepartment(sub.id)} className={`cursor-pointer p-4 rounded-2xl border transition-all flex justify-between items-center group ${isSelected ? 'border-amber-500 bg-amber-50/50 shadow-md' : 'border-slate-100 hover:border-amber-300 hover:bg-slate-50'}`}>
                                                                <div><div className={`text-sm font-bold ${isSelected ? 'text-amber-900' : 'text-slate-700'}`}>{sub.name}</div><div className="text-[10px] text-slate-400 font-medium mt-0.5">{dept.name.split('.')[0]} • {sub.manager}</div></div>
                                                                {isSelected && <CheckCircle2 size={20} className="text-amber-500" fill="#fff"/>}
                                                            </div>
                                                        );
                                                    });
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ... (Docs, Finance, Files Tabs - same structure) ... */}
                    {activeTab === 'contacts' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4"><h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-purple-500 rounded-full"></div> Контакты & Адреса</h3><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className={labelClass}>Телефон</label><input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>WhatsApp</label><input name="whatsapp" value={formData.whatsapp} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Email (Рабочий)</label><input name="email" value={formData.email} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Email (Личный)</label><input name="email2" value={formData.email2} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Telegram</label><input name="telegram" value={formData.telegram} onChange={handleChange} className={inputClass} /></div></div><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"><div><label className={labelClass}>Фактический адрес</label><textarea name="actual_address" value={formData.actual_address} onChange={handleChange} className={inputClass + " h-24"} /></div><div><label className={labelClass}>Адрес регистрации</label><textarea name="registration_address" value={formData.registration_address} onChange={handleChange} className={inputClass + " h-24"} /></div></div></div>)}
                    {activeTab === 'docs' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4"><h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-slate-600 rounded-full"></div> Паспортные Данные</h3><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><label className={labelClass}>ИНН</label><input name="inn" value={formData.inn} onChange={handleChange} className={inputClass + " font-mono text-lg tracking-widest"} placeholder="000000000000" /></div><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Внутренний Паспорт</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className={labelClass}>Серия и Номер</label><input name="passport_number" value={formData.passport_number} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Дата Выдачи</label><input type="date" name="passport_date" value={formData.passport_date} onChange={handleChange} className={inputClass} /></div><div className="md:col-span-2"><label className={labelClass}>Кем Выдан</label><textarea name="passport_issuer" value={formData.passport_issuer} onChange={handleChange} className={inputClass + " h-16"} /></div></div></div><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Заграничный Паспорт</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className={labelClass}>Номер</label><input name="foreign_passport" value={formData.foreign_passport} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Годен до / Дата выдачи</label><input name="foreign_passport_date" value={formData.foreign_passport_date} onChange={handleChange} className={inputClass} /></div><div className="md:col-span-2"><label className={labelClass}>Authority (Кем выдан)</label><input name="foreign_passport_issuer" value={formData.foreign_passport_issuer} onChange={handleChange} className={inputClass} /></div></div></div></div>)}
                    {activeTab === 'finance' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4"><h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2"><div className="w-1.5 h-6 bg-green-500 rounded-full"></div> Финансы</h3><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><div className="space-y-4"><div><label className={labelClass}>Название Банка</label><input name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Реквизиты</label><textarea name="bank_details" value={formData.bank_details} onChange={handleChange} className={inputClass + " h-24 font-mono text-sm"} /></div></div></div><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className={labelClass}>Крипто-сеть</label><input name="crypto_network" value={formData.crypto_network} onChange={handleChange} className={inputClass} /></div><div><label className={labelClass}>Валюта</label><input name="crypto_currency" value={formData.crypto_currency} onChange={handleChange} className={inputClass} /></div><div className="md:col-span-2"><label className={labelClass}>Адрес Кошелька</label><input name="crypto_wallet" value={formData.crypto_wallet} onChange={handleChange} className={inputClass + " font-mono text-xs"} /></div></div></div>)}
                    {activeTab === 'files' && (<div className="space-y-6 animate-in fade-in slide-in-from-right-4"><div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><ImageIcon size={18}/> Фото Профиля (Аватар)</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"><div className="flex flex-col gap-4"><div><label className={labelClass}>Способ 1: Прямая Ссылка (URL)</label><div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input name="photo_url" value={formData.photo_url || ''} onChange={handleChange} className={inputClass + " pl-10"} placeholder="https://site.com/photo.jpg" /></div><p className="text-[10px] text-slate-400 mt-1.5 ml-1">Вставьте ссылку на изображение с Google Drive или хостинга.</p></div><div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">- ИЛИ -</div><div><label className={labelClass}>Способ 2: Загрузка Файла</label><button type="button" onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-blue-100 bg-blue-50/50 text-blue-600 rounded-xl p-4 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all"><Upload size={20} className="mb-2"/><span className="font-bold">{isUploading ? 'Загрузка...' : 'Выбрать Файл'}</span></button><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple /></div></div><div className="flex flex-col items-center justify-center h-full border rounded-2xl bg-slate-50 p-4">{formData.photo_url ? (<img src={formData.photo_url} alt="Preview" className="w-32 h-32 object-cover rounded-full shadow-md border-4 border-white" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error')} />) : (<div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs text-center p-2 border-4 border-white shadow-inner">Нет фото</div>)}<p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-wide">Предпросмотр</p></div></div></div></div>)}

                    {/* TAB: STATS (REDESIGNED) */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div> Личная Статистика и KPI</h3>
                                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                                    {PERIODS.map(p => (
                                        <button 
                                            key={p.id} 
                                            type="button" 
                                            onClick={() => setStatsPeriod(p.id)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statsPeriod === p.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isDemoStats && (<div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4 text-xs text-amber-800 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>Показаны демонстрационные данные. Реальные статистики отсутствуют.</div>)}
                            {statsDefinitions.length === 0 && !isLoadingStats && !isDemoStats && (<div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><TrendingUp size={32}/></div><p className="text-slate-500 font-bold text-lg">Нет назначенных статистик</p><p className="text-sm text-slate-400 mt-2">Статистики назначаются через Инженерное меню.</p></div>)}
                            
                            {statsDefinitions.map(stat => {
                                const vals = getFilteredValues(stat.id);
                                const totalVals = statsValues.filter(v => v.definition_id === stat.id); // For trend analysis independent of period view
                                const { condition, change, current } = analyzeTrend(totalVals, stat.inverted);
                                const isPos = change >= 0;
                                const isInfoOpen = infoStatId === stat.id;

                                return (
                                    <div key={stat.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
                                        
                                        {/* INFO OVERLAY */}
                                        {isInfoOpen && (
                                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 p-6 animate-in fade-in flex flex-col">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Описание Статистики</span>
                                                    <button type="button" onClick={() => setInfoStatId(null)} className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                                                        <X size={18} className="text-slate-400 hover:text-slate-600"/>
                                                    </button>
                                                </div>
                                                <h4 className="font-bold text-lg text-slate-800 mb-2">{stat.title}</h4>
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-6 whitespace-pre-wrap">{stat.description || "Описание отсутствует."}</p>
                                                
                                                <div className="mt-auto pt-4 border-t border-slate-100">
                                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1"><HelpCircle size={12}/> Методика расчета</div>
                                                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">{stat.calculation_method || "Прямой ввод данных."}</div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                                            <div className="flex-1 pr-4">
                                                <div className="flex items-start gap-2 mb-1">
                                                    <h4 className="font-bold text-lg text-slate-800 leading-tight">{stat.title}</h4>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setInfoStatId(isInfoOpen ? null : stat.id)} 
                                                        className="text-slate-300 hover:text-blue-600 transition-colors mt-0.5"
                                                        title="Информация о статистике"
                                                    >
                                                        <Info size={16} />
                                                    </button>
                                                </div>
                                                {stat.inverted && (
                                                    <div className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-1.5">
                                                        <ArrowDownUp size={10} /> ОБРАТНАЯ
                                                    </div>
                                                )}
                                                <p className="text-xs text-slate-500 font-medium line-clamp-2">{stat.description || 'Личный показатель эффективности'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-black text-slate-900 tracking-tight">{current.toLocaleString()}</div>
                                                <div className={`text-xs font-bold flex items-center justify-end gap-1 mt-1 px-2 py-0.5 rounded-lg ${isPos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {isPos ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                                    {Math.abs(change * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="px-6 pb-2 pt-4 h-64 bg-white relative">
                                            <StatsChart key={statsPeriod} values={vals} inverted={stat.inverted} color={isPos ? "#10b981" : "#f43f5e"} />
                                        </div>

                                        {/* QUICK ADD VALUE */}
                                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                            <div className="flex items-center gap-2 flex-1">
                                                <input 
                                                    type="number" 
                                                    placeholder="0"
                                                    value={newValueInput[stat.id] || ''}
                                                    onChange={e => setNewValueInput({...newValueInput, [stat.id]: e.target.value})}
                                                    className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleAddValue(stat.id)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                                                >
                                                    <Plus size={14}/> Внести значение
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">Последнее: {vals.length > 0 ? format(new Date(vals[vals.length-1].date), 'dd.MM.yyyy') : 'Нет данных'}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeModal;
