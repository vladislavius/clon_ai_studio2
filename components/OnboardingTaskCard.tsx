import React, { useState } from 'react';
import { OnboardingTask, OnboardingTaskCategory } from '../types';
import { CheckCircle2, Circle, Calendar, User, FileText, Key, Laptop, GraduationCap, Edit2, X } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OnboardingTaskCardProps {
  task: OnboardingTask;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEdit?: (task: OnboardingTask) => void;
  isEditable?: boolean;
}

const categoryIcons = {
  documents: FileText,
  access: Key,
  equipment: Laptop,
  training: GraduationCap,
};

const categoryColors = {
  documents: 'bg-blue-100 text-blue-700 border-blue-200',
  access: 'bg-purple-100 text-purple-700 border-purple-200',
  equipment: 'bg-amber-100 text-amber-700 border-amber-200',
  training: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const assigneeLabels = {
  hr: 'HR',
  employee: 'Сотрудник',
  manager: 'Менеджер',
  it: 'IT',
};

export const OnboardingTaskCard: React.FC<OnboardingTaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  isEditable = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = categoryIcons[task.category] || FileText;
  const categoryColor = categoryColors[task.category] || categoryColors.documents;

  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !task.completed;
  const isDueToday = dueDate && isToday(dueDate) && !task.completed;
  const daysUntil = dueDate ? differenceInDays(dueDate, new Date()) : null;

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all ${
        task.completed
          ? 'border-emerald-200 bg-emerald-50/30'
          : isOverdue
          ? 'border-red-200 bg-red-50/30'
          : isDueToday
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-slate-200 hover:border-slate-300'
      } p-4 relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task.id, !task.completed)}
          className={`flex-shrink-0 mt-0.5 transition-all ${
            task.completed ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          title={task.completed ? 'Отметить как невыполненную' : 'Отметить как выполненную'}
        >
          {task.completed ? <CheckCircle2 size={20} className="fill-current" /> : <Circle size={20} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className={`font-bold text-slate-800 leading-tight ${
                task.completed ? 'line-through text-slate-500' : ''
              }`}
            >
              {task.title}
            </h4>
            {isEditable && onEdit && (
              <button
                onClick={() => onEdit(task)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:bg-blue-50 rounded-lg`}
                title="Редактировать задачу"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-600 mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${categoryColor} flex items-center gap-1`}>
              <Icon size={10} />
              {task.category === 'documents' && 'Документы'}
              {task.category === 'access' && 'Доступы'}
              {task.category === 'equipment' && 'Оборудование'}
              {task.category === 'training' && 'Обучение'}
            </span>

            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <User size={10} />
              {assigneeLabels[task.assigned_to]}
            </span>

            {dueDate && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  isOverdue
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : isDueToday
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : daysUntil !== null && daysUntil <= 3
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <Calendar size={10} />
                {isOverdue && 'Просрочено'}
                {isDueToday && 'Сегодня'}
                {!isOverdue && !isDueToday && daysUntil !== null && daysUntil > 0 && `Через ${daysUntil} дн.`}
                {!isOverdue && !isDueToday && daysUntil !== null && daysUntil === 0 && 'Завтра'}
                {format(dueDate, 'd MMM', { locale: ru })}
              </span>
            )}
          </div>

          {task.notes && (
            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 italic">{task.notes}</p>
            </div>
          )}

          {task.completed && task.completed_at && (
            <p className="text-[10px] text-emerald-600 font-medium mt-2">
              Выполнено: {format(new Date(task.completed_at), 'd MMM yyyy', { locale: ru })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


