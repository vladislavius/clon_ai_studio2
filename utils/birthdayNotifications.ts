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
 * Получает шаблон поздравления в зависимости от должности
 */
function getBirthdayGreetingTemplate(position: string, fullName: string, daysUntil: number): string {
  const positionLower = position.toLowerCase();
  
  // Шаблоны для разных должностей
  if (positionLower.includes('директор') || positionLower.includes('руководитель')) {
    return `🎉 <b>${fullName}</b>, уважаемый руководитель!\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
           `Желаем Вам крепкого здоровья, неиссякаемой энергии и успехов в управлении командой! Пусть каждый день приносит новые достижения и радость от работы. 💼✨`;
  }
  
  if (positionLower.includes('менеджер') || positionLower.includes('специалист')) {
    return `🎉 <b>${fullName}</b>, дорогой коллега!\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
           `Желаем Вам профессионального роста, интересных проектов и отличного настроения! Пусть работа приносит удовольствие, а команда всегда поддерживает. 🌟💪`;
  }
  
  if (positionLower.includes('разработчик') || positionLower.includes('программист') || positionLower.includes('инженер')) {
    return `🎉 <b>${fullName}</b>, уважаемый специалист!\n\n` +
           `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
           `Желаем Вам вдохновения для новых идей, успешных проектов и интересных задач! Пусть код пишется легко, а баги обходят стороной. 💻🚀`;
  }
  
  // Общий шаблон
  return `🎉 <b>${fullName}</b>, дорогой коллега!\n\n` +
         `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
         `Желаем Вам крепкого здоровья, счастья, успехов в работе и личной жизни! Пусть каждый день будет наполнен радостью и позитивными моментами. 🌈✨`;
}

/**
 * Форматирует сообщение для Telegram о предстоящем дне рождения (за 7 или 3 дня)
 */
export function formatTelegramUpcomingBirthday(employee: Employee, daysUntil: number): string {
  const birthDate = new Date(employee.birth_date!);
  const today = new Date();
  const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
  const age = upcomingBirthday.getFullYear() - birthDate.getFullYear();
  
  const dateStr = format(upcomingBirthday, 'd MMMM', { locale: ru });
  const greeting = getBirthdayGreetingTemplate(employee.position || '', employee.full_name, daysUntil);
  
  return `${greeting}\n\n` +
         `📅 Дата: <b>${dateStr}</b>\n` +
         `🎂 Возраст: <b>${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}</b>\n` +
         `👔 Должность: <b>${employee.position || 'Не указана'}</b>`;
}

/**
 * Форматирует сообщение для Slack о предстоящем дне рождения (за 7 или 3 дня)
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
  
  let greeting = '';
  if (positionLower.includes('директор') || positionLower.includes('руководитель')) {
    greeting = `🎉 *${employee.full_name}*, уважаемый руководитель!\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
               `Желаем Вам крепкого здоровья, неиссякаемой энергии и успехов в управлении командой! Пусть каждый день приносит новые достижения и радость от работы. 💼✨`;
  } else if (positionLower.includes('менеджер') || positionLower.includes('специалист')) {
    greeting = `🎉 *${employee.full_name}*, дорогой коллега!\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
               `Желаем Вам профессионального роста, интересных проектов и отличного настроения! Пусть работа приносит удовольствие, а команда всегда поддерживает. 🌟💪`;
  } else if (positionLower.includes('разработчик') || positionLower.includes('программист') || positionLower.includes('инженер')) {
    greeting = `🎉 *${employee.full_name}*, уважаемый специалист!\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
               `Желаем Вам вдохновения для новых идей, успешных проектов и интересных задач! Пусть код пишется легко, а баги обходят стороной. 💻🚀`;
  } else {
    greeting = `🎉 *${employee.full_name}*, дорогой коллега!\n\n` +
               `Через ${daysUntil} ${daysUntil === 7 ? 'дней' : 'дня'} у Вас день рождения! 🎂\n\n` +
               `Желаем Вам крепкого здоровья, счастья, успехов в работе и личной жизни! Пусть каждый день будет наполнен радостью и позитивными моментами. 🌈✨`;
  }
  
  return `${greeting}\n\n` +
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

