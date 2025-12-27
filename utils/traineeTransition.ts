/**
 * Утилиты для автоматического перехода Стажер → Сотрудник
 * Система чек-поинтов на 30, 60, 90 дней
 */

import { Employee } from '../types';
import { supabase } from '../supabaseClient';

export interface TraineeCheckpoint {
  day: number;
  date: string;
  completed: boolean;
  completed_at?: string;
  notes?: string;
  completed_by?: string;
}

export interface TraineeProgress {
  employee_id: string;
  start_date: string;
  current_day: number;
  checkpoints: TraineeCheckpoint[];
  status: 'trainee' | 'employee' | 'extended' | 'terminated';
  transition_date?: string;
  transition_approved_by?: string;
}

const CHECKPOINT_DAYS = [30, 60, 90];

/**
 * Вычисляет количество дней с начала работы
 */
export function calculateDaysSinceStart(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Создает структуру прогресса стажера
 */
export function createTraineeProgress(
  employeeId: string,
  startDate: string
): TraineeProgress {
  const checkpoints: TraineeCheckpoint[] = CHECKPOINT_DAYS.map(day => {
    const checkpointDate = new Date(startDate);
    checkpointDate.setDate(checkpointDate.getDate() + day);
    
    return {
      day,
      date: checkpointDate.toISOString().split('T')[0],
      completed: false,
    };
  });

  return {
    employee_id: employeeId,
    start_date: startDate,
    current_day: 0,
    checkpoints,
    status: 'trainee',
  };
}

/**
 * Проверяет и обновляет чек-поинты стажера
 */
export async function checkTraineeCheckpoints(
  employee: Employee
): Promise<{
  needsCheckpoint: boolean;
  checkpointDay?: number;
  shouldTransition?: boolean;
  progress?: TraineeProgress;
}> {
  if (!supabase) {
    return { needsCheckpoint: false };
  }

  try {
    // Получаем данные о прогрессе стажера из custom_fields
    const { data } = await supabase
      .from('employees')
      .select('custom_fields, join_date')
      .eq('id', employee.id)
      .single();

    if (!data) {
      return { needsCheckpoint: false };
    }

    const customFields = data.custom_fields || [];
    const traineeProgressField = customFields.find(
      (f: any) => f.key === 'trainee_progress'
    );

    // Получаем дату начала работы
    const startDate = employee.join_date || data.join_date;
    if (!startDate) {
      return { needsCheckpoint: false };
    }

    let progress: TraineeProgress;

    if (traineeProgressField?.value) {
      progress = traineeProgressField.value as TraineeProgress;
    } else {
      // Создаем новый прогресс, если его нет
      progress = createTraineeProgress(employee.id, startDate);
    }

    // Обновляем текущий день
    const currentDay = calculateDaysSinceStart(startDate);
    progress.current_day = currentDay;

    // Проверяем, нужно ли отметить чек-поинт
    const upcomingCheckpoint = progress.checkpoints.find(
      cp => !cp.completed && currentDay >= cp.day
    );

    if (upcomingCheckpoint) {
      return {
        needsCheckpoint: true,
        checkpointDay: upcomingCheckpoint.day,
        progress,
      };
    }

    // Проверяем, нужно ли перейти в статус "Сотрудник" (90 дней прошло)
    if (currentDay >= 90 && progress.status === 'trainee') {
      return {
        needsCheckpoint: false,
        shouldTransition: true,
        progress,
      };
    }

    return { needsCheckpoint: false, progress };
  } catch (error) {
    console.error('Ошибка проверки чек-поинтов стажера:', error);
    return { needsCheckpoint: false };
  }
}

/**
 * Отмечает чек-поинт как выполненный
 */
export async function completeCheckpoint(
  employeeId: string,
  checkpointDay: number,
  notes?: string,
  completedBy?: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data } = await supabase
      .from('employees')
      .select('custom_fields')
      .eq('id', employeeId)
      .single();

    if (!data) return false;

    const customFields = data.custom_fields || [];
    const traineeProgressField = customFields.find(
      (f: any) => f.key === 'trainee_progress'
    );

    if (!traineeProgressField?.value) return false;

    const progress: TraineeProgress = traineeProgressField.value;
    const checkpoint = progress.checkpoints.find(cp => cp.day === checkpointDay);

    if (!checkpoint) return false;

    checkpoint.completed = true;
    checkpoint.completed_at = new Date().toISOString();
    checkpoint.notes = notes;
    checkpoint.completed_by = completedBy;

    // Обновляем в БД
    const updatedFields = customFields.map((f: any) =>
      f.key === 'trainee_progress'
        ? { ...f, value: progress }
        : f
    );

    const { error } = await supabase
      .from('employees')
      .update({ custom_fields: updatedFields })
      .eq('id', employeeId);

    if (error) {
      console.error('Ошибка обновления чек-поинта:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка при отметке чек-поинта:', error);
    return false;
  }
}

/**
 * Переводит стажера в статус "Сотрудник"
 */
export async function transitionTraineeToEmployee(
  employeeId: string,
  approvedBy?: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data } = await supabase
      .from('employees')
      .select('custom_fields')
      .eq('id', employeeId)
      .single();

    if (!data) return false;

    const customFields = data.custom_fields || [];
    const traineeProgressField = customFields.find(
      (f: any) => f.key === 'trainee_progress'
    );

    if (!traineeProgressField?.value) return false;

    const progress: TraineeProgress = traineeProgressField.value;

    // Проверяем, что все чек-поинты пройдены
    const allCheckpointsCompleted = progress.checkpoints.every(cp => cp.completed);
    
    if (!allCheckpointsCompleted) {
      console.warn('Не все чек-поинты пройдены');
      // Можно продолжить или вернуть false в зависимости от политики
    }

    // Обновляем статус
    progress.status = 'employee';
    progress.transition_date = new Date().toISOString();
    progress.transition_approved_by = approvedBy;

    // Обновляем в БД
    const updatedFields = customFields.map((f: any) =>
      f.key === 'trainee_progress'
        ? { ...f, value: progress }
        : f
    );

    // Также обновляем статус в основном поле (если есть)
    // Пока сохраняем только в custom_fields
    const { error } = await supabase
      .from('employees')
      .update({ custom_fields: updatedFields })
      .eq('id', employeeId);

    if (error) {
      console.error('Ошибка перехода стажера:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка при переходе стажера:', error);
    return false;
  }
}

/**
 * Получает прогресс стажера
 */
export async function getTraineeProgress(
  employeeId: string
): Promise<TraineeProgress | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('employees')
      .select('custom_fields, join_date')
      .eq('id', employeeId)
      .single();

    if (!data) return null;

    const customFields = data.custom_fields || [];
    const traineeProgressField = customFields.find(
      (f: any) => f.key === 'trainee_progress'
    );

    if (traineeProgressField?.value) {
      return traineeProgressField.value as TraineeProgress;
    }

    // Если прогресса нет, но есть join_date, создаем его
    if (data.join_date) {
      return createTraineeProgress(employeeId, data.join_date);
    }

    return null;
  } catch (error) {
    console.error('Ошибка получения прогресса стажера:', error);
    return null;
  }
}

/**
 * Инициализирует прогресс стажера при создании сотрудника
 */
export async function initializeTraineeProgress(
  employeeId: string,
  startDate: string
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const progress = createTraineeProgress(employeeId, startDate);

    const { data: currentData } = await supabase
      .from('employees')
      .select('custom_fields')
      .eq('id', employeeId)
      .single();

    const customFields = currentData?.custom_fields || [];
    const traineeProgressIndex = customFields.findIndex(
      (f: any) => f.key === 'trainee_progress'
    );

    const traineeProgressField = {
      key: 'trainee_progress',
      value: progress,
      type: 'trainee_progress',
    };

    if (traineeProgressIndex >= 0) {
      customFields[traineeProgressIndex] = traineeProgressField;
    } else {
      customFields.push(traineeProgressField);
    }

    const { error } = await supabase
      .from('employees')
      .update({ custom_fields: customFields })
      .eq('id', employeeId);

    if (error) {
      console.error('Ошибка инициализации прогресса стажера:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Ошибка при инициализации прогресса стажера:', error);
    return false;
  }
}

/**
 * Получает список стажеров, которым нужны чек-поинты
 */
export async function getTraineesNeedingCheckpoints(): Promise<Employee[]> {
  if (!supabase) return [];

  try {
    const { data: employees } = await supabase
      .from('employees')
      .select('*, custom_fields, join_date')
      .not('join_date', 'is', null);

    if (!employees) return [];

    const traineesNeedingCheckpoints: Employee[] = [];

    for (const emp of employees) {
      const customFields = emp.custom_fields || [];
      const traineeProgressField = customFields.find(
        (f: any) => f.key === 'trainee_progress'
      );

      if (traineeProgressField?.value) {
        const progress: TraineeProgress = traineeProgressField.value;
        if (progress.status === 'trainee') {
          const startDate = emp.join_date;
          if (startDate) {
            const currentDay = calculateDaysSinceStart(startDate);
            const needsCheckpoint = progress.checkpoints.some(
              cp => !cp.completed && currentDay >= cp.day
            );

            if (needsCheckpoint) {
              traineesNeedingCheckpoints.push(emp as Employee);
            }
          }
        }
      }
    }

    return traineesNeedingCheckpoints;
  } catch (error) {
    console.error('Ошибка получения стажеров:', error);
    return [];
  }
}

