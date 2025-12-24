/**
 * Компонент для редактирования Шляпной папки (Hat File)
 * Основано на Административной технологии Л. Рона Хаббарда
 * Структура согласно документам: Раздел 1 (Содержание), Раздел 2 (Описание обязанностей), Раздел 3 (Контрольный лист)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Save, FileText, CheckCircle2, ChevronRight, ChevronDown, Plus, 
  Edit2, Trash2, Upload, Link as LinkIcon, BookOpen, FileCheck, 
  Users, TrendingUp, FolderOpen, AlertCircle, Info, Calendar,
  CheckCircle, Clock, Target, BarChart3, List, ArrowUpDown, Check, Printer
} from 'lucide-react';
import { HatFile, HatFileBasicData, HatFileResponsibilitiesDescription, ResponsibilityDescription, ActionStep, SuccessfulAction, TrainingExercise, HatFileChecksheet, ChecksheetItem, ChecksheetItemType } from '../types';
import ChecksheetViewer from './ChecksheetViewer';
import { ORGANIZATION_STRUCTURE } from '../constants';
import { useToast } from './Toast';
import { supabase } from '../supabaseClient';

interface HatFolderEditorProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  postId: string;
  employeeName: string;
  postName: string;
  departmentId?: string;
}

const HatFolderEditor: React.FC<HatFolderEditorProps> = ({
  isOpen,
  onClose,
  employeeId,
  postId,
  employeeName,
  postName,
  departmentId
}) => {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<'content' | 'responsibilities' | 'checksheet' | 'regulations' | 'training' | 'roadmap' | 'tools' | 'history' | 'additional'>('content');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Состояние Шляпной папки
  const [hatFile, setHatFile] = useState<HatFile | null>(null);
  
  // Состояние для редактирования
  const [editingResponsibilityId, setEditingResponsibilityId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['content']));

  // Загрузка Шляпной папки
  useEffect(() => {
    if (isOpen && employeeId) {
      loadHatFile();
    }
  }, [isOpen, employeeId]);

  const loadHatFile = async () => {
    setIsLoading(true);
    try {
      // Загружаем из custom_fields сотрудника
      if (supabase) {
        const { data, error } = await supabase
          .from('employees')
          .select('custom_fields')
          .eq('id', employeeId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Ошибка загрузки Шляпной папки:', error);
        }

        if (data?.custom_fields) {
          const hatFileField = data.custom_fields.find((f: any) => f.key === 'hat_file');
          if (hatFileField?.value) {
            setHatFile(hatFileField.value);
            return;
          }
        }
      }

      // Если папка не найдена, создаем новую структуру
      const newHatFile = createEmptyHatFile();
      setHatFile(newHatFile);
    } catch (error) {
      console.error('Ошибка при загрузке Шляпной папки:', error);
      toast.error('Ошибка загрузки Шляпной папки');
    } finally {
      setIsLoading(false);
    }
  };

  const createEmptyHatFile = (): HatFile => {
    // Получаем информацию о посте из ORGANIZATION_STRUCTURE
    const dept = departmentId ? ORGANIZATION_STRUCTURE[departmentId] : null;
    const post = dept?.departments?.[postId];

    return {
      id: crypto.randomUUID(),
      employee_id: employeeId,
      post_id: postId,
      completion_percentage: 30, // Начальная заполненность
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Раздел 1: Содержание
      basic_data: {
        post_name: postName,
        company_goal: '', // Заполняется HR
        post_goal: post?.purpose || '',
        department_name: dept?.name || '',
        responsibilities: post?.functions || [],
        products: post?.vfp ? [post.vfp] : [],
        statistics: post?.statistics || [],
        org_chart_position: `${dept?.name || ''} → ${postName}`,
        reporting_line: post?.reporting_line || '',
        communication_lines: post?.communication_lines || [],
      },
      
      // Раздел 2: Описание обязанностей
      responsibilities_description: {
        general: {
          department_structure: '',
          production_cycle_connection: '',
          other_info: '',
        },
        responsibilities: [],
      },
      
      // Раздел 3: Контрольный лист
      checksheets: [],
      
      // Дополнительные разделы
      regulations: {
        documents: [],
        links: [],
      },
      training_materials: {
        courses: [],
        videos: [],
        presentations: [],
      },
      development_roadmap: {
        levels: [],
      },
      tools_access: {
        software: [],
        equipment: [],
        accounts: [],
      },
      history: {
        events: [],
      },
      additional: {
        faq: [],
        knowledge_base: [],
        best_practices: [],
        external_links: [],
      },
    };
  };

  const saveHatFile = async () => {
    if (!hatFile || !supabase) return;

    setIsSaving(true);
    try {
      // Сохраняем в custom_fields сотрудника
      const { data: currentData } = await supabase
        .from('employees')
        .select('custom_fields')
        .eq('id', employeeId)
        .single();

      const customFields = currentData?.custom_fields || [];
      const hatFileIndex = customFields.findIndex((f: any) => f.key === 'hat_file');
      
      const updatedHatFile = {
        ...hatFile,
        updated_at: new Date().toISOString(),
        completion_percentage: calculateCompletionPercentage(hatFile),
      };

      if (hatFileIndex >= 0) {
        customFields[hatFileIndex] = {
          key: 'hat_file',
          value: updatedHatFile,
          type: 'hat_file',
        };
      } else {
        customFields.push({
          key: 'hat_file',
          value: updatedHatFile,
          type: 'hat_file',
        });
      }

      const { error } = await supabase
        .from('employees')
        .update({ custom_fields: customFields })
        .eq('id', employeeId);

      if (error) {
        throw error;
      }

      setHatFile(updatedHatFile);
      toast.success('Шляпная папка сохранена');
    } catch (error: any) {
      console.error('Ошибка сохранения Шляпной папки:', error);
      toast.error('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  const calculateCompletionPercentage = (file: HatFile): number => {
    let total = 0;
    let completed = 0;

    // Раздел 1: Содержание (30%)
    total += 30;
    if (file.basic_data.post_name) completed += 5;
    if (file.basic_data.company_goal) completed += 5;
    if (file.basic_data.post_goal) completed += 5;
    if (file.basic_data.responsibilities.length > 0) completed += 5;
    if (file.basic_data.products.length > 0) completed += 5;
    if (file.basic_data.statistics.length > 0) completed += 5;

    // Раздел 2: Описание обязанностей (40%)
    total += 40;
    if (file.responsibilities_description.general.department_structure) completed += 10;
    if (file.responsibilities_description.responsibilities.length > 0) {
      const avgResponsibilityCompletion = file.responsibilities_description.responsibilities.reduce((acc, r) => {
        let respTotal = 0;
        if (r.brief_description) respTotal += 33;
        if (r.expected_product) respTotal += 33;
        if (r.action_sequence.length > 0) respTotal += 34;
        return acc + respTotal;
      }, 0) / file.responsibilities_description.responsibilities.length;
      completed += (avgResponsibilityCompletion * 30) / 100;
    }

    // Раздел 3: Контрольный лист (20%)
    total += 20;
    if (file.checksheets.length > 0) {
      const checksheet = file.checksheets[0];
      if (checksheet.instructions) completed += 5;
      if (checksheet.items.length > 0) {
        const completedItems = checksheet.items.filter(i => i.checked).length;
        completed += (completedItems / checksheet.items.length) * 15;
      }
    }

    // Дополнительные разделы (10%)
    total += 10;
    if (file.regulations.documents.length > 0 || file.regulations.links.length > 0) completed += 3;
    if (file.training_materials.courses.length > 0) completed += 3;
    if (file.development_roadmap.levels.length > 0) completed += 2;
    if (file.tools_access.software.length > 0) completed += 2;

    return Math.round((completed / total) * 100);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  if (isLoading || !hatFile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-slate-700 font-semibold">Загрузка Шляпной папки...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <FolderOpen className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">Шляпная папка</h2>
              <p className="text-sm text-slate-600 mt-1">
                {postName} • {employeeName}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 bg-slate-200 rounded-full w-48 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300"
                    style={{ width: `${hatFile.completion_percentage}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {hatFile.completion_percentage}%
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveHatFile}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Сохранить
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto flex-shrink-0">
            <nav className="p-4 space-y-1">
              {[
                { id: 'content', label: '1. Содержание', icon: FileText, color: 'blue' },
                { id: 'responsibilities', label: '2. Описание обязанностей', icon: List, color: 'green' },
                { id: 'regulations', label: 'Регламенты и политики', icon: BookOpen, color: 'amber' },
                { id: 'training', label: 'Обучающие материалы', icon: BookOpen, color: 'indigo' },
                { id: 'checksheet', label: '3. Контрольный лист', icon: FileCheck, color: 'purple' },
                { id: 'roadmap', label: 'Маршрутная карта', icon: Target, color: 'pink' },
                { id: 'tools', label: 'Инструменты и доступы', icon: Users, color: 'teal' },
                { id: 'history', label: 'История', icon: Calendar, color: 'slate' },
                { id: 'additional', label: 'Дополнительно', icon: Info, color: 'gray' },
              ].map(section => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? `bg-${section.color}-100 text-${section.color}-700 font-bold border-2 border-${section.color}-300`
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {activeSection === 'content' && (
              <Section1Content 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'responsibilities' && (
              <Section2Responsibilities 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'checksheet' && (
              <div className="space-y-6">
                {/* Режим просмотра для сотрудника */}
                {hatFile && hatFile.checksheets.length > 0 && (
                  <ChecksheetViewer
                    checksheet={hatFile.checksheets[0]}
                    hatFileId={hatFile.id}
                    employeeId={employeeId}
                    employeeName={employeeName}
                    postName={postName}
                    onUpdate={(updated) => {
                      setHatFile(prev => prev ? {
                        ...prev,
                        checksheets: [updated]
                      } : null);
                    }}
                    isEditable={true}
                    isTrainer={false}
                    hatFile={hatFile}
                  />
                )}
                
                {/* Режим редактирования для HR */}
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-bold text-slate-700 mb-4">Редактирование контрольного листа (для HR)</h3>
                  <Section3Checksheet 
                    hatFile={hatFile}
                    setHatFile={setHatFile}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    employeeId={employeeId}
                    postId={postId}
                  />
                </div>
              </div>
            )}
            {/* TODO: Остальные разделы */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент для inline редактирования элементов списка
const EditableListItem: React.FC<{
  value: string;
  onSave: (newValue: string) => void;
  onDelete: () => void;
  icon?: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
}> = ({ value, onSave, onDelete, icon, bgColor = 'bg-slate-50', borderColor = 'border-slate-200' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (editValue.trim()) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex items-center gap-2 p-3 ${bgColor} rounded-lg border ${borderColor}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                setEditValue(value);
                setIsEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="text-green-600 hover:text-green-700 p-1"
            title="Сохранить"
          >
            <Check size={16} />
          </button>
          <button
            onClick={() => {
              setEditValue(value);
              setIsEditing(false);
            }}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Отмена"
          >
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <span 
            className="flex-1 text-sm text-slate-700 cursor-pointer hover:text-blue-600"
            onClick={() => setIsEditing(true)}
          >
            {value}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-500 hover:text-blue-700 p-1"
            title="Редактировать"
          >
            <Edit2 size={16} />
          </button>
        </>
      )}
      <button
        onClick={onDelete}
        className="text-red-500 hover:text-red-700 p-1"
        title="Удалить"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Раздел 1: Содержание
const Section1Content: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const updateBasicData = (updates: Partial<HatFileBasicData>) => {
    setHatFile(prev => prev ? {
      ...prev,
      basic_data: { ...prev.basic_data, ...updates }
    } : null);
  };

  const addResponsibility = () => {
    const newResp = prompt('Введите название обязанности:');
    if (newResp && newResp.trim()) {
      updateBasicData({
        responsibilities: [...hatFile.basic_data.responsibilities, newResp.trim()]
      });
    }
  };

  const removeResponsibility = (index: number) => {
    updateBasicData({
      responsibilities: hatFile.basic_data.responsibilities.filter((_, i) => i !== index)
    });
  };

  const addProduct = () => {
    const newProduct = prompt('Введите продукт поста:');
    if (newProduct && newProduct.trim()) {
      updateBasicData({
        products: [...hatFile.basic_data.products, newProduct.trim()]
      });
    }
  };

  const removeProduct = (index: number) => {
    updateBasicData({
      products: hatFile.basic_data.products.filter((_, i) => i !== index)
    });
  };

  const addStatistic = () => {
    const newStat = prompt('Введите название статистики:');
    if (newStat && newStat.trim()) {
      updateBasicData({
        statistics: [...hatFile.basic_data.statistics, newStat.trim()]
      });
    }
  };

  const removeStatistic = (index: number) => {
    updateBasicData({
      statistics: hatFile.basic_data.statistics.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Раздел 1: Содержание
          </h3>
          <button
            onClick={() => toggleSection('content-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('content-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('content-main') && (
          <div className="space-y-6 mt-4">
            {/* Название поста */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Название поста *
              </label>
              <input
                type="text"
                value={hatFile.basic_data.post_name}
                onChange={(e) => updateBasicData({ post_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Менеджер по продажам"
              />
            </div>

            {/* Цель компании */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Цель компании
              </label>
              <textarea
                value={hatFile.basic_data.company_goal || ''}
                onChange={(e) => updateBasicData({ company_goal: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                placeholder="Опишите цель компании, к чему она стремится..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Каждый сотрудник должен знать цель компании и к чему она стремится
              </p>
            </div>

            {/* Цель поста */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Цель поста
              </label>
              <textarea
                value={hatFile.basic_data.post_goal || ''}
                onChange={(e) => updateBasicData({ post_goal: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                placeholder="Краткое описание того, в чём заключается работа данного поста..."
              />
            </div>

            {/* К какому отделу относится */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                К какому отделу относится
              </label>
              <input
                type="text"
                value={hatFile.basic_data.department_name || ''}
                onChange={(e) => updateBasicData({ department_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Отдел продаж"
              />
            </div>

            {/* Список обязанностей */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  Список обязанностей *
                </label>
                <button
                  onClick={addResponsibility}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <Plus size={14} />
                  Добавить
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Список всех обязанностей, которые должен выполнять сотрудник. Указывайте только заголовки, без подробного описания.
              </p>
              <div className="space-y-2">
                {hatFile.basic_data.responsibilities.map((resp, index) => (
                  <EditableListItem
                    key={index}
                    value={resp}
                    onSave={(newValue) => {
                      const newResponsibilities = [...hatFile.basic_data.responsibilities];
                      newResponsibilities[index] = newValue;
                      updateBasicData({ responsibilities: newResponsibilities });
                    }}
                    onDelete={() => removeResponsibility(index)}
                    bgColor="bg-slate-50"
                    borderColor="border-slate-200"
                  />
                ))}
                {hatFile.basic_data.responsibilities.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <List size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Список обязанностей пуст</p>
                    <p className="text-xs mt-1">Нажмите "Добавить" чтобы начать</p>
                  </div>
                )}
              </div>
            </div>

            {/* Продукты поста */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  Продукты поста (VFP) *
                </label>
                <button
                  onClick={addProduct}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <Plus size={14} />
                  Добавить
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Под продуктом понимается результат, который должен быть получен при выполнении всех обязанностей сотрудником, занимающим данный пост.
              </p>
              <div className="space-y-2">
                {hatFile.basic_data.products.map((product, index) => (
                  <EditableListItem
                    key={index}
                    value={product}
                    onSave={(newValue) => {
                      const newProducts = [...hatFile.basic_data.products];
                      newProducts[index] = newValue;
                      updateBasicData({ products: newProducts });
                    }}
                    onDelete={() => removeProduct(index)}
                    icon={<Target className="text-green-600" size={16} />}
                    bgColor="bg-green-50"
                    borderColor="border-green-200"
                  />
                ))}
                {hatFile.basic_data.products.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <Target size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Продукты поста не определены</p>
                  </div>
                )}
              </div>
            </div>

            {/* Статистики поста */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">
                  Статистики поста (1-4 шт) *
                </label>
                <button
                  onClick={addStatistic}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <Plus size={14} />
                  Добавить
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Статистика измеряет продукт поста. Не более 4 статистик на один пост (иначе трудоёмко вести).
              </p>
              <div className="space-y-2">
                {hatFile.basic_data.statistics.map((stat, index) => (
                  <EditableListItem
                    key={index}
                    value={stat}
                    onSave={(newValue) => {
                      const newStatistics = [...hatFile.basic_data.statistics];
                      newStatistics[index] = newValue;
                      updateBasicData({ statistics: newStatistics });
                    }}
                    onDelete={() => removeStatistic(index)}
                    icon={<BarChart3 className="text-blue-600" size={16} />}
                    bgColor="bg-blue-50"
                    borderColor="border-blue-200"
                  />
                ))}
                {hatFile.basic_data.statistics.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Статистики не определены</p>
                  </div>
                )}
              </div>
            </div>

            {/* Место на оргсхеме */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Место на оргсхеме
              </label>
              <input
                type="text"
                value={hatFile.basic_data.org_chart_position || ''}
                onChange={(e) => updateBasicData({ org_chart_position: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Например: Отдел продаж → Менеджер по продажам"
              />
            </div>

            {/* Линия подчинения */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Линия подчинения
              </label>
              <input
                type="text"
                value={hatFile.basic_data.reporting_line || ''}
                onChange={(e) => updateBasicData({ reporting_line: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Кому подчиняется сотрудник на этом посту"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 2: Описание обязанностей
const Section2Responsibilities: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const updateResponsibilitiesDescription = (updates: Partial<HatFileResponsibilitiesDescription>) => {
    setHatFile(prev => prev ? {
      ...prev,
      responsibilities_description: { ...prev.responsibilities_description, ...updates }
    } : null);
  };

  const addResponsibilityDescription = () => {
    // Создаем описание для первой обязанности из списка, которая еще не описана
    const existingIds = new Set(hatFile.responsibilities_description.responsibilities.map(r => r.title));
    const firstUndescribed = hatFile.basic_data.responsibilities.find(r => !existingIds.has(r));
    
    if (!firstUndescribed) {
      alert('Все обязанности из списка уже описаны. Добавьте новую обязанность в раздел "Содержание"');
      return;
    }

    const newResp: ResponsibilityDescription = {
      id: crypto.randomUUID(),
      title: firstUndescribed,
      sequence_order: hatFile.responsibilities_description.responsibilities.length + 1,
      brief_description: '',
      expected_product: '',
      action_sequence: [],
      successful_actions: [],
      training_exercises: [],
    };

    updateResponsibilitiesDescription({
      responsibilities: [...hatFile.responsibilities_description.responsibilities, newResp]
    });
  };

  const updateResponsibility = (id: string, updates: Partial<ResponsibilityDescription>) => {
    setHatFile(prev => prev ? {
      ...prev,
      responsibilities_description: {
        ...prev.responsibilities_description,
        responsibilities: prev.responsibilities_description.responsibilities.map(r =>
          r.id === id ? { ...r, ...updates } : r
        )
      }
    } : null);
  };

  const addActionStep = (responsibilityId: string) => {
    const newStep: ActionStep = {
      id: crypto.randomUUID(),
      order: hatFile.responsibilities_description.responsibilities
        .find(r => r.id === responsibilityId)?.action_sequence.length || 0,
      description: '',
      details: '',
      highlights: [],
    };

    updateResponsibility(responsibilityId, {
      action_sequence: [
        ...(hatFile.responsibilities_description.responsibilities.find(r => r.id === responsibilityId)?.action_sequence || []),
        newStep
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <List className="text-green-600" size={24} />
            Раздел 2: Описание обязанностей
          </h3>
        </div>

        <div className="space-y-6">
          {/* Общее */}
          <div>
            <h4 className="text-lg font-bold text-slate-800 mb-3">Общее</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Структура отдела
                </label>
                <textarea
                  value={hatFile.responsibilities_description.general.department_structure || ''}
                  onChange={(e) => updateResponsibilitiesDescription({
                    general: {
                      ...hatFile.responsibilities_description.general,
                      department_structure: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[120px]"
                  placeholder="Опишите структуру отдела и место данного поста в ней. Покажите, кто кому подчиняется..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Необходимо показать структуру отдела и выделить место данного поста, чтобы было видно, кто кому подчиняется
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Взаимосвязь с производственным циклом отдела
                </label>
                <textarea
                  value={hatFile.responsibilities_description.general.production_cycle_connection || ''}
                  onChange={(e) => updateResponsibilitiesDescription({
                    general: {
                      ...hatFile.responsibilities_description.general,
                      production_cycle_connection: e.target.value
                    }
                  })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[120px]"
                  placeholder="Опишите полный производственный цикл отдела и какое участие требуется от данного поста..."
                />
              </div>
            </div>
          </div>

          {/* Список обязанностей с описанием */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-slate-800">Список обязанностей</h4>
              <button
                onClick={addResponsibilityDescription}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Добавить описание обязанности
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Для каждой обязанности из списка создайте подробное описание. Составляйте список обязанностей в обратном порядке - от продукта к началу его создания.
            </p>

            <div className="space-y-4">
              {hatFile.responsibilities_description.responsibilities.map((resp, index) => (
                <ResponsibilityDescriptionCard
                  key={resp.id}
                  responsibility={resp}
                  index={index}
                  onUpdate={(updates) => updateResponsibility(resp.id, updates)}
                  onAddActionStep={() => addActionStep(resp.id)}
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                />
              ))}
              {hatFile.responsibilities_description.responsibilities.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                  <List size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold mb-1">Описания обязанностей отсутствуют</p>
                  <p className="text-xs">Нажмите "Добавить описание обязанности" чтобы начать</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Карточка описания обязанности
const ResponsibilityDescriptionCard: React.FC<{
  responsibility: ResponsibilityDescription;
  index: number;
  onUpdate: (updates: Partial<ResponsibilityDescription>) => void;
  onAddActionStep: () => void;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ responsibility, index, onUpdate, onAddActionStep, expandedSections, toggleSection }) => {
  const isExpanded = expandedSections.has(`resp-${responsibility.id}`);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState(responsibility.title);

  return (
    <div className="border-2 border-slate-200 rounded-xl p-5 bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold">
            {index + 1}
          </div>
          <div>
            <h5 className="font-bold text-slate-800">{responsibility.title}</h5>
            <p className="text-xs text-slate-500">Порядок: {responsibility.sequence_order}</p>
          </div>
        </div>
        <button
          onClick={() => toggleSection(`resp-${responsibility.id}`)}
          className="text-slate-400 hover:text-slate-600"
        >
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 mt-4">
          {/* Краткое описание */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              а) Краткое описание обязанности *
            </label>
            <textarea
              value={responsibility.brief_description}
              onChange={(e) => onUpdate({ brief_description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[80px]"
              placeholder="Кратко опишите, что включает в себя эта обязанность..."
            />
          </div>

          {/* Ожидаемый продукт */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              б) Ожидаемый продукт (результат) от этой обязанности *
            </label>
            <textarea
              value={responsibility.expected_product}
              onChange={(e) => onUpdate({ expected_product: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 min-h-[80px]"
              placeholder="Опишите, какой результат должен быть получен при выполнении этой обязанности..."
            />
          </div>

          {/* Последовательность действий */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                в) Последовательность действий, приводящих к достижению ожидаемого результата *
              </label>
              <button
                onClick={onAddActionStep}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Plus size={14} />
                Добавить шаг
              </button>
            </div>
            <div className="space-y-2">
              {responsibility.action_sequence.map((step, stepIndex) => (
                <div key={step.id} className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {stepIndex + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => {
                          const newSequence = [...responsibility.action_sequence];
                          newSequence[stepIndex] = { ...step, description: e.target.value };
                          onUpdate({ action_sequence: newSequence });
                        }}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Опишите действие..."
                      />
                      <textarea
                        value={step.details || ''}
                        onChange={(e) => {
                          const newSequence = [...responsibility.action_sequence];
                          newSequence[stepIndex] = { ...step, details: e.target.value };
                          onUpdate({ action_sequence: newSequence });
                        }}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[60px]"
                        placeholder="Подробности, как именно выполнять это действие..."
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newSequence = responsibility.action_sequence.filter((_, i) => i !== stepIndex);
                        onUpdate({ action_sequence: newSequence });
                      }}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {responsibility.action_sequence.length === 0 && (
                <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                  <p className="text-sm">Последовательность действий не описана</p>
                  <p className="text-xs mt-1">Нажмите "Добавить шаг" чтобы начать</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Раздел 3: Контрольный лист (редактор для HR)
const Section3Checksheet: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  employeeId: string;
  postId: string;
  employeeName?: string;
  postName?: string;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection, employeeId, postId, employeeName, postName }) => {
  const toast = useToast();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [newItemType, setNewItemType] = useState<'theoretical' | 'practical' | 'exercise'>('theoretical');
  const [newItemLink, setNewItemLink] = useState('');

  // Получаем или создаем контрольный лист
  const getOrCreateChecksheet = (): HatFileChecksheet => {
    if (hatFile.checksheets.length === 0) {
      return {
        id: crypto.randomUUID(),
        name: 'Контрольный лист',
        items: [],
        assigned_at: new Date().toISOString(),
        instructions: 'Инструкция по работе с контрольным листом:\n\n1. Изучите теоретический материал\n2. Выполните практические задания\n3. Отметьте выполненные пункты',
      };
    }
    return hatFile.checksheets[0];
  };

  const checksheet = getOrCreateChecksheet();

  const updateChecksheet = (updates: Partial<HatFileChecksheet>) => {
    const updated = { ...checksheet, ...updates };
    setHatFile(prev => prev ? {
      ...prev,
      checksheets: prev.checksheets.length > 0
        ? prev.checksheets.map(c => c.id === checksheet.id ? updated : c)
        : [updated]
    } : null);
  };

  const addChecksheetItem = () => {
    if (!newItemText.trim() && !newItemLink.trim()) {
      toast.error('Введите текст задания или ссылку');
      return;
    }

    const newItem: ChecksheetItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim() || newItemLink.trim(),
      type: newItemType,
      sequence_order: checksheet.items.length + 1,
      checked: false,
      notes: newItemLink ? `Ссылка: ${newItemLink}` : undefined,
    };

    updateChecksheet({
      items: [...checksheet.items, newItem]
    });

    setNewItemText('');
    setNewItemLink('');
    setNewItemType('theoretical');
    toast.success('Задание добавлено');
  };

  const updateItem = (itemId: string, updates: Partial<ChecksheetItem>) => {
    updateChecksheet({
      items: checksheet.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const deleteItem = (itemId: string) => {
    if (!confirm('Удалить это задание?')) return;
    updateChecksheet({
      items: checksheet.items.filter(item => item.id !== itemId)
        .map((item, index) => ({ ...item, sequence_order: index + 1 }))
    });
    toast.success('Задание удалено');
  };

  const toggleItemChecked = (itemId: string) => {
    const item = checksheet.items.find(i => i.id === itemId);
    if (item) {
      updateItem(itemId, {
        checked: !item.checked,
        checked_at: !item.checked ? new Date().toISOString() : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileCheck className="text-purple-600" size={24} />
              Раздел 3: Контрольный лист
            </h3>
            <button
              type="button"
              onClick={() => {
                if (checksheet.items.length === 0 && !checksheet.instructions) {
                  toast.error('Добавьте хотя бы одно задание или инструкцию перед скачиванием');
                  return;
                }
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                  toast.error('Не удалось открыть окно для печати. Разрешите всплывающие окна.');
                  return;
                }

                const htmlContent = generateChecksheetHTMLForDownload();
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                
                setTimeout(() => {
                  printWindow.print();
                }, 250);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white rounded-xl font-bold hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              title="Скачать контрольный лист в PDF"
            >
              <Printer size={20} />
              <span>Скачать в PDF</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Инструкция */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Инструкция как работать с контрольным листом
            </label>
            <textarea
              value={checksheet.instructions || ''}
              onChange={(e) => updateChecksheet({ instructions: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[120px]"
              placeholder="Опишите, как сотрудник должен работать с контрольным листом..."
            />
          </div>

          {/* Добавление нового задания */}
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-xl p-6 border-2 border-purple-300 shadow-lg">
            <h4 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                <Plus className="text-white" size={20} />
              </div>
              Добавить задание
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Тип задания
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'theoretical', label: 'Теоретическое', icon: BookOpen },
                    { id: 'practical', label: 'Практическое', icon: CheckCircle2 },
                    { id: 'exercise', label: 'Упражнение', icon: Target },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewItemType(type.id as any)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2 ${
                        newItemType === type.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      <type.icon size={16} />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Текст задания *
                </label>
                <textarea
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
                  placeholder="Введите текст задания или инструкцию..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ссылка (опционально)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newItemLink}
                    onChange={(e) => setNewItemLink(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://..."
                  />
                  {newItemLink && (
                    <a
                      href={newItemLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                    >
                      <LinkIcon size={16} />
                      Открыть
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={addChecksheetItem}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-xl font-black hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 text-base"
              >
                <Plus size={22} />
                Добавить задание
              </button>
            </div>
          </div>

          {/* Список заданий */}
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 border-2 border-slate-200 shadow-md">
            <h4 className="text-xl font-black text-slate-800 mb-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileCheck className="text-white" size={22} />
              </div>
              <span>Задания контрольного листа</span>
              <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-black shadow-md">
                {checksheet.items.length}
              </span>
            </h4>
            <div className="space-y-3">
              {checksheet.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-xl border-2 transition-all shadow-md hover:shadow-lg ${
                    item.checked
                      ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-400 shadow-green-200'
                      : 'bg-gradient-to-br from-white via-purple-50/50 to-white border-purple-300 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleItemChecked(item.id)}
                      className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        item.checked
                          ? 'bg-green-500 border-green-600 text-white'
                          : 'border-slate-300 hover:border-purple-500'
                      }`}
                    >
                      {item.checked && <Check size={16} />}
                    </button>

                      <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-black shadow-md">
                          #{item.sequence_number}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 ${
                          item.type === 'theoretical'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                            : item.type === 'practical'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        }`}>
                          {item.type === 'theoretical' ? (
                            <>
                              <BookOpen size={14} />
                              Теория
                            </>
                          ) : item.type === 'practical' ? (
                            <>
                              <CheckCircle2 size={14} />
                              Практика
                            </>
                          ) : (
                            <>
                              <Target size={14} />
                              Упражнение
                            </>
                          )}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold leading-relaxed ${
                        item.checked ? 'text-slate-600 line-through' : 'text-slate-800'
                      }`}>
                        {item.text}
                      </p>

                      {editingItemId === item.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={item.text}
                            onChange={(e) => updateItem(item.id, { text: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[60px]"
                            onBlur={() => setEditingItemId(null)}
                            autoFocus
                          />
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Ссылка (опционально)
                            </label>
                            <input
                              type="url"
                              value={item.notes?.replace('Ссылка: ', '') || ''}
                              onChange={(e) => updateItem(item.id, { notes: e.target.value ? `Ссылка: ${e.target.value}` : undefined })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1.5 bg-slate-400 text-white rounded-lg text-sm font-bold hover:bg-slate-500"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p
                            className={`text-sm mb-2 cursor-pointer hover:text-purple-600 ${
                              item.checked ? 'line-through text-slate-500' : 'text-slate-700'
                            }`}
                            onClick={() => setEditingItemId(item.id)}
                          >
                            {item.text}
                          </p>
                          {item.notes && (
                            <a
                              href={item.notes.replace('Ссылка: ', '')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon size={12} />
                              {item.notes.replace('Ссылка: ', '')}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingItemId(item.id)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Редактировать"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {checksheet.items.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                  <FileCheck size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold mb-1">Задания отсутствуют</p>
                  <p className="text-xs">Добавьте первое задание выше</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HatFolderEditor;
