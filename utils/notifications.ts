
import { Employee } from '../types';
import { format, isToday, isTomorrow, addDays, differenceInDays } from 'date-fns';

/**
 * Проверяет, есть ли у сотрудника день рождения в ближайшие дни
 */
export function getUpcomingBirthdays(employees: Employee[], daysAhead: number = 30): Employee[] {
  const today = new Date();
  const targetDate = addDays(today, daysAhead);
  
  return employees.filter(emp => {
    if (!emp.birth_date) return false;
    
    try {
      const birthDate = new Date(emp.birth_date);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      
      // Если день рождения уже прошел в этом году, берем следующий год
      const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
      
      return upcomingBirthday >= today && upcomingBirthday <= targetDate;
    } catch {
      return false;
    }
  }).sort((a, b) => {
    if (!a.birth_date || !b.birth_date) return 0;
    try {
      const dateA = new Date(a.birth_date);
      const dateB = new Date(b.birth_date);
      const today = new Date();
      
      const birthdayA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      const birthdayB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
      
      if (birthdayA < today) {
        birthdayA.setFullYear(today.getFullYear() + 1);
      }
      if (birthdayB < today) {
        birthdayB.setFullYear(today.getFullYear() + 1);
      }
      
      return birthdayA.getTime() - birthdayB.getTime();
    } catch {
      return 0;
    }
  });
}

/**
 * Получает дни рождения сегодня
 */
export function getTodayBirthdays(employees: Employee[]): Employee[] {
  return employees.filter(emp => {
    if (!emp.birth_date) return false;
    try {
      const birthDate = new Date(emp.birth_date);
      const today = new Date();
      return birthDate.getMonth() === today.getMonth() && 
             birthDate.getDate() === today.getDate();
    } catch {
      return false;
    }
  });
}

/**
 * Форматирует информацию о предстоящем дне рождения
 */
export function formatBirthdayInfo(employee: Employee): string {
  if (!employee.birth_date) return '';
  
  try {
    const birthDate = new Date(employee.birth_date);
    const today = new Date();
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    
    const upcomingBirthday = thisYearBirthday < today ? nextYearBirthday : thisYearBirthday;
    const daysUntil = differenceInDays(upcomingBirthday, today);
    
    if (daysUntil === 0) {
      return `Сегодня день рождения! 🎉`;
    } else if (daysUntil === 1) {
      return `Завтра день рождения`;
    } else {
      const age = today.getFullYear() - birthDate.getFullYear();
      const nextAge = upcomingBirthday.getFullYear() - birthDate.getFullYear();
      return `Через ${daysUntil} дн. (${nextAge} лет)`;
    }
  } catch {
    return '';
  }
}

/**
 * Генерирует текст для email уведомления о днях рождения
 */
export function generateBirthdayEmailContent(employees: Employee[]): string {
  const today = getTodayBirthdays(employees);
  const upcoming = getUpcomingBirthdays(employees, 7).filter(
    emp => !today.some(t => t.id === emp.id)
  );
  
  let content = 'Уведомление о днях рождения сотрудников\n\n';
  
  if (today.length > 0) {
    content += '🎉 СЕГОДНЯ ДЕНЬ РОЖДЕНИЯ:\n';
    today.forEach(emp => {
      content += `• ${emp.full_name}${emp.position ? ` (${emp.position})` : ''}\n`;
    });
    content += '\n';
  }
  
  if (upcoming.length > 0) {
    content += '📅 БЛИЖАЙШИЕ ДНИ РОЖДЕНИЯ (7 дней):\n';
    upcoming.forEach(emp => {
      const info = formatBirthdayInfo(emp);
      content += `• ${emp.full_name}${emp.position ? ` (${emp.position})` : ''} - ${info}\n`;
    });
  }
  
  if (today.length === 0 && upcoming.length === 0) {
    content += 'В ближайшие 7 дней дней рождения нет.\n';
  }
  
  content += `\n---\nСгенерировано HR System Pro ${format(new Date(), 'dd.MM.yyyy HH:mm')}`;
  
  return content;
}

/**
 * Открывает почтовый клиент с подготовленным письмом о днях рождения
 */
export function openBirthdayEmail(employees: Employee[]): void {
  const subject = encodeURIComponent('Уведомление о днях рождения сотрудников');
  const body = encodeURIComponent(generateBirthdayEmailContent(employees));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

