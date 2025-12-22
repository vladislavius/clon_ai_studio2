import React, { useState } from 'react';
import { useOnboarding } from '../hooks/useOnboarding';
import { OnboardingInstance, OnboardingTemplate, Employee } from '../types';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingTemplateEditor } from './OnboardingTemplateEditor';
import { OnboardingProgress } from './OnboardingProgress';
import {
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  X,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from './Toast';
import { logError } from '../utils/logger';

interface OnboardingDashboardProps {
  employees: Employee[];
  isAdmin: boolean;
}

export const OnboardingDashboard: React.FC<OnboardingDashboardProps> = ({ employees, isAdmin }) => {
  const {
    instances,
    templates,
    isLoading,
    error,
    createInstanceFromTemplate,
    updateTask,
    saveTemplate,
    deleteTemplate,
    deleteInstance,
  } = useOnboarding();

  const [selectedInstance, setSelectedInstance] = useState<OnboardingInstance | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<OnboardingTemplate> | null>(null);
  const [creatingInstance, setCreatingInstance] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'instance' | 'template'; id: string } | null>(null);
  const { showToast } = useToast();

  const handleCreateInstance = async () => {
    if (!selectedEmployee || !selectedTemplate) {
      showToast('Выберите сотрудника и шаблон', 'error');
      return;
    }

    try {
      const instance = await createInstanceFromTemplate(selectedEmployee.id, selectedTemplate.id);
      if (instance) {
        showToast('Онбординг успешно создан', 'success');
        setCreatingInstance(false);
        setSelectedEmployee(null);
        setSelectedTemplate(null);
        setSelectedInstance(instance);
      } else {
        showToast('Не удалось создать онбординг', 'error');
      }
    } catch (err: any) {
      logError('Ошибка создания онбординга:', err);
      const errorMessage = err?.message || 'Ошибка создания онбординга';
      if (errorMessage.includes('не существует') || errorMessage.includes('does not exist') || err?.code === '42P01' || err?.code === 'PGRST116') {
        showToast('Таблица онбординга не создана. Выполните SQL скрипт create_onboarding_tables.sql в Supabase', 'error');
      } else if (errorMessage.includes('Нет прав') || errorMessage.includes('permission denied') || err?.code === '42501') {
        showToast('Нет прав для создания онбординга. Проверьте RLS политики в Supabase', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      await updateTask(taskId, { completed });
      showToast(completed ? 'Задача выполнена' : 'Задача отмечена как невыполненная', 'success');
    } catch (err) {
      showToast('Ошибка обновления задачи', 'error');
    }
  };

  const handleSaveTemplate = async (template: Partial<OnboardingTemplate>) => {
    try {
      await saveTemplate(template);
      showToast('Шаблон сохранен', 'success');
      setEditingTemplate(null);
    } catch (err: any) {
      logError('Ошибка сохранения шаблона:', err);
      const errorMessage = err?.message || 'Ошибка сохранения шаблона';
      if (errorMessage.includes('не существует') || errorMessage.includes('does not exist') || err?.code === '42P01' || err?.code === 'PGRST116') {
        showToast('Таблица onboarding_templates не создана. Выполните SQL скрипт create_onboarding_tables.sql в Supabase', 'error');
      } else if (errorMessage.includes('Нет прав') || errorMessage.includes('permission denied') || err?.code === '42501') {
        showToast('Нет прав для сохранения шаблона. Проверьте RLS политики в Supabase', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'template') {
        await deleteTemplate(deleteConfirm.id);
        showToast('Шаблон удален', 'success');
      } else {
        await deleteInstance(deleteConfirm.id);
        showToast('Онбординг удален', 'success');
        if (selectedInstance?.id === deleteConfirm.id) {
          setSelectedInstance(null);
        }
      }
      setDeleteConfirm(null);
    } catch (err) {
      showToast('Ошибка удаления', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        <p className="font-bold">Ошибка: {error}</p>
      </div>
    );
  }

  // Если выбран экземпляр, показываем чеклист
  if (selectedInstance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedInstance(null)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800">
                Онбординг: {selectedInstance.employee?.full_name || 'Неизвестно'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Начало: {format(new Date(selectedInstance.start_date), 'd MMMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setDeleteConfirm({ type: 'instance', id: selectedInstance.id })}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Удалить
            </button>
          )}
        </div>

        <OnboardingChecklist
          instance={selectedInstance}
          onTaskToggle={handleTaskToggle}
          isEditable={isAdmin}
        />
      </div>
    );
  }

  // Основной дашборд
  const activeInstances = instances.filter(i => i.status === 'in_progress');
  const completedInstances = instances.filter(i => i.status === 'completed');
  const totalTasks = instances.reduce((sum, i) => sum + (i.tasks?.length || 0), 0);
  const completedTasks = instances.reduce(
    (sum, i) => sum + (i.tasks?.filter(t => t.completed).length || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-blue-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 font-bold uppercase text-[10px] md:text-xs mb-2 tracking-wider">Активных онбордингов</p>
              <h3 className="text-3xl md:text-4xl font-black">{activeInstances.length}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Users size={28} className="opacity-90" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-emerald-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 font-bold uppercase text-[10px] md:text-xs mb-2 tracking-wider">Завершено</p>
              <h3 className="text-3xl md:text-4xl font-black">{completedInstances.length}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CheckCircle2 size={28} className="opacity-90" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-amber-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 font-bold uppercase text-[10px] md:text-xs mb-2 tracking-wider">Всего задач</p>
              <h3 className="text-3xl md:text-4xl font-black">{totalTasks}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <FileText size={28} className="opacity-90" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-purple-400/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 font-bold uppercase text-[10px] md:text-xs mb-2 tracking-wider">Выполнено задач</p>
              <h3 className="text-3xl md:text-4xl font-black">{completedTasks}</h3>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <CheckCircle2 size={28} className="opacity-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Действия */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-white to-slate-50 rounded-2xl border border-slate-200/60 shadow-sm p-5 flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={18} />
            </div>
            <span className="text-sm md:text-base font-bold text-slate-700">Действия:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCreatingInstance(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={18} />
              <span>Создать онбординг</span>
            </button>
            <button
              onClick={() => setEditingTemplate({})}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus size={18} />
              <span>Новый шаблон</span>
            </button>
          </div>
        </div>
      )}

      {/* Активные онбординги */}
      {activeInstances.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="text-amber-500" size={20} />
            Активные онбординги
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInstances.map(instance => (
              <div
                key={instance.id}
                onClick={() => setSelectedInstance(instance)}
                className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border-2 border-slate-200 hover:border-blue-400 p-5 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 text-lg mb-1">
                      {instance.employee?.full_name || 'Неизвестно'}
                    </h3>
                    <p className="text-xs text-slate-500">{instance.employee?.position}</p>
                  </div>
                  {instance.employee?.photo_url && (
                    <img
                      src={instance.employee.photo_url}
                      alt={instance.employee.full_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                    />
                  )}
                </div>

                <OnboardingProgress
                  progress={instance.progress_percentage}
                  totalTasks={instance.tasks?.length || 0}
                  completedTasks={instance.tasks?.filter(t => t.completed).length || 0}
                  size="sm"
                />

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar size={12} />
                    {format(new Date(instance.start_date), 'd MMM yyyy', { locale: ru })}
                  </span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 font-bold rounded-lg">В работе</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Шаблоны (только для админов) */}
      {isAdmin && templates.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="text-blue-500" size={20} />
            Шаблоны онбординга
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-black text-slate-800 mb-1">{template.name}</h3>
                    {template.position && (
                      <p className="text-xs text-slate-500">Должность: {template.position}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Задач: {(template.tasks as OnboardingTemplate['tasks']).length}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: 'template', id: template.id })}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно создания онбординга */}
      {creatingInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Users className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Создать онбординг</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Выберите сотрудника и шаблон для начала онбординга</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCreatingInstance(false);
                  setSelectedEmployee(null);
                  setSelectedTemplate(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5 bg-gradient-to-b from-white to-slate-50/30">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                  <User size={14} className="text-blue-600" />
                  Выберите сотрудника *
                </label>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setSelectedEmployee(emp || null);
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                >
                  <option value="">-- Выберите сотрудника --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" />
                  Выберите шаблон *
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={e => {
                    const tpl = templates.find(t => t.id === e.target.value);
                    setSelectedTemplate(tpl || null);
                  }}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-slate-300"
                >
                  <option value="">-- Выберите шаблон --</option>
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({(tpl.tasks as OnboardingTemplate['tasks']).length} задач)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white flex justify-end gap-3">
              <button
                onClick={() => {
                  setCreatingInstance(false);
                  setSelectedEmployee(null);
                  setSelectedTemplate(null);
                }}
                className="px-6 py-2.5 text-slate-700 font-bold bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateInstance}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Редактор шаблонов */}
      {editingTemplate !== null && (
        <OnboardingTemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* Модальное окно подтверждения удаления */}
      <ConfirmationModal
        isOpen={deleteConfirm !== null}
        title={deleteConfirm?.type === 'template' ? 'Удалить шаблон?' : 'Удалить онбординг?'}
        message={
          deleteConfirm?.type === 'template'
            ? 'Вы уверены, что хотите удалить этот шаблон? Это действие нельзя отменить.'
            : 'Вы уверены, что хотите удалить этот онбординг? Все задачи будут удалены. Это действие нельзя отменить.'
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDanger={true}
        confirmLabel="Удалить"
      />
    </div>
  );
};

