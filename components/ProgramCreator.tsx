import React, { useState } from 'react';
import { Plus, X, Save, Calendar, User, FileText, Target, AlertCircle, Briefcase, CheckCircle, Clock } from 'lucide-react';
import { Employee } from '../types';
import { useToast } from './Toast';

export interface ProgramTask {
  id: string;
  text: string;
  subtasks?: ProgramSubtask[];
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ProgramSubtask {
  id: string;
  label: string;
  text: string;
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface Program {
  id?: string;
  title: string;
  duration: string;
  references: string[];
  concept: string;
  mainTask: string;
  priorityTasks: ProgramTask[];
  criticalTasks: ProgramTask[];
  workingTasks: ProgramTask[];
  productionTasks: ProgramTask[];
  conditionalTasks: ProgramTask[];
  relatedPlan?: string;
  relatedStat?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProgramCreatorProps {
  employees: Employee[];
  relatedStat?: { id: string; name: string };
  onSave: (program: Program) => void;
  onCancel: () => void;
}

export const ProgramCreator: React.FC<ProgramCreatorProps> = ({
  employees,
  relatedStat,
  onSave,
  onCancel,
}) => {
  const toast = useToast();
  const [program, setProgram] = useState<Program>({
    title: '',
    duration: '',
    references: [''],
    concept: '',
    mainTask: '',
    priorityTasks: [],
    criticalTasks: [],
    workingTasks: [],
    productionTasks: [],
    conditionalTasks: [],
    relatedStat: relatedStat?.id,
  });

  const addTask = (type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks') => {
    const newTask: ProgramTask = {
      id: `task-${Date.now()}`,
      text: '',
      subtasks: [],
      status: 'pending',
    };
    setProgram(prev => ({
      ...prev,
      [type]: [...prev[type], newTask],
    }));
  };

  const updateTask = (
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    taskId: string,
    updates: Partial<ProgramTask>
  ) => {
    setProgram(prev => ({
      ...prev,
      [type]: prev[type].map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    }));
  };

  const removeTask = (
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    taskId: string
  ) => {
    setProgram(prev => ({
      ...prev,
      [type]: prev[type].filter(task => task.id !== taskId),
    }));
  };

  const addSubtask = (
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    taskId: string
  ) => {
    const subtask: ProgramSubtask = {
      id: `subtask-${Date.now()}`,
      label: String.fromCharCode(65 + (program[type].find(t => t.id === taskId)?.subtasks?.length || 0)),
      text: '',
      status: 'pending',
    };
    setProgram(prev => ({
      ...prev,
      [type]: prev[type].map(task =>
        task.id === taskId
          ? { ...task, subtasks: [...(task.subtasks || []), subtask] }
          : task
      ),
    }));
  };

  const updateSubtask = (
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    taskId: string,
    subtaskId: string,
    updates: Partial<ProgramSubtask>
  ) => {
    setProgram(prev => ({
      ...prev,
      [type]: prev[type].map(task =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks?.map(subtask =>
                subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
              ),
            }
          : task
      ),
    }));
  };

  const removeSubtask = (
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    taskId: string,
    subtaskId: string
  ) => {
    setProgram(prev => ({
      ...prev,
      [type]: prev[type].map(task =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks?.filter(subtask => subtask.id !== subtaskId),
            }
          : task
      ),
    }));
  };

  const addReference = () => {
    setProgram(prev => ({
      ...prev,
      references: [...prev.references, ''],
    }));
  };

  const updateReference = (index: number, value: string) => {
    setProgram(prev => ({
      ...prev,
      references: prev.references.map((ref, i) => (i === index ? value : ref)),
    }));
  };

  const removeReference = (index: number) => {
    setProgram(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!program.title || !program.concept || !program.mainTask) {
      toast.error('Заполните обязательные поля: название, замысел и главная задача');
      return;
    }

    const programToSave: Program = {
      ...program,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(programToSave);
    toast.success('Программа успешно создана');
  };

  const renderTaskSection = (
    title: string,
    type: 'priorityTasks' | 'criticalTasks' | 'workingTasks' | 'productionTasks' | 'conditionalTasks',
    icon: React.ReactNode,
    color: string
  ) => {
    const tasks = program[type];

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className={`text-lg font-bold ${color}`}>{title}</h3>
          </div>
          <button
            onClick={() => addTask(type)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Добавить задачу
          </button>
        </div>

        <div className="space-y-4">
          {tasks.map((task, taskIndex) => (
            <div key={task.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-sm font-bold text-slate-500 mt-2">{taskIndex + 1}.</span>
                <div className="flex-1">
                  <textarea
                    value={task.text}
                    onChange={e => updateTask(type, task.id, { text: e.target.value })}
                    placeholder="Введите текст задачи..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    rows={2}
                  />
                </div>
                <button
                  onClick={() => removeTask(type, task.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Ответственный и срок */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Ответственный
                  </label>
                  <select
                    value={task.responsible || ''}
                    onChange={e => updateTask(type, task.id, { responsible: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="">Выберите сотрудника</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Срок выполнения
                  </label>
                  <input
                    type="date"
                    value={task.deadline || ''}
                    onChange={e => updateTask(type, task.id, { deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Подзадачи */}
              {type === 'priorityTasks' || type === 'workingTasks' ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Подзадачи</span>
                    <button
                      onClick={() => addSubtask(type, task.id)}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1 text-xs"
                    >
                      <Plus size={12} />
                      Добавить подзадачу
                    </button>
                  </div>
                  <div className="space-y-2 ml-4">
                    {task.subtasks?.map((subtask, subtaskIndex) => (
                      <div key={subtask.id} className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 mt-2">{subtask.label}.</span>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={subtask.text}
                            onChange={e => updateSubtask(type, task.id, subtask.id, { text: e.target.value })}
                            placeholder="Введите текст подзадачи..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <select
                              value={subtask.responsible || ''}
                              onChange={e => updateSubtask(type, task.id, subtask.id, { responsible: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                            >
                              <option value="">Ответственный</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.full_name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={subtask.deadline || ''}
                              onChange={e => updateSubtask(type, task.id, subtask.id, { deadline: e.target.value })}
                              className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeSubtask(type, task.id, subtask.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Основная информация */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Основная информация</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Название программы *
            </label>
            <input
              type="text"
              value={program.title}
              onChange={e => setProgram(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Например: Диверсификация предложений для низкого сезона"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Срок выполнения
            </label>
            <input
              type="text"
              value={program.duration}
              onChange={e => setProgram(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="Например: 2 месяца"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Ссылки (ИП ОХС и другие материалы)
            </label>
            <div className="space-y-2">
              {program.references.map((ref, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={ref}
                    onChange={e => updateReference(index, e.target.value)}
                    placeholder="Например: ИП ОХС от 10 сентября 1988П «Предупреждения в отношении опросов»"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {program.references.length > 1 && (
                    <button
                      onClick={() => removeReference(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addReference}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                Добавить ссылку
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Замысел программы *
            </label>
            <textarea
              value={program.concept}
              onChange={e => setProgram(prev => ({ ...prev, concept: e.target.value }))}
              placeholder="Опишите замысел программы..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Главная задача *
            </label>
            <textarea
              value={program.mainTask}
              onChange={e => setProgram(prev => ({ ...prev, mainTask: e.target.value }))}
              placeholder="Опишите главную задачу программы..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Задачи */}
      {renderTaskSection(
        'Первоочередные задачи',
        'priorityTasks',
        <Target className="text-blue-600" size={20} />,
        'text-blue-600'
      )}

      {renderTaskSection(
        'Жизненно важные задачи',
        'criticalTasks',
        <AlertCircle className="text-red-600" size={20} />,
        'text-red-600'
      )}

      {renderTaskSection(
        'Рабочие задачи',
        'workingTasks',
        <Briefcase className="text-emerald-600" size={20} />,
        'text-emerald-600'
      )}

      {renderTaskSection(
        'Производственные задачи',
        'productionTasks',
        <CheckCircle className="text-amber-600" size={20} />,
        'text-amber-600'
      )}

      {renderTaskSection(
        'Условные задачи',
        'conditionalTasks',
        <Clock className="text-purple-600" size={20} />,
        'text-purple-600'
      )}

      {/* Кнопки действий */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          <Save size={18} />
          Сохранить программу
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};


