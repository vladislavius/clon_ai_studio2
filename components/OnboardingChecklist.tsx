import React, { useMemo } from 'react';
import { OnboardingInstance, OnboardingTask } from '../types';
import { OnboardingTaskCard } from './OnboardingTaskCard';
import { OnboardingProgress } from './OnboardingProgress';
import { Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { OnboardingTaskCategory } from '../types';

interface OnboardingChecklistProps {
  instance: OnboardingInstance;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onTaskEdit?: (task: OnboardingTask) => void;
  isEditable?: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  instance,
  onTaskToggle,
  onTaskEdit,
  isEditable = false,
}) => {
  const [categoryFilter, setCategoryFilter] = React.useState<OnboardingTaskCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'pending'>('all');

  const tasks = instance.tasks || [];

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && task.completed) ||
        (statusFilter === 'pending' && !task.completed);
      return matchesCategory && matchesStatus;
    });
  }, [tasks, categoryFilter, statusFilter]);

  const tasksByCategory = useMemo(() => {
    const grouped: Record<OnboardingTaskCategory, OnboardingTask[]> = {
      documents: [],
      access: [],
      equipment: [],
      training: [],
    };

    filteredTasks.forEach(task => {
      if (grouped[task.category]) {
        grouped[task.category].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const completedCount = tasks.filter(t => t.completed).length;
  const pendingCount = tasks.length - completedCount;
  const overdueCount = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    return new Date(t.due_date) < new Date();
  }).length;

  const categories: { value: OnboardingTaskCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'Все категории' },
    { value: 'documents', label: 'Документы' },
    { value: 'access', label: 'Доступы' },
    { value: 'equipment', label: 'Оборудование' },
    { value: 'training', label: 'Обучение' },
  ];

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-bold text-slate-500 mb-1">Всего задач</div>
          <div className="text-2xl font-black text-slate-800">{tasks.length}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
          <div className="text-xs font-bold text-emerald-600 mb-1 flex items-center gap-1">
            <CheckCircle2 size={12} />
            Выполнено
          </div>
          <div className="text-2xl font-black text-emerald-700">{completedCount}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
          <div className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1">
            <Clock size={12} />
            В работе
          </div>
          <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
        </div>
        {overdueCount > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-3">
            <div className="text-xs font-bold text-red-600 mb-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Просрочено
            </div>
            <div className="text-2xl font-black text-red-700">{overdueCount}</div>
          </div>
        )}
      </div>

      {/* Прогресс */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <OnboardingProgress
          progress={instance.progress_percentage}
          totalTasks={tasks.length}
          completedTasks={completedCount}
          size="md"
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={16} className="text-slate-400" />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as OnboardingTaskCategory | 'all')}
          className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'completed' | 'pending')}
          className="px-3 py-1.5 text-xs font-bold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="completed">Выполненные</option>
          <option value="pending">В работе</option>
        </select>
      </div>

      {/* Список задач */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm font-medium">Задачи не найдены</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <OnboardingTaskCard
              key={task.id}
              task={task}
              onToggleComplete={onTaskToggle}
              onEdit={onTaskEdit}
              isEditable={isEditable}
            />
          ))
        )}
      </div>
    </div>
  );
};



