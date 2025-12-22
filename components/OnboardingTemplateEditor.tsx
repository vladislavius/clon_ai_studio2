import React, { useState, useEffect } from 'react';
import { OnboardingTemplate, OnboardingTaskTemplate, OnboardingTaskCategory, OnboardingTaskAssignee } from '../types';
import { X, Plus, Trash2, Save, GripVertical, FileText } from 'lucide-react';

interface OnboardingTemplateEditorProps {
  template: Partial<OnboardingTemplate> | null;
  onSave: (template: Partial<OnboardingTemplate>) => void;
  onClose: () => void;
}

const categoryOptions: { value: OnboardingTaskCategory; label: string }[] = [
  { value: 'documents', label: 'Документы' },
  { value: 'access', label: 'Доступы' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'training', label: 'Обучение' },
];

const assigneeOptions: { value: OnboardingTaskAssignee; label: string }[] = [
  { value: 'hr', label: 'HR' },
  { value: 'employee', label: 'Сотрудник' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'it', label: 'IT' },
];

export const OnboardingTemplateEditor: React.FC<OnboardingTemplateEditorProps> = ({
  template,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [tasks, setTasks] = useState<OnboardingTaskTemplate[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setPosition(template.position || '');
      setDepartmentId(template.department_id || '');
      setTasks(template.tasks || []);
    }
  }, [template]);

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        title: '',
        description: '',
        category: 'documents',
        assigned_to: 'hr',
        order_index: tasks.length,
      },
    ]);
  };

  const updateTask = (index: number, updates: Partial<OnboardingTaskTemplate>) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], ...updates };
    setTasks(newTasks);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index).map((task, i) => ({ ...task, order_index: i })));
  };

  const moveTask = (fromIndex: number, toIndex: number) => {
    const newTasks = [...tasks];
    const [moved] = newTasks.splice(fromIndex, 1);
    newTasks.splice(toIndex, 0, moved);
    setTasks(newTasks.map((task, i) => ({ ...task, order_index: i })));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Введите название шаблона');
      return;
    }

    if (tasks.length === 0) {
      alert('Добавьте хотя бы одну задачу');
      return;
    }

    const tasksWithTitles = tasks.filter(t => t.title.trim());
    if (tasksWithTitles.length === 0) {
      alert('Заполните названия задач');
      return;
    }

    onSave({
      id: template?.id,
      name: name.trim(),
      position: position.trim() || undefined,
      department_id: departmentId || undefined,
      tasks: tasksWithTitles,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200/50 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FileText className="text-white" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {template?.id ? 'Редактировать шаблон' : 'Новый шаблон онбординга'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {template?.id ? 'Измените параметры шаблона' : 'Создайте новый шаблон для онбординга сотрудников'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Название шаблона *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Например: Онбординг разработчика"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Должность (опционально)
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Например: Разработчик"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  ID департамента (опционально)
                </label>
                <input
                  type="text"
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  placeholder="Например: dept4"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Задачи */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Задачи онбординга</h3>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Добавить задачу
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="bg-slate-50 rounded-xl border-2 border-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-2 text-slate-400 cursor-move">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Название задачи *
                        </label>
                        <input
                          type="text"
                          value={task.title}
                          onChange={e => updateTask(index, { title: e.target.value })}
                          placeholder="Например: Подписать трудовой договор"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                          Описание (опционально)
                        </label>
                        <textarea
                          value={task.description || ''}
                          onChange={e => updateTask(index, { description: e.target.value })}
                          placeholder="Дополнительная информация о задаче"
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                            Категория
                          </label>
                          <select
                            value={task.category}
                            onChange={e => updateTask(index, { category: e.target.value as OnboardingTaskCategory })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          >
                            {categoryOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                            Назначить
                          </label>
                          <select
                            value={task.assigned_to}
                            onChange={e => updateTask(index, { assigned_to: e.target.value as OnboardingTaskAssignee })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          >
                            {assigneeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                            Срок (дней от начала)
                          </label>
                          <input
                            type="number"
                            value={task.due_days || ''}
                            onChange={e => updateTask(index, { due_days: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="Опционально"
                            min="0"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeTask(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {tasks.length === 0 && (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-sm font-medium">Добавьте задачи онбординга</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Save size={16} className="inline mr-2" />
            Сохранить шаблон
          </button>
        </div>
      </div>
    </div>
  );
};

