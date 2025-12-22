/**
 * Утилиты для отправки уведомлений о днях рождения
 * Отправляет уведомления за 7 и 3 дня до дня рождения
 */

import { Employee } from '../types';
import { format, addDays, differenceInDays, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Получает сотрудников, у которых день рождения через указанное количество дней
 */
export function getBirthdaysInDays(employees: Employee[], days: number): Employee[] {
  const today = new Date();
  // Устанавливаем время на начало дня для точного сравнения
  today.setHours(0, 0, 0, 0);
  
  return employees.filter(emp => {
    if (!emp.birth_date) return false;
    
    try {
      const birthDate = new Date(emp.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      thisYearBirthday.setHours(0, 0, 0, 0);
      
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      nextYearBirthday.setHours(0, 0, 0, 0);
      
      // Если день рождения уже прошел в этом году, берем следующий год
      const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
      const daysUntil = differenceInDays(upcomingBirthday, today);
      
      // Возвращаем только тех, у кого день рождения ровно через указанное количество дней
      // И не сегодня
      return daysUntil === days && daysUntil > 0 && !isToday(upcomingBirthday);
    } catch {
      return false;
    }
  });
}

/**
 * Получает шаблон напоминания для HR в зависимости от должности
 */
function getBirthdayReminderTemplate(position: string, fullName: string, daysUntil: number): string {
  const positionLower = position.toLowerCase();
  
  // Шаблоны напоминаний для HR в зависимости от должности сотрудника
  if (positionLower.includes('директор') || positionLower.includes('руководитель')) {
    return `🔔 <b>Напоминание для HR</b>\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у <b>${fullName}</b> (руководитель).\n\n` +
           `Не забудьте подготовить поздравление и отправить его в чат команды! 💼✨`;
  }
  
  if (positionLower.includes('менеджер') || positionLower.includes('специалист')) {
    return `🔔 <b>Напоминание для HR</b>\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у <b>${fullName}</b> (менеджер/специалист).\n\n` +
           `Не забудьте подготовить поздравление и отправить его в чат команды! 🌟💪`;
  }
  
  if (positionLower.includes('разработчик') || positionLower.includes('программист') || positionLower.includes('инженер')) {
    return `🔔 <b>Напоминание для HR</b>\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у <b>${fullName}</b> (разработчик/инженер).\n\n` +
           `Не забудьте подготовить поздравление и отправить его в чат команды! 💻🚀`;
  }
  
  // Общий шаблон
  return `🔔 <b>Напоминание для HR</b>\n\n` +
         `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у <b>${fullName}</b>.\n\n` +
         `Не забудьте подготовить поздравление и отправить его в чат команды! 🌈✨`;
}

/**
 * Форматирует сообщение для Telegram о предстоящем дне рождения (за 7 или 3 дня)
 * Это напоминание для HR, а не поздравление для сотрудника
 */
export function formatTelegramUpcomingBirthday(employee: Employee, daysUntil: number): string {
  const birthDate = new Date(employee.birth_date!);
  const today = new Date();
  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
  const age = upcomingBirthday.getFullYear() - birthDate.getFullYear();
  
  const dateStr = format(upcomingBirthday, 'd MMMM', { locale: ru });
  const reminder = getBirthdayReminderTemplate(employee.position || '', employee.full_name, daysUntil);
  
  return `${reminder}\n\n` +
         `📅 Дата: <b>${dateStr}</b>\n` +
         `🎂 Возраст: <b>${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}</b>\n` +
         `👔 Должность: <b>${employee.position || 'Не указана'}</b>`;
}

/**
 * Форматирует сообщение для Slack о предстоящем дне рождения (за 7 или 3 дня)
 * Это напоминание для HR, а не поздравление для сотрудника
 */
export function formatSlackUpcomingBirthday(employee: Employee, daysUntil: number): string {
  const birthDate = new Date(employee.birth_date!);
  const today = new Date();
  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
  const age = upcomingBirthday.getFullYear() - birthDate.getFullYear();
  
  const dateStr = format(upcomingBirthday, 'd MMMM', { locale: ru });
  const positionLower = (employee.position || '').toLowerCase();
  
  let reminder = '';
  if (positionLower.includes('директор') || positionLower.includes('руководитель')) {
    reminder = `🔔 *Напоминание для HR*\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у *${employee.full_name}* (руководитель).\n\n` +
               `Не забудьте подготовить поздравление и отправить его в чат команды! 💼✨`;
  } else if (positionLower.includes('менеджер') || positionLower.includes('специалист')) {
    reminder = `🔔 *Напоминание для HR*\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у *${employee.full_name}* (менеджер/специалист).\n\n` +
               `Не забудьте подготовить поздравление и отправить его в чат команды! 🌟💪`;
  } else if (positionLower.includes('разработчик') || positionLower.includes('программист') || positionLower.includes('инженер')) {
    reminder = `🔔 *Напоминание для HR*\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у *${employee.full_name}* (разработчик/инженер).\n\n` +
               `Не забудьте подготовить поздравление и отправить его в чат команды! 💻🚀`;
  } else {
    reminder = `🔔 *Напоминание для HR*\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} день рождения у *${employee.full_name}*.\n\n` +
               `Не забудьте подготовить поздравление и отправить его в чат команды! 🌈✨`;
  }
  
  return `${reminder}\n\n` +
         `📅 Дата: *${dateStr}*\n` +
         `🎂 Возраст: *${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}*\n` +
         `👔 Должность: *${employee.position || 'Не указана'}*`;
}

/**
 * Получает сотрудников для уведомления за 7 дней
 */
export function getBirthdaysIn7Days(employees: Employee[]): Employee[] {
  return getBirthdaysInDays(employees, 7);
}

/**
 * Получает сотрудников для уведомления за 3 дня
 */
export function getBirthdaysIn3Days(employees: Employee[]): Employee[] {
  return getBirthdaysInDays(employees, 3);
}

