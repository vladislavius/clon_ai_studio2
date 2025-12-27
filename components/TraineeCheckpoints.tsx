import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { 
  getTraineeProgress, 
  completeCheckpoint, 
  transitionTraineeToEmployee,
  checkTraineeCheckpoints,
  TraineeProgress,
  calculateDaysSinceStart
} from '../utils/traineeTransition';
import { supabase } from '../supabaseClient';
import { useToast } from './Toast';
import { useErrorHandler } from '../utils/errorHandler';
import { CheckCircle, Clock, AlertCircle, UserCheck, Calendar, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TraineeCheckpointsProps {
  employee: Employee;
  isAdmin?: boolean;
  onUpdate?: () => void;
}

export const TraineeCheckpoints: React.FC<TraineeCheckpointsProps> = ({
  employee,
  isAdmin = false,
  onUpdate
}) => {
  const toast = useToast();
  const { handleError } = useErrorHandler();
  
  const [progress, setProgress] = useState<TraineeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkpointNotes, setCheckpointNotes] = useState<Record<number, string>>({});
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [employee.id]);

  const loadProgress = async () => {
    setIsLoading(true);
    try {
      const traineeProgress = await getTraineeProgress(employee.id);
      if (traineeProgress) {
        setProgress(traineeProgress);
      } else if (employee.join_date) {
        // Если прогресса нет, но есть дата начала, проверяем нужно ли создать
        const checkResult = await checkTraineeCheckpoints(employee);
        if (checkResult.progress) {
          setProgress(checkResult.progress);
        }
      }
    } catch (error) {
      handleError(error, 'Ошибка загрузки прогресса стажера');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteCheckpoint = async (checkpointDay: number) => {
    if (!isAdmin) {
      toast.warning('Только администратор может отмечать чек-поинты');
      return;
    }

    const notes = checkpointNotes[checkpointDay] || '';
    const currentUser = supabase?.auth?.getSession();
    
    try {
      const success = await completeCheckpoint(
        employee.id,
        checkpointDay,
        notes,
        undefined // TODO: получить ID текущего пользователя
      );

      if (success) {
        toast.success(`Чек-поинт на ${checkpointDay} день отмечен`);
        setCheckpointNotes(prev => ({ ...prev, [checkpointDay]: '' }));
        await loadProgress();
        onUpdate?.();
      } else {
        toast.error('Ошибка при отметке чек-поинта');
      }
    } catch (error) {
      handleError(error, 'Ошибка при отметке чек-поинта');
    }
  };

  const handleTransition = async () => {
    if (!isAdmin) {
      toast.warning('Только администратор может переводить стажера');
      return;
    }

    try {
      const success = await transitionTraineeToEmployee(employee.id);
      
      if (success) {
        toast.success('Стажер успешно переведен в статус "Сотрудник"');
        setShowTransitionModal(false);
        await loadProgress();
        onUpdate?.();
      } else {
        toast.error('Ошибка при переводе стажера');
      }
    } catch (error) {
      handleError(error, 'Ошибка при переводе стажера');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 md:py-8">
        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-6 md:py-8 text-slate-500 px-4">
        <p className="text-sm md:text-base">Прогресс стажера не найден</p>
        {employee.join_date && (
          <p className="text-xs md:text-sm mt-2">Дата начала: {format(new Date(employee.join_date), 'dd.MM.yyyy', { locale: ru })}</p>
        )}
      </div>
    );
  }

  const currentDay = calculateDaysSinceStart(progress.start_date);
  const daysRemaining = Math.max(0, 90 - currentDay);
  const progressPercent = Math.min(100, (currentDay / 90) * 100);

  return (
    <div className="space-y-4 md:space-y-6 px-1">
      {/* Заголовок и общая информация */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-3 md:mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1 md:mb-2">
              Прогресс стажера
            </h3>
            <p className="text-xs md:text-sm text-slate-600 break-words">
              Дата начала: {format(new Date(progress.start_date), 'dd MMMM yyyy', { locale: ru })}
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-2xl md:text-3xl font-black text-blue-600">{currentDay}</div>
            <div className="text-xs md:text-sm text-slate-600">дней прошло</div>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="mt-3 md:mt-4">
          <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-[10px] md:text-xs font-bold text-slate-600 mb-2">
            <span>Прогресс испытательного срока</span>
            <span>{daysRemaining} дней осталось</span>
          </div>
          <div className="h-2.5 md:h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Чек-поинты */}
      <div className="space-y-3 md:space-y-4">
        <h4 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={18} className="md:w-5 md:h-5" />
          Чек-поинты
        </h4>

        {progress.checkpoints.map((checkpoint, index) => {
          const isPast = currentDay >= checkpoint.day;
          const isCompleted = checkpoint.completed;
          const isUpcoming = !isPast && !isCompleted;

          return (
            <div
              key={checkpoint.day}
              className={`bg-white rounded-xl border-2 p-3 md:p-5 transition-all ${
                isCompleted
                  ? 'border-emerald-200 bg-emerald-50'
                  : isPast
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 md:gap-0">
                <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-base md:text-lg flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isPast
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle size={20} className="md:w-6 md:h-6" />
                    ) : (
                      checkpoint.day
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
                      <h5 className="font-bold text-slate-800 text-sm md:text-base">
                        День {checkpoint.day}: Чек-поинт
                      </h5>
                      {isCompleted && (
                        <span className="px-1.5 md:px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] md:text-xs font-bold whitespace-nowrap">
                          Выполнено
                        </span>
                      )}
                      {isPast && !isCompleted && (
                        <span className="px-1.5 md:px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] md:text-xs font-bold whitespace-nowrap">
                          Требует внимания
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-slate-600 mb-1 md:mb-2 break-words">
                      Дата: {format(new Date(checkpoint.date), 'dd MMMM yyyy', { locale: ru })}
                    </p>
                    {checkpoint.completed && checkpoint.completed_at && (
                      <p className="text-[10px] md:text-xs text-slate-500">
                        Выполнено: {format(new Date(checkpoint.completed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </p>
                    )}
                    {checkpoint.notes && (
                      <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                        <p className="text-xs md:text-sm text-slate-700 break-words whitespace-pre-wrap">{checkpoint.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {!isCompleted && isAdmin && (
                  <div className="flex flex-col gap-2 ml-2 md:ml-4 flex-shrink-0">
                    {isPast && (
                      <button
                        onClick={() => handleCompleteCheckpoint(checkpoint.day)}
                        className="px-3 md:px-4 py-1.5 md:py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs md:text-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap"
                      >
                        <CheckCircle size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Отметить</span>
                        <span className="sm:hidden">✓</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Форма для заметок (только для администратора) */}
              {!isCompleted && isAdmin && isPast && (
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-200">
                  <textarea
                    value={checkpointNotes[checkpoint.day] || ''}
                    onChange={e =>
                      setCheckpointNotes(prev => ({
                        ...prev,
                        [checkpoint.day]: e.target.value,
                      }))
                    }
                    placeholder="Заметки по чек-поинту..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows={2}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Переход в статус "Сотрудник" */}
      {currentDay >= 90 && progress.status === 'trainee' && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-emerald-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-base md:text-lg font-black text-emerald-800 mb-1 md:mb-2 flex items-center gap-2">
                <UserCheck size={18} className="md:w-5 md:h-5 flex-shrink-0" />
                <span className="break-words">Готов к переходу в статус "Сотрудник"</span>
              </h4>
              <p className="text-xs md:text-sm text-slate-700 mb-3 md:mb-4 break-words">
                Испытательный срок завершен. Все чек-поинты должны быть пройдены перед переходом.
              </p>
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setShowTransitionModal(true)}
                    className="w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-emerald-600 text-white rounded-lg md:rounded-xl font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <UserCheck size={16} className="md:w-[18px] md:h-[18px]" />
                    <span className="hidden sm:inline">Перевести в сотрудники</span>
                    <span className="sm:hidden">Перевести</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения перехода */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-lg md:text-xl font-black text-slate-800">
                Подтверждение перехода
              </h3>
              <button
                onClick={() => setShowTransitionModal(false)}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs md:text-sm text-slate-600 mb-4 md:mb-6 break-words">
              Вы уверены, что хотите перевести {employee.full_name} из статуса "Стажер" в статус "Сотрудник"?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 text-sm md:text-base"
              >
                Отмена
              </button>
              <button
                onClick={handleTransition}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-black hover:bg-emerald-700 text-sm md:text-base"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

