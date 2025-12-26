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
  CheckCircle, Clock, Target, BarChart3, List, ArrowUpDown, Check, Printer,
  GraduationCap, Eye, Search, Monitor, ClipboardCheck, MessageSquare, FileImage, Download
} from 'lucide-react';
import { HatFile, HatFileBasicData, HatFileResponsibilitiesDescription, ResponsibilityDescription, ActionStep, SuccessfulAction, TrainingExercise, HatFileChecksheet, ChecksheetItem, ChecksheetItemType, HatFileRegulations, HatFileDocument, HatFileLink, HatFileTrainingMaterials, HatFileCourse, HatFileVideo, HatFilePresentation, HatFileDevelopmentRoadmap, DevelopmentLevel, DevelopmentStep, HatFileToolsAccess, SoftwareAccess, EquipmentItem, AccountAccess, HatFileHistory, HistoryEvent, HatFileAdditional, FAQItem, KnowledgeBaseItem, BestPractice, ExternalLink } from '../types';
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
        post_goal: '', // Заполняется HR
        department_name: dept?.name || '',
        responsibilities: dept?.functions || [],
        products: post?.vfp ? [post.vfp] : [],
        statistics: [],
        org_chart_position: `${dept?.name || ''} → ${postName}`,
        reporting_line: '',
        communication_lines: [],
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
      const responsibilitiesCount = file.responsibilities_description.responsibilities.length;
      const avgResponsibilityCompletion = file.responsibilities_description.responsibilities.reduce((acc, r) => {
        let respTotal = 0;
        if (r.brief_description) respTotal += 33;
        if (r.expected_product) respTotal += 33;
        if (r.action_sequence.length > 0) respTotal += 34;
        return acc + respTotal;
      }, 0) / responsibilitiesCount;
      completed += (avgResponsibilityCompletion * 30) / 100;
    }

    // Раздел 3: Контрольный лист (20%)
    total += 20;
    if (file.checksheets.length > 0) {
      const checksheet = file.checksheets[0];
      if (checksheet.instructions) completed += 5;
      if (checksheet.items.length > 0) {
        const completedItems = checksheet.items.filter(i => i.checked).length;
        const itemsCount = checksheet.items.length;
        completed += itemsCount > 0 ? (completedItems / itemsCount) * 15 : 0;
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
          <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0 shadow-sm">
            <nav className="p-3 space-y-1">
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
                
                // Определяем стили для активного состояния в зависимости от цвета
                const getActiveStyles = () => {
                  const styles: Record<string, { bg: string; text: string; border: string }> = {
                    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
                    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
                    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
                    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' },
                    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
                    pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300' },
                    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
                    slate: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
                    gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
                  };
                  return styles[section.color] || styles.slate;
                };

                const activeStyles = getActiveStyles();

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? `${activeStyles.bg} ${activeStyles.text} font-semibold border-l-4 ${activeStyles.border} shadow-sm`
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent'
                    }`}
                    style={{
                      minHeight: '44px', // Фиксированная высота для предотвращения "пляски" текста
                    }}
                  >
                    <Icon 
                      size={18} 
                      className={`flex-shrink-0 ${isActive ? '' : 'opacity-70'}`}
                      style={{ width: '18px', height: '18px' }} // Фиксированный размер иконки
                    />
                    <span className="text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                      {section.label}
                    </span>
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
            {activeSection === 'regulations' && (
              <Section4Regulations 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                employeeId={employeeId}
              />
            )}
            {activeSection === 'training' && (
              <Section5TrainingMaterials 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                employeeId={employeeId}
              />
            )}
            {activeSection === 'roadmap' && (
              <Section6DevelopmentRoadmap 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'tools' && (
              <Section7ToolsAccess 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'history' && (
              <Section8History 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
            {activeSection === 'additional' && (
              <Section9Additional 
                hatFile={hatFile}
                setHatFile={setHatFile}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              />
            )}
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
  const [newItemType, setNewItemType] = useState<ChecksheetItemType>('theoretical');
  const [newItemLink, setNewItemLink] = useState('');

  // Инициализируем checksheet при первом рендере, если его нет
  useEffect(() => {
    if (hatFile && hatFile.checksheets.length === 0) {
      const newChecksheet: HatFileChecksheet = {
        id: crypto.randomUUID(),
        name: 'Контрольный лист',
        items: [],
        assigned_at: new Date().toISOString(),
        instructions: 'Инструкция по работе с контрольным листом:\n\n1. Изучите теоретический материал\n2. Выполните практические задания\n3. Отметьте выполненные пункты',
      };
      setHatFile(prev => prev ? {
        ...prev,
        checksheets: [newChecksheet]
      } : null);
    }
  }, [hatFile]); // При изменении hatFile

  // Получаем текущий контрольный лист
  const checksheet = hatFile && hatFile.checksheets.length > 0 ? hatFile.checksheets[0] : {
    id: crypto.randomUUID(),
    name: 'Контрольный лист',
    items: [],
    assigned_at: new Date().toISOString(),
    instructions: '',
  };

  // Если hatFile отсутствует, не рендерим компонент
  if (!hatFile) return null;

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'theoretical', label: 'Теоретическое', icon: BookOpen, color: 'blue' },
                    { id: 'practical', label: 'Практическое', icon: CheckCircle2, color: 'green' },
                    { id: 'essay', label: 'Эссе', icon: FileText, color: 'purple' },
                    { id: 'sketch', label: 'Зарисовка', icon: FileImage, color: 'pink' },
                    { id: 'reading', label: 'Прочитать', icon: Eye, color: 'indigo' },
                    { id: 'memorize', label: 'Выучить', icon: Target, color: 'orange' },
                    { id: 'training', label: 'Тренировка', icon: GraduationCap, color: 'teal' },
                    { id: 'glossary', label: 'Глоссарий', icon: Search, color: 'amber' },
                    { id: 'online_course', label: 'Онлайн-курс', icon: Monitor, color: 'cyan' },
                    { id: 'inspection', label: 'Инспекция', icon: ClipboardCheck, color: 'red' },
                    { id: 'coordination', label: 'Координация', icon: MessageSquare, color: 'violet' },
                    { id: 'other', label: 'Другое', icon: Info, color: 'gray' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewItemType(type.id as ChecksheetItemType)}
                      className={`px-3 py-2 rounded-lg border-2 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        newItemType === type.id
                          ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                          : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      <type.icon size={14} />
                      <span className="hidden sm:inline">{type.label}</span>
                      <span className="sm:hidden">{type.label.split(' ')[0]}</span>
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
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-black shadow-md">
                          #{item.sequence_number}
                        </span>
                        {(() => {
                          const typeConfig: Record<ChecksheetItemType, { label: string; icon: React.ReactNode; gradient: string }> = {
                            theoretical: { label: 'Теоретическое', icon: <BookOpen size={14} />, gradient: 'from-blue-500 to-cyan-500' },
                            practical: { label: 'Практическое', icon: <CheckCircle2 size={14} />, gradient: 'from-green-500 to-emerald-500' },
                            essay: { label: 'Эссе', icon: <FileText size={14} />, gradient: 'from-purple-500 to-pink-500' },
                            sketch: { label: 'Зарисовка', icon: <FileImage size={14} />, gradient: 'from-pink-500 to-rose-500' },
                            reading: { label: 'Прочитать', icon: <Eye size={14} />, gradient: 'from-indigo-500 to-blue-500' },
                            memorize: { label: 'Выучить', icon: <Target size={14} />, gradient: 'from-orange-500 to-amber-500' },
                            training: { label: 'Тренировка', icon: <GraduationCap size={14} />, gradient: 'from-teal-500 to-cyan-500' },
                            glossary: { label: 'Глоссарий', icon: <Search size={14} />, gradient: 'from-amber-500 to-yellow-500' },
                            online_course: { label: 'Онлайн-курс', icon: <Monitor size={14} />, gradient: 'from-cyan-500 to-blue-500' },
                            inspection: { label: 'Инспекция', icon: <ClipboardCheck size={14} />, gradient: 'from-red-500 to-rose-500' },
                            coordination: { label: 'Координация', icon: <MessageSquare size={14} />, gradient: 'from-violet-500 to-purple-500' },
                            other: { label: 'Другое', icon: <Info size={14} />, gradient: 'from-gray-500 to-slate-500' },
                          };
                          const config = typeConfig[item.type] || typeConfig.other;
                          return (
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 bg-gradient-to-r ${config.gradient} text-white`}>
                              {config.icon}
                              {config.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className={`text-sm font-semibold leading-relaxed ${
                        item.checked ? 'text-slate-600 line-through' : 'text-slate-800'
                      }`}>
                        {item.text}
                      </p>

                      {editingItemId === item.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Тип задания
                            </label>
                            <select
                              value={item.type}
                              onChange={(e) => updateItem(item.id, { type: e.target.value as ChecksheetItemType })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                            >
                              <option value="theoretical">Теоретическое</option>
                              <option value="practical">Практическое</option>
                              <option value="essay">Эссе</option>
                              <option value="sketch">Зарисовка</option>
                              <option value="reading">Прочитать</option>
                              <option value="memorize">Выучить</option>
                              <option value="training">Тренировка</option>
                              <option value="glossary">Глоссарий</option>
                              <option value="online_course">Онлайн-курс</option>
                              <option value="inspection">Инспекция</option>
                              <option value="coordination">Координация</option>
                              <option value="other">Другое</option>
                            </select>
                          </div>
                          <textarea
                            value={item.text}
                            onChange={(e) => updateItem(item.id, { text: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[80px]"
                            placeholder="Введите текст задания..."
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
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-4 py-2 bg-slate-400 text-white rounded-lg text-sm font-bold hover:bg-slate-500 transition-colors"
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

// Раздел 4: Регламенты и политики
const Section4Regulations: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  employeeId: string;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection, employeeId }) => {
  const toast = useToast();
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');

  const updateRegulations = (updates: Partial<HatFileRegulations>) => {
    setHatFile(prev => prev ? {
      ...prev,
      regulations: { ...prev.regulations, ...updates }
    } : null);
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `hat-files/${employeeId}/regulations/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Ошибка загрузки файла:', uploadError);
        toast.error('Ошибка загрузки файла');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('employee-files')
        .getPublicUrl(filePath);

      const newDoc: HatFileDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        category: 'regulation',
        version: 1,
        uploaded_at: new Date().toISOString(),
        uploaded_by: employeeId,
      };

      updateRegulations({
        documents: [...hatFile.regulations.documents, newDoc]
      });

      toast.success('Документ загружен');
      event.target.value = ''; // Сброс input
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Удалить этот документ?')) return;
    
    const doc = hatFile.regulations.documents.find(d => d.id === docId);
    if (doc && supabase) {
      // Удаляем файл из storage
      try {
        const { error } = await supabase.storage
          .from('employee-files')
          .remove([doc.file_path]);
        
        if (error) {
          console.error('Ошибка удаления файла:', error);
          toast.error('Ошибка удаления файла из хранилища');
        }
      } catch (err) {
        console.error('Ошибка удаления файла:', err);
        toast.error('Ошибка удаления файла');
      }
    }

    updateRegulations({
      documents: hatFile.regulations.documents.filter(d => d.id !== docId)
    });
    toast.success('Документ удален');
  };

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Заполните название и URL');
      return;
    }

    const newLink: HatFileLink = {
      id: crypto.randomUUID(),
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
      category: newLinkCategory.trim() || 'general',
      description: newLinkDescription.trim() || undefined,
    };

    updateRegulations({
      links: [...hatFile.regulations.links, newLink]
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkCategory('');
    setNewLinkDescription('');
    toast.success('Ссылка добавлена');
  };

  const deleteLink = (linkId: string) => {
    if (!confirm('Удалить эту ссылку?')) return;
    updateRegulations({
      links: hatFile.regulations.links.filter(l => l.id !== linkId)
    });
    toast.success('Ссылка удалена');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="text-amber-600" size={24} />
            Раздел 4: Регламенты и политики
          </h3>
          <button
            onClick={() => toggleSection('regulations-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('regulations-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('regulations-main') && (
          <div className="space-y-6 mt-4">
            {/* Документы */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="text-amber-600" size={20} />
                  Документы
                </h4>
                <label className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 cursor-pointer transition-colors flex items-center gap-2">
                  <Upload size={16} />
                  Загрузить документ
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleDocumentUpload}
                    disabled={uploadingDoc}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadingDoc && (
                <div className="text-center py-4 text-amber-600">
                  Загрузка документа...
                </div>
              )}

              <div className="space-y-3">
                {hatFile.regulations.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="text-amber-600 flex-shrink-0" size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{doc.name}</div>
                        <div className="text-xs text-slate-500">
                          Версия {doc.version} • {new Date(doc.uploaded_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Download size={14} />
                          Скачать
                        </a>
                      )}
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.regulations.documents.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Документы отсутствуют</p>
                    <p className="text-xs mt-1">Загрузите первый документ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ссылки */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <LinkIcon className="text-amber-600" size={20} />
                Ссылки на регламенты и политики
              </h4>

              {/* Форма добавления ссылки */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl p-5 border-2 border-amber-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название ссылки *
                    </label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Например: Политика конфиденциальности"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Категория
                      </label>
                      <input
                        type="text"
                        value={newLinkCategory}
                        onChange={(e) => setNewLinkCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Например: Политики"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Описание (опционально)
                      </label>
                      <input
                        type="text"
                        value={newLinkDescription}
                        onChange={(e) => setNewLinkDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Краткое описание"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addLink}
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-black hover:from-amber-700 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить ссылку
                  </button>
                </div>
              </div>

              {/* Список ссылок */}
              <div className="space-y-3">
                {hatFile.regulations.links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-amber-300 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <LinkIcon className="text-amber-600 flex-shrink-0" size={18} />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-800 hover:text-amber-600 truncate"
                        >
                          {link.title}
                        </a>
                        {link.category && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                            {link.category}
                          </span>
                        )}
                      </div>
                      {link.description && (
                        <div className="text-sm text-slate-600 ml-7">{link.description}</div>
                      )}
                      <div className="text-xs text-slate-500 ml-7 mt-1 truncate">{link.url}</div>
                    </div>
                    <button
                      onClick={() => deleteLink(link.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.regulations.links.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <LinkIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ссылки отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первую ссылку выше</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 5: Обучающие материалы
const Section5TrainingMaterials: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  employeeId: string;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection, employeeId }) => {
  const toast = useToast();
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  
  // Состояние для новых элементов
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newCourseDuration, setNewCourseDuration] = useState('');
  const [newCourseRequired, setNewCourseRequired] = useState(true);
  
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDuration, setNewVideoDuration] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');

  const updateTrainingMaterials = (updates: Partial<HatFileTrainingMaterials>) => {
    setHatFile(prev => prev ? {
      ...prev,
      training_materials: { ...prev.training_materials, ...updates }
    } : null);
  };

  // Курсы
  const addCourse = () => {
    if (!newCourseTitle.trim() || !newCourseId.trim()) {
      toast.error('Заполните название и ID курса');
      return;
    }

    const newCourse: HatFileCourse = {
      id: crypto.randomUUID(),
      course_id: newCourseId.trim(),
      title: newCourseTitle.trim(),
      duration_hours: parseInt(newCourseDuration) || 0,
      required: newCourseRequired,
      assigned_at: new Date().toISOString(),
    };

    updateTrainingMaterials({
      courses: [...hatFile.training_materials.courses, newCourse]
    });

    setNewCourseTitle('');
    setNewCourseId('');
    setNewCourseDuration('');
    setNewCourseRequired(true);
    toast.success('Курс добавлен');
  };

  const deleteCourse = (courseId: string) => {
    if (!confirm('Удалить этот курс?')) return;
    updateTrainingMaterials({
      courses: hatFile.training_materials.courses.filter(c => c.id !== courseId)
    });
    toast.success('Курс удален');
  };

  const updateCourseProgress = (courseId: string, progress: number, completed?: boolean) => {
    updateTrainingMaterials({
      courses: hatFile.training_materials.courses.map(c =>
        c.id === courseId
          ? { ...c, progress, completed_at: completed ? new Date().toISOString() : c.completed_at }
          : c
      )
    });
  };

  // Видео
  const addVideo = () => {
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
      toast.error('Заполните название и URL видео');
      return;
    }

    const newVideo: HatFileVideo = {
      id: crypto.randomUUID(),
      title: newVideoTitle.trim(),
      url: newVideoUrl.trim(),
      duration: newVideoDuration ? parseInt(newVideoDuration) : undefined,
      description: newVideoDescription.trim() || undefined,
    };

    updateTrainingMaterials({
      videos: [...hatFile.training_materials.videos, newVideo]
    });

    setNewVideoTitle('');
    setNewVideoUrl('');
    setNewVideoDuration('');
    setNewVideoDescription('');
    toast.success('Видео добавлено');
  };

  const deleteVideo = (videoId: string) => {
    if (!confirm('Удалить это видео?')) return;
    updateTrainingMaterials({
      videos: hatFile.training_materials.videos.filter(v => v.id !== videoId)
    });
    toast.success('Видео удалено');
  };

  // Презентации
  const handlePresentationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    setUploadingPresentation(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `hat-files/${employeeId}/presentations/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('employee-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Ошибка загрузки файла:', uploadError);
        toast.error('Ошибка загрузки файла');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('employee-files')
        .getPublicUrl(filePath);

      const newPresentation: HatFilePresentation = {
        id: crypto.randomUUID(),
        title: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
      };

      updateTrainingMaterials({
        presentations: [...hatFile.training_materials.presentations, newPresentation]
      });

      toast.success('Презентация загружена');
      event.target.value = '';
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      toast.error('Ошибка при загрузке файла');
    } finally {
      setUploadingPresentation(false);
    }
  };

  const deletePresentation = async (presentationId: string) => {
    if (!confirm('Удалить эту презентацию?')) return;
    
    const presentation = hatFile.training_materials.presentations.find(p => p.id === presentationId);
    if (presentation && supabase) {
      try {
        const { error } = await supabase.storage
          .from('employee-files')
          .remove([presentation.file_path]);
        
        if (error) {
          console.error('Ошибка удаления файла:', error);
          toast.error('Ошибка удаления файла из хранилища');
        }
      } catch (err) {
        console.error('Ошибка удаления файла:', err);
        toast.error('Ошибка удаления файла');
      }
    }

    updateTrainingMaterials({
      presentations: hatFile.training_materials.presentations.filter(p => p.id !== presentationId)
    });
    toast.success('Презентация удалена');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            Раздел 5: Обучающие материалы
          </h3>
          <button
            onClick={() => toggleSection('training-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('training-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('training-main') && (
          <div className="space-y-8 mt-4">
            {/* Курсы */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <GraduationCap className="text-indigo-600" size={20} />
                  Курсы
                </h4>
              </div>

              {/* Форма добавления курса */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200 mb-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Название курса *
                      </label>
                      <input
                        type="text"
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Например: Основы продаж"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        ID курса (из Академии) *
                      </label>
                      <input
                        type="text"
                        value={newCourseId}
                        onChange={(e) => setNewCourseId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="course-123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Длительность (часы)
                      </label>
                      <input
                        type="number"
                        value={newCourseDuration}
                        onChange={(e) => setNewCourseDuration(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="8"
                        min="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCourseRequired}
                          onChange={(e) => setNewCourseRequired(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Обязательный курс</span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={addCourse}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить курс
                  </button>
                </div>
              </div>

              {/* Список курсов */}
              <div className="space-y-3">
                {hatFile.training_materials.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GraduationCap className="text-indigo-600 flex-shrink-0" size={20} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{course.title}</span>
                          {course.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                              Обязательный
                            </span>
                          )}
                          {course.completed_at && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                              Завершен
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {course.course_id} • {course.duration_hours} ч. • Назначен: {new Date(course.assigned_at).toLocaleDateString('ru-RU')}
                        </div>
                        {course.progress !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{course.progress}% выполнено</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.training_materials.courses.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Курсы отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первый курс выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Видео */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Monitor className="text-indigo-600" size={20} />
                Видео
              </h4>

              {/* Форма добавления видео */}
              <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название видео *
                    </label>
                    <input
                      type="text"
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Например: Введение в продукт"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      URL видео *
                    </label>
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Длительность (минуты)
                      </label>
                      <input
                        type="number"
                        value={newVideoDuration}
                        onChange={(e) => setNewVideoDuration(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="15"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Описание
                      </label>
                      <input
                        type="text"
                        value={newVideoDescription}
                        onChange={(e) => setNewVideoDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Краткое описание"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addVideo}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-black hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить видео
                  </button>
                </div>
              </div>

              {/* Список видео */}
              <div className="space-y-3">
                {hatFile.training_materials.videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Monitor className="text-indigo-600 flex-shrink-0 mt-1" size={20} />
                      <div className="flex-1 min-w-0">
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-800 hover:text-indigo-600 block mb-1"
                        >
                          {video.title}
                        </a>
                        {video.description && (
                          <div className="text-sm text-slate-600 mb-1">{video.description}</div>
                        )}
                        <div className="text-xs text-slate-500">
                          {video.duration ? `${video.duration} мин. • ` : ''}
                          <span className="truncate">{video.url}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteVideo(video.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.training_materials.videos.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Видео отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первое видео выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Презентации */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20} />
                  Презентации
                </h4>
                <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 cursor-pointer transition-colors flex items-center gap-2">
                  <Upload size={16} />
                  Загрузить презентацию
                  <input
                    type="file"
                    accept=".pdf,.pptx,.ppt"
                    onChange={handlePresentationUpload}
                    disabled={uploadingPresentation}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadingPresentation && (
                <div className="text-center py-4 text-indigo-600">
                  Загрузка презентации...
                </div>
              )}

              <div className="space-y-3">
                {hatFile.training_materials.presentations.map((presentation) => (
                  <div
                    key={presentation.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="text-indigo-600 flex-shrink-0" size={20} />
                      <div className="font-semibold text-slate-800 truncate">{presentation.title}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {presentation.file_url && (
                        <a
                          href={presentation.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Download size={14} />
                          Скачать
                        </a>
                      )}
                      <button
                        onClick={() => deletePresentation(presentation.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.training_materials.presentations.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Презентации отсутствуют</p>
                    <p className="text-xs mt-1">Загрузите первую презентацию</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 6: Маршрутная карта развития
const Section6DevelopmentRoadmap: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const toast = useToast();
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // Состояние для нового уровня
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelGoal, setNewLevelGoal] = useState('');
  const [newLevelDuration, setNewLevelDuration] = useState('');

  // Состояние для нового шага
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newStepType, setNewStepType] = useState<'course' | 'task' | 'practice' | 'exam' | 'checkout'>('course');
  const [newStepCourseId, setNewStepCourseId] = useState('');
  const [newStepDuration, setNewStepDuration] = useState('');
  const [newStepDueDays, setNewStepDueDays] = useState('');

  const updateRoadmap = (updates: Partial<HatFileDevelopmentRoadmap>) => {
    setHatFile(prev => prev ? {
      ...prev,
      development_roadmap: { ...prev.development_roadmap, ...updates }
    } : null);
  };

  const toggleLevelExpanded = (levelId: string) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(levelId)) {
        newSet.delete(levelId);
      } else {
        newSet.add(levelId);
      }
      return newSet;
    });
  };

  const addLevel = () => {
    if (!newLevelName.trim() || !newLevelGoal.trim()) {
      toast.error('Заполните название уровня и цель');
      return;
    }

    const newLevel: DevelopmentLevel = {
      id: crypto.randomUUID(),
      level_name: newLevelName.trim(),
      level_number: hatFile.development_roadmap.levels.length + 1,
      goal: newLevelGoal.trim(),
      duration_days: newLevelDuration ? parseInt(newLevelDuration) : undefined,
      steps: [],
      transition_criteria: [],
    };

    updateRoadmap({
      levels: [...hatFile.development_roadmap.levels, newLevel]
    });

    setNewLevelName('');
    setNewLevelGoal('');
    setNewLevelDuration('');
    toast.success('Уровень добавлен');
  };

  const deleteLevel = (levelId: string) => {
    if (!confirm('Удалить этот уровень? Все шаги будут удалены.')) return;
    
    const updatedLevels = hatFile.development_roadmap.levels
      .filter(l => l.id !== levelId)
      .map((l, index) => ({ ...l, level_number: index + 1 }));
    
    updateRoadmap({ levels: updatedLevels });
    toast.success('Уровень удален');
  };

  const updateLevel = (levelId: string, updates: Partial<DevelopmentLevel>) => {
    updateRoadmap({
      levels: hatFile.development_roadmap.levels.map(l =>
        l.id === levelId ? { ...l, ...updates } : l
      )
    });
  };

  const addStep = (levelId: string) => {
    if (!newStepTitle.trim()) {
      toast.error('Заполните название шага');
      return;
    }

    const newStep: DevelopmentStep = {
      id: crypto.randomUUID(),
      title: newStepTitle.trim(),
      description: newStepDescription.trim() || undefined,
      type: newStepType,
      course_id: newStepCourseId.trim() || undefined,
      duration_hours: newStepDuration ? parseInt(newStepDuration) : undefined,
      due_days: newStepDueDays ? parseInt(newStepDueDays) : undefined,
      completed: false,
    };

    updateLevel(levelId, {
      steps: [...hatFile.development_roadmap.levels.find(l => l.id === levelId)!.steps, newStep]
    });

    setNewStepTitle('');
    setNewStepDescription('');
    setNewStepCourseId('');
    setNewStepDuration('');
    setNewStepDueDays('');
    setNewStepType('course');
    toast.success('Шаг добавлен');
  };

  const deleteStep = (levelId: string, stepId: string) => {
    if (!confirm('Удалить этот шаг?')) return;
    
    updateLevel(levelId, {
      steps: hatFile.development_roadmap.levels.find(l => l.id === levelId)!.steps.filter(s => s.id !== stepId)
    });
    toast.success('Шаг удален');
  };

  const toggleStepCompleted = (levelId: string, stepId: string) => {
    const level = hatFile.development_roadmap.levels.find(l => l.id === levelId);
    if (!level) return;

    const step = level.steps.find(s => s.id === stepId);
    if (!step) return;

    updateLevel(levelId, {
      steps: level.steps.map(s =>
        s.id === stepId
          ? { ...s, completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : undefined }
          : s
      )
    });
  };

  const addTransitionCriterion = (levelId: string) => {
    const criterion = prompt('Введите критерий перехода на следующий уровень:');
    if (criterion && criterion.trim()) {
      const level = hatFile.development_roadmap.levels.find(l => l.id === levelId);
      if (level) {
        updateLevel(levelId, {
          transition_criteria: [...level.transition_criteria, criterion.trim()]
        });
        toast.success('Критерий добавлен');
      }
    }
  };

  const deleteTransitionCriterion = (levelId: string, index: number) => {
    const level = hatFile.development_roadmap.levels.find(l => l.id === levelId);
    if (level) {
      updateLevel(levelId, {
        transition_criteria: level.transition_criteria.filter((_, i) => i !== index)
      });
      toast.success('Критерий удален');
    }
  };

  const getStepTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: 'Курс',
      task: 'Задание',
      practice: 'Практика',
      exam: 'Экзамен',
      checkout: 'Проверка',
    };
    return labels[type] || type;
  };

  const getStepTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      course: 'blue',
      task: 'green',
      practice: 'purple',
      exam: 'red',
      checkout: 'orange',
    };
    return colors[type] || 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Target className="text-pink-600" size={24} />
            Раздел 6: Маршрутная карта развития
          </h3>
          <button
            onClick={() => toggleSection('roadmap-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('roadmap-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('roadmap-main') && (
          <div className="space-y-6 mt-4">
            {/* Форма добавления уровня */}
            <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 rounded-xl p-5 border-2 border-pink-200">
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="text-pink-600" size={20} />
                Добавить уровень развития
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название уровня *
                    </label>
                    <input
                      type="text"
                      value={newLevelName}
                      onChange={(e) => setNewLevelName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Например: Стажер"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Длительность (дни)
                    </label>
                    <input
                      type="number"
                      value={newLevelDuration}
                      onChange={(e) => setNewLevelDuration(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="90"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Цель уровня *
                  </label>
                  <textarea
                    value={newLevelGoal}
                    onChange={(e) => setNewLevelGoal(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[80px]"
                    placeholder="Опишите цель этого уровня развития..."
                  />
                </div>
                <button
                  onClick={addLevel}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-xl font-black hover:from-pink-700 hover:to-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  Добавить уровень
                </button>
              </div>
            </div>

            {/* Список уровней */}
            <div className="space-y-4">
              {hatFile.development_roadmap.levels.map((level) => (
                <div
                  key={level.id}
                  className="bg-slate-50 rounded-xl border-2 border-slate-200 overflow-hidden"
                >
                  {/* Заголовок уровня */}
                  <div
                    className="p-4 bg-gradient-to-r from-pink-100 to-rose-100 cursor-pointer hover:from-pink-200 hover:to-rose-200 transition-all"
                    onClick={() => toggleLevelExpanded(level.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-pink-600 text-white rounded-lg font-black text-sm">
                          Уровень {level.level_number}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800">{level.level_name}</h4>
                        {level.duration_days && (
                          <span className="text-sm text-slate-600">
                            {level.duration_days} дней
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          {level.steps.filter(s => s.completed).length} / {level.steps.length} шагов
                        </span>
                        {expandedLevels.has(level.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{level.goal}</div>
                  </div>

                  {/* Содержимое уровня */}
                  {expandedLevels.has(level.id) && (
                    <div className="p-4 space-y-4">
                      {/* Цель уровня (редактируемая) */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Цель уровня
                        </label>
                        <textarea
                          value={level.goal}
                          onChange={(e) => updateLevel(level.id, { goal: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[60px]"
                        />
                      </div>

                      {/* Шаги развития */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-md font-bold text-slate-700">Шаги развития</h5>
                          <button
                            onClick={() => setEditingStepId(level.id)}
                            className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-sm font-bold hover:bg-pink-700 flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Добавить шаг
                          </button>
                        </div>

                        {/* Форма добавления шага */}
                        {editingStepId === level.id && (
                          <div className="bg-white rounded-lg p-4 border-2 border-pink-200 mb-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Название шага *
                                </label>
                                <input
                                  type="text"
                                  value={newStepTitle}
                                  onChange={(e) => setNewStepTitle(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                                  placeholder="Например: Пройти курс по продажам"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Описание
                                </label>
                                <textarea
                                  value={newStepDescription}
                                  onChange={(e) => setNewStepDescription(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 min-h-[60px] text-sm"
                                  placeholder="Дополнительное описание шага..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Тип шага
                                  </label>
                                  <select
                                    value={newStepType}
                                    onChange={(e) => setNewStepType(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                                  >
                                    <option value="course">Курс</option>
                                    <option value="task">Задание</option>
                                    <option value="practice">Практика</option>
                                    <option value="exam">Экзамен</option>
                                    <option value="checkout">Проверка</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    ID курса (если тип - курс)
                                  </label>
                                  <input
                                    type="text"
                                    value={newStepCourseId}
                                    onChange={(e) => setNewStepCourseId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                                    placeholder="course-123"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Длительность (часы)
                                  </label>
                                  <input
                                    type="number"
                                    value={newStepDuration}
                                    onChange={(e) => setNewStepDuration(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                                    placeholder="8"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Срок выполнения (дни от начала уровня)
                                  </label>
                                  <input
                                    type="number"
                                    value={newStepDueDays}
                                    onChange={(e) => setNewStepDueDays(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 text-sm"
                                    placeholder="30"
                                    min="0"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    addStep(level.id);
                                    setEditingStepId(null);
                                  }}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700"
                                >
                                  Добавить
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingStepId(null);
                                    setNewStepTitle('');
                                    setNewStepDescription('');
                                    setNewStepCourseId('');
                                    setNewStepDuration('');
                                    setNewStepDueDays('');
                                  }}
                                  className="px-4 py-2 bg-slate-400 text-white rounded-lg text-sm font-bold hover:bg-slate-500"
                                >
                                  Отмена
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Список шагов */}
                        <div className="space-y-2">
                          {level.steps.map((step) => (
                            <div
                              key={step.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                                step.completed
                                  ? 'bg-green-50 border-green-300'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <button
                                onClick={() => toggleStepCompleted(level.id, step.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                  step.completed
                                    ? 'bg-green-500 border-green-600 text-white'
                                    : 'border-slate-300 hover:border-pink-500'
                                }`}
                              >
                                {step.completed && <Check size={14} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${getStepTypeColor(step.type)}-100 text-${getStepTypeColor(step.type)}-700`}>
                                    {getStepTypeLabel(step.type)}
                                  </span>
                                  <span className={`font-semibold text-sm ${
                                    step.completed ? 'line-through text-slate-500' : 'text-slate-800'
                                  }`}>
                                    {step.title}
                                  </span>
                                </div>
                                {step.description && (
                                  <div className="text-xs text-slate-600 mb-1">{step.description}</div>
                                )}
                                <div className="text-xs text-slate-500">
                                  {step.duration_hours && `${step.duration_hours} ч. • `}
                                  {step.due_days && `Срок: ${step.due_days} дней • `}
                                  {step.course_id && `Курс: ${step.course_id} • `}
                                  {step.completed_at && `Выполнено: ${new Date(step.completed_at).toLocaleDateString('ru-RU')}`}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteStep(level.id, step.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
                                title="Удалить"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {level.steps.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm">
                              Шаги отсутствуют. Добавьте первый шаг.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Критерии перехода */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-md font-bold text-slate-700">Критерии перехода на следующий уровень</h5>
                          <button
                            onClick={() => addTransitionCriterion(level.id)}
                            className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-sm font-bold hover:bg-pink-700 flex items-center gap-1"
                          >
                            <Plus size={14} />
                            Добавить критерий
                          </button>
                        </div>
                        <div className="space-y-2">
                          {level.transition_criteria.map((criterion, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200"
                            >
                              <span className="text-sm text-slate-700">{criterion}</span>
                              <button
                                onClick={() => deleteTransitionCriterion(level.id, index)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                title="Удалить"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {level.transition_criteria.length === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm">
                              Критерии отсутствуют. Добавьте первый критерий.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Кнопка удаления уровня */}
                      <div className="flex justify-end pt-2 border-t border-slate-200">
                        <button
                          onClick={() => deleteLevel(level.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          Удалить уровень
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {hatFile.development_roadmap.levels.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                  <Target size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold mb-1">Уровни развития отсутствуют</p>
                  <p className="text-xs">Добавьте первый уровень выше</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 7: Инструменты и доступы
const Section7ToolsAccess: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const toast = useToast();

  // Состояние для новых элементов
  const [newSoftwareName, setNewSoftwareName] = useState('');
  const [newSoftwareRequired, setNewSoftwareRequired] = useState(true);
  const [newSoftwareLogin, setNewSoftwareLogin] = useState('');
  const [newSoftwareNotes, setNewSoftwareNotes] = useState('');

  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentRequired, setNewEquipmentRequired] = useState(true);
  const [newEquipmentSerial, setNewEquipmentSerial] = useState('');
  const [newEquipmentNotes, setNewEquipmentNotes] = useState('');

  const [newAccountService, setNewAccountService] = useState('');
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountLogin, setNewAccountLogin] = useState('');

  const updateToolsAccess = (updates: Partial<HatFileToolsAccess>) => {
    setHatFile(prev => prev ? {
      ...prev,
      tools_access: { ...prev.tools_access, ...updates }
    } : null);
  };

  // Программное обеспечение
  const addSoftware = () => {
    if (!newSoftwareName.trim()) {
      toast.error('Введите название ПО');
      return;
    }

    const newSoftware: SoftwareAccess = {
      id: crypto.randomUUID(),
      name: newSoftwareName.trim(),
      required: newSoftwareRequired,
      access_granted: false,
      login: newSoftwareLogin.trim() || undefined,
      notes: newSoftwareNotes.trim() || undefined,
    };

    updateToolsAccess({
      software: [...hatFile.tools_access.software, newSoftware]
    });

    setNewSoftwareName('');
    setNewSoftwareLogin('');
    setNewSoftwareNotes('');
    setNewSoftwareRequired(true);
    toast.success('Программное обеспечение добавлено');
  };

  const deleteSoftware = (softwareId: string) => {
    if (!confirm('Удалить это ПО?')) return;
    updateToolsAccess({
      software: hatFile.tools_access.software.filter(s => s.id !== softwareId)
    });
    toast.success('ПО удалено');
  };

  const toggleSoftwareAccess = (softwareId: string) => {
    updateToolsAccess({
      software: hatFile.tools_access.software.map(s =>
        s.id === softwareId
          ? { ...s, access_granted: !s.access_granted, granted_at: !s.access_granted ? new Date().toISOString() : undefined }
          : s
      )
    });
  };

  // Оборудование
  const addEquipment = () => {
    if (!newEquipmentName.trim()) {
      toast.error('Введите название оборудования');
      return;
    }

    const newEquipment: EquipmentItem = {
      id: crypto.randomUUID(),
      name: newEquipmentName.trim(),
      required: newEquipmentRequired,
      provided: false,
      serial_number: newEquipmentSerial.trim() || undefined,
      notes: newEquipmentNotes.trim() || undefined,
    };

    updateToolsAccess({
      equipment: [...hatFile.tools_access.equipment, newEquipment]
    });

    setNewEquipmentName('');
    setNewEquipmentSerial('');
    setNewEquipmentNotes('');
    setNewEquipmentRequired(true);
    toast.success('Оборудование добавлено');
  };

  const deleteEquipment = (equipmentId: string) => {
    if (!confirm('Удалить это оборудование?')) return;
    updateToolsAccess({
      equipment: hatFile.tools_access.equipment.filter(e => e.id !== equipmentId)
    });
    toast.success('Оборудование удалено');
  };

  const toggleEquipmentProvided = (equipmentId: string) => {
    updateToolsAccess({
      equipment: hatFile.tools_access.equipment.map(e =>
        e.id === equipmentId
          ? { ...e, provided: !e.provided, provided_at: !e.provided ? new Date().toISOString() : undefined }
          : e
      )
    });
  };

  // Аккаунты
  const addAccount = () => {
    if (!newAccountService.trim()) {
      toast.error('Введите название сервиса');
      return;
    }

    const newAccount: AccountAccess = {
      id: crypto.randomUUID(),
      service_name: newAccountService.trim(),
      email: newAccountEmail.trim() || undefined,
      login: newAccountLogin.trim() || undefined,
      access_granted: false,
    };

    updateToolsAccess({
      accounts: [...hatFile.tools_access.accounts, newAccount]
    });

    setNewAccountService('');
    setNewAccountEmail('');
    setNewAccountLogin('');
    toast.success('Аккаунт добавлен');
  };

  const deleteAccount = (accountId: string) => {
    if (!confirm('Удалить этот аккаунт?')) return;
    updateToolsAccess({
      accounts: hatFile.tools_access.accounts.filter(a => a.id !== accountId)
    });
    toast.success('Аккаунт удален');
  };

  const toggleAccountAccess = (accountId: string) => {
    updateToolsAccess({
      accounts: hatFile.tools_access.accounts.map(a =>
        a.id === accountId
          ? { ...a, access_granted: !a.access_granted, granted_at: !a.access_granted ? new Date().toISOString() : undefined }
          : a
      )
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-teal-600" size={24} />
            Раздел 7: Инструменты и доступы
          </h3>
          <button
            onClick={() => toggleSection('tools-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('tools-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('tools-main') && (
          <div className="space-y-8 mt-4">
            {/* Программное обеспечение */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <Monitor className="text-teal-600" size={20} />
                  Программное обеспечение
                </h4>
              </div>

              {/* Форма добавления ПО */}
              <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название ПО *
                    </label>
                    <input
                      type="text"
                      value={newSoftwareName}
                      onChange={(e) => setNewSoftwareName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Например: CRM система"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Логин
                      </label>
                      <input
                        type="text"
                        value={newSoftwareLogin}
                        onChange={(e) => setNewSoftwareLogin(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="username"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSoftwareRequired}
                          onChange={(e) => setNewSoftwareRequired(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Обязательное</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Примечания
                    </label>
                    <textarea
                      value={newSoftwareNotes}
                      onChange={(e) => setNewSoftwareNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                  <button
                    onClick={addSoftware}
                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-black hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить ПО
                  </button>
                </div>
              </div>

              {/* Список ПО */}
              <div className="space-y-3">
                {hatFile.tools_access.software.map((software) => (
                  <div
                    key={software.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      software.access_granted
                        ? 'bg-green-50 border-green-300'
                        : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleSoftwareAccess(software.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          software.access_granted
                            ? 'bg-green-500 border-green-600 text-white'
                            : 'border-slate-300 hover:border-teal-500'
                        }`}
                      >
                        {software.access_granted && <Check size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{software.name}</span>
                          {software.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                              Обязательное
                            </span>
                          )}
                          {software.access_granted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                              Доступ предоставлен
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {software.login && `Логин: ${software.login} • `}
                          {software.granted_at && `Предоставлен: ${new Date(software.granted_at).toLocaleDateString('ru-RU')}`}
                        </div>
                        {software.notes && (
                          <div className="text-sm text-slate-600 mt-1">{software.notes}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSoftware(software.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.tools_access.software.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <Monitor size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">ПО отсутствует</p>
                    <p className="text-xs mt-1">Добавьте первое ПО выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Оборудование */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Target className="text-teal-600" size={20} />
                Оборудование
              </h4>

              {/* Форма добавления оборудования */}
              <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название оборудования *
                    </label>
                    <input
                      type="text"
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Например: Ноутбук"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Серийный номер
                      </label>
                      <input
                        type="text"
                        value={newEquipmentSerial}
                        onChange={(e) => setNewEquipmentSerial(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="SN123456"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newEquipmentRequired}
                          onChange={(e) => setNewEquipmentRequired(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Обязательное</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Примечания
                    </label>
                    <textarea
                      value={newEquipmentNotes}
                      onChange={(e) => setNewEquipmentNotes(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[60px]"
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                  <button
                    onClick={addEquipment}
                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-black hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить оборудование
                  </button>
                </div>
              </div>

              {/* Список оборудования */}
              <div className="space-y-3">
                {hatFile.tools_access.equipment.map((equipment) => (
                  <div
                    key={equipment.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      equipment.provided
                        ? 'bg-green-50 border-green-300'
                        : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleEquipmentProvided(equipment.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          equipment.provided
                            ? 'bg-green-500 border-green-600 text-white'
                            : 'border-slate-300 hover:border-teal-500'
                        }`}
                      >
                        {equipment.provided && <Check size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{equipment.name}</span>
                          {equipment.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">
                              Обязательное
                            </span>
                          )}
                          {equipment.provided && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                              Предоставлено
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {equipment.serial_number && `Серийный номер: ${equipment.serial_number} • `}
                          {equipment.provided_at && `Предоставлено: ${new Date(equipment.provided_at).toLocaleDateString('ru-RU')}`}
                        </div>
                        {equipment.notes && (
                          <div className="text-sm text-slate-600 mt-1">{equipment.notes}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEquipment(equipment.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.tools_access.equipment.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <Target size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Оборудование отсутствует</p>
                    <p className="text-xs mt-1">Добавьте первое оборудование выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Аккаунты и доступы */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Users className="text-teal-600" size={20} />
                Аккаунты и доступы
              </h4>

              {/* Форма добавления аккаунта */}
              <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-xl p-5 border-2 border-teal-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название сервиса *
                    </label>
                    <input
                      type="text"
                      value={newAccountService}
                      onChange={(e) => setNewAccountService(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Например: Google Workspace"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newAccountEmail}
                        onChange={(e) => setNewAccountEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Логин
                      </label>
                      <input
                        type="text"
                        value={newAccountLogin}
                        onChange={(e) => setNewAccountLogin(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <button
                    onClick={addAccount}
                    className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-black hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить аккаунт
                  </button>
                </div>
              </div>

              {/* Список аккаунтов */}
              <div className="space-y-3">
                {hatFile.tools_access.accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      account.access_granted
                        ? 'bg-green-50 border-green-300'
                        : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleAccountAccess(account.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          account.access_granted
                            ? 'bg-green-500 border-green-600 text-white'
                            : 'border-slate-300 hover:border-teal-500'
                        }`}
                      >
                        {account.access_granted && <Check size={14} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{account.service_name}</span>
                          {account.access_granted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                              Доступ предоставлен
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {account.email && `Email: ${account.email} • `}
                          {account.login && `Логин: ${account.login} • `}
                          {account.granted_at && `Предоставлен: ${new Date(account.granted_at).toLocaleDateString('ru-RU')}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {hatFile.tools_access.accounts.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Аккаунты отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первый аккаунт выше</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 8: История
const Section8History: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const toast = useToast();

  // Состояние для нового события
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventType, setNewEventType] = useState<'appointment' | 'training' | 'correction' | 'achievement' | 'status_change'>('appointment');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventDescription, setNewEventDescription] = useState('');

  const updateHistory = (updates: Partial<HatFileHistory>) => {
    setHatFile(prev => prev ? {
      ...prev,
      history: { ...prev.history, ...updates }
    } : null);
  };

  const addEvent = () => {
    if (!newEventTitle.trim()) {
      toast.error('Введите название события');
      return;
    }

    const newEvent: HistoryEvent = {
      id: crypto.randomUUID(),
      date: newEventDate,
      type: newEventType,
      title: newEventTitle.trim(),
      description: newEventDescription.trim() || undefined,
    };

    // Сортируем события по дате (новые сверху)
    const updatedEvents = [newEvent, ...hatFile.history.events].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    updateHistory({ events: updatedEvents });

    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDate(new Date().toISOString().split('T')[0]);
    setNewEventType('appointment');
    toast.success('Событие добавлено');
  };

  const deleteEvent = (eventId: string) => {
    if (!confirm('Удалить это событие?')) return;
    updateHistory({
      events: hatFile.history.events.filter(e => e.id !== eventId)
    });
    toast.success('Событие удалено');
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      appointment: 'Назначение',
      training: 'Обучение',
      correction: 'Коррекция',
      achievement: 'Достижение',
      status_change: 'Изменение статуса',
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      appointment: 'blue',
      training: 'purple',
      correction: 'orange',
      achievement: 'green',
      status_change: 'red',
    };
    return colors[type] || 'gray';
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Users size={16} />;
      case 'training':
        return <GraduationCap size={16} />;
      case 'correction':
        return <AlertCircle size={16} />;
      case 'achievement':
        return <Award size={16} />;
      case 'status_change':
        return <ArrowUpDown size={16} />;
      default:
        return <Calendar size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Calendar className="text-slate-600" size={24} />
            Раздел 8: История
          </h3>
          <button
            onClick={() => toggleSection('history-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('history-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('history-main') && (
          <div className="space-y-6 mt-4">
            {/* Форма добавления события */}
            <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 rounded-xl p-5 border-2 border-slate-200">
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus className="text-slate-600" size={20} />
                Добавить событие
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Тип события
                    </label>
                    <select
                      value={newEventType}
                      onChange={(e) => setNewEventType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      <option value="appointment">Назначение</option>
                      <option value="training">Обучение</option>
                      <option value="correction">Коррекция</option>
                      <option value="achievement">Достижение</option>
                      <option value="status_change">Изменение статуса</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Дата события *
                    </label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Название события *
                  </label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Например: Назначен на пост Менеджер по продажам"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Описание (опционально)
                  </label>
                  <textarea
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 min-h-[80px]"
                    placeholder="Дополнительная информация о событии..."
                  />
                </div>
                <button
                  onClick={addEvent}
                  className="w-full px-6 py-3 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl font-black hover:from-slate-700 hover:to-gray-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  Добавить событие
                </button>
              </div>
            </div>

            {/* Список событий */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="text-slate-600" size={20} />
                История событий ({hatFile.history.events.length})
              </h4>

              {hatFile.history.events.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-semibold mb-1">События отсутствуют</p>
                  <p className="text-xs">Добавьте первое событие выше</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hatFile.history.events.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        event.type === 'achievement'
                          ? 'bg-green-50 border-green-200'
                          : event.type === 'correction'
                          ? 'bg-orange-50 border-orange-200'
                          : event.type === 'status_change'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg bg-${getEventTypeColor(event.type)}-100 flex-shrink-0`}>
                            <div className={`text-${getEventTypeColor(event.type)}-600`}>
                              {getEventTypeIcon(event.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${getEventTypeColor(event.type)}-100 text-${getEventTypeColor(event.type)}-700`}>
                                {getEventTypeLabel(event.type)}
                              </span>
                              <span className="text-sm font-semibold text-slate-800">{event.title}</span>
                            </div>
                            <div className="text-xs text-slate-500 mb-1">
                              {new Date(event.date).toLocaleDateString('ru-RU', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </div>
                            {event.description && (
                              <div className="text-sm text-slate-600 mt-2">{event.description}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Раздел 9: Дополнительно
const Section9Additional: React.FC<{
  hatFile: HatFile;
  setHatFile: React.Dispatch<React.SetStateAction<HatFile | null>>;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}> = ({ hatFile, setHatFile, expandedSections, toggleSection }) => {
  const toast = useToast();

  // Состояние для новых элементов
  const [newFAQQuestion, setNewFAQQuestion] = useState('');
  const [newFAQAnswer, setNewFAQAnswer] = useState('');

  const [newKBTitle, setNewKBTitle] = useState('');
  const [newKBContent, setNewKBContent] = useState('');
  const [newKBCategory, setNewKBCategory] = useState('');

  const [newBPTitle, setNewBPTitle] = useState('');
  const [newBPDescription, setNewBPDescription] = useState('');
  const [newBPExample, setNewBPExample] = useState('');

  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');

  const updateAdditional = (updates: Partial<HatFileAdditional>) => {
    setHatFile(prev => prev ? {
      ...prev,
      additional: { ...prev.additional, ...updates }
    } : null);
  };

  // FAQ
  const addFAQ = () => {
    if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) {
      toast.error('Заполните вопрос и ответ');
      return;
    }

    const newFAQ: FAQItem = {
      id: crypto.randomUUID(),
      question: newFAQQuestion.trim(),
      answer: newFAQAnswer.trim(),
    };

    updateAdditional({
      faq: [...hatFile.additional.faq, newFAQ]
    });

    setNewFAQQuestion('');
    setNewFAQAnswer('');
    toast.success('Вопрос добавлен');
  };

  const deleteFAQ = (faqId: string) => {
    if (!confirm('Удалить этот вопрос?')) return;
    updateAdditional({
      faq: hatFile.additional.faq.filter(f => f.id !== faqId)
    });
    toast.success('Вопрос удален');
  };

  // База знаний
  const addKnowledgeBase = () => {
    if (!newKBTitle.trim() || !newKBContent.trim()) {
      toast.error('Заполните название и содержание');
      return;
    }

    const newKB: KnowledgeBaseItem = {
      id: crypto.randomUUID(),
      title: newKBTitle.trim(),
      content: newKBContent.trim(),
      category: newKBCategory.trim() || 'general',
    };

    updateAdditional({
      knowledge_base: [...hatFile.additional.knowledge_base, newKB]
    });

    setNewKBTitle('');
    setNewKBContent('');
    setNewKBCategory('');
    toast.success('Статья добавлена');
  };

  const deleteKnowledgeBase = (kbId: string) => {
    if (!confirm('Удалить эту статью?')) return;
    updateAdditional({
      knowledge_base: hatFile.additional.knowledge_base.filter(k => k.id !== kbId)
    });
    toast.success('Статья удалена');
  };

  // Лучшие практики
  const addBestPractice = () => {
    if (!newBPTitle.trim() || !newBPDescription.trim()) {
      toast.error('Заполните название и описание');
      return;
    }

    const newBP: BestPractice = {
      id: crypto.randomUUID(),
      title: newBPTitle.trim(),
      description: newBPDescription.trim(),
      example: newBPExample.trim() || undefined,
    };

    updateAdditional({
      best_practices: [...hatFile.additional.best_practices, newBP]
    });

    setNewBPTitle('');
    setNewBPDescription('');
    setNewBPExample('');
    toast.success('Практика добавлена');
  };

  const deleteBestPractice = (bpId: string) => {
    if (!confirm('Удалить эту практику?')) return;
    updateAdditional({
      best_practices: hatFile.additional.best_practices.filter(b => b.id !== bpId)
    });
    toast.success('Практика удалена');
  };

  // Внешние ссылки
  const addExternalLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Заполните название и URL');
      return;
    }

    const newLink: ExternalLink = {
      id: crypto.randomUUID(),
      title: newLinkTitle.trim(),
      url: newLinkUrl.trim(),
      description: newLinkDescription.trim() || undefined,
    };

    updateAdditional({
      external_links: [...hatFile.additional.external_links, newLink]
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkDescription('');
    toast.success('Ссылка добавлена');
  };

  const deleteExternalLink = (linkId: string) => {
    if (!confirm('Удалить эту ссылку?')) return;
    updateAdditional({
      external_links: hatFile.additional.external_links.filter(l => l.id !== linkId)
    });
    toast.success('Ссылка удалена');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Info className="text-gray-600" size={24} />
            Раздел 9: Дополнительно
          </h3>
          <button
            onClick={() => toggleSection('additional-main')}
            className="text-slate-400 hover:text-slate-600"
          >
            {expandedSections.has('additional-main') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {expandedSections.has('additional-main') && (
          <div className="space-y-8 mt-4">
            {/* FAQ */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <FileText className="text-gray-600" size={20} />
                Часто задаваемые вопросы (FAQ)
              </h4>

              {/* Форма добавления FAQ */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Вопрос *
                    </label>
                    <input
                      type="text"
                      value={newFAQQuestion}
                      onChange={(e) => setNewFAQQuestion(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Например: Как оформить отпуск?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Ответ *
                    </label>
                    <textarea
                      value={newFAQAnswer}
                      onChange={(e) => setNewFAQAnswer(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[100px]"
                      placeholder="Подробный ответ на вопрос..."
                    />
                  </div>
                  <button
                    onClick={addFAQ}
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-black hover:from-gray-700 hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить вопрос
                  </button>
                </div>
              </div>

              {/* Список FAQ */}
              <div className="space-y-3">
                {hatFile.additional.faq.map((faq) => (
                  <div
                    key={faq.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 mb-2">Q: {faq.question}</div>
                        <div className="text-sm text-slate-600">A: {faq.answer}</div>
                      </div>
                      <button
                        onClick={() => deleteFAQ(faq.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.additional.faq.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Вопросы отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первый вопрос выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* База знаний */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <BookOpen className="text-gray-600" size={20} />
                База знаний
              </h4>

              {/* Форма добавления статьи */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название статьи *
                    </label>
                    <input
                      type="text"
                      value={newKBTitle}
                      onChange={(e) => setNewKBTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Например: Работа с CRM системой"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Категория
                      </label>
                      <input
                        type="text"
                        value={newKBCategory}
                        onChange={(e) => setNewKBCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                        placeholder="Например: Процессы"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Содержание *
                    </label>
                    <textarea
                      value={newKBContent}
                      onChange={(e) => setNewKBContent(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[120px]"
                      placeholder="Содержание статьи..."
                    />
                  </div>
                  <button
                    onClick={addKnowledgeBase}
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-black hover:from-gray-700 hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить статью
                  </button>
                </div>
              </div>

              {/* Список статей */}
              <div className="space-y-3">
                {hatFile.additional.knowledge_base.map((kb) => (
                  <div
                    key={kb.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-800">{kb.title}</span>
                          {kb.category && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-bold">
                              {kb.category}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">{kb.content}</div>
                      </div>
                      <button
                        onClick={() => deleteKnowledgeBase(kb.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.additional.knowledge_base.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Статьи отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первую статью выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Лучшие практики */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircle className="text-gray-600" size={20} />
                Лучшие практики
              </h4>

              {/* Форма добавления практики */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название практики *
                    </label>
                    <input
                      type="text"
                      value={newBPTitle}
                      onChange={(e) => setNewBPTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Например: Эффективная работа с клиентами"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Описание *
                    </label>
                    <textarea
                      value={newBPDescription}
                      onChange={(e) => setNewBPDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[80px]"
                      placeholder="Описание практики..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Пример (опционально)
                    </label>
                    <textarea
                      value={newBPExample}
                      onChange={(e) => setNewBPExample(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 min-h-[60px]"
                      placeholder="Конкретный пример применения..."
                    />
                  </div>
                  <button
                    onClick={addBestPractice}
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-black hover:from-gray-700 hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить практику
                  </button>
                </div>
              </div>

              {/* Список практик */}
              <div className="space-y-3">
                {hatFile.additional.best_practices.map((bp) => (
                  <div
                    key={bp.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800 mb-2">{bp.title}</div>
                        <div className="text-sm text-slate-600 mb-2">{bp.description}</div>
                        {bp.example && (
                          <div className="text-sm text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                            <strong>Пример:</strong> {bp.example}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteBestPractice(bp.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.additional.best_practices.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Практики отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первую практику выше</p>
                  </div>
                )}
              </div>
            </div>

            {/* Внешние ссылки */}
            <div>
              <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <LinkIcon className="text-gray-600" size={20} />
                Внешние ссылки
              </h4>

              {/* Форма добавления ссылки */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border-2 border-gray-200 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Название ссылки *
                    </label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Например: Документация API"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Описание (опционально)
                    </label>
                    <input
                      type="text"
                      value={newLinkDescription}
                      onChange={(e) => setNewLinkDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                      placeholder="Краткое описание ссылки"
                    />
                  </div>
                  <button
                    onClick={addExternalLink}
                    className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-black hover:from-gray-700 hover:to-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Plus size={20} />
                    Добавить ссылку
                  </button>
                </div>
              </div>

              {/* Список ссылок */}
              <div className="space-y-3">
                {hatFile.additional.external_links.map((link) => (
                  <div
                    key={link.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-slate-800 hover:text-gray-600 block mb-1"
                        >
                          {link.title}
                        </a>
                        {link.description && (
                          <div className="text-sm text-slate-600 mb-1">{link.description}</div>
                        )}
                        <div className="text-xs text-slate-500 truncate">{link.url}</div>
                      </div>
                      <button
                        onClick={() => deleteExternalLink(link.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 ml-2"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hatFile.additional.external_links.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg">
                    <LinkIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ссылки отсутствуют</p>
                    <p className="text-xs mt-1">Добавьте первую ссылку выше</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HatFolderEditor;
