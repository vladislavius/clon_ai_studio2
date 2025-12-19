
import { Employee } from '../types';
import { format, addDays } from 'date-fns';

/**
 * Генерирует URL для добавления события в Google Calendar
 */
export function generateGoogleCalendarUrl(
  title: string,
  description: string,
  startDate: Date,
  endDate?: Date,
  location?: string
): string {
  const start = format(startDate, "yyyyMMdd'T'HHmmss");
  const end = endDate ? format(endDate, "yyyyMMdd'T'HHmmss") : format(addDays(startDate, 1), "yyyyMMdd'T'HHmmss");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: `${start}/${end}`,
    ...(location && { location }),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Генерирует URL для добавления события в Outlook Calendar
 */
export function generateOutlookCalendarUrl(
  title: string,
  description: string,
  startDate: Date,
  endDate?: Date,
  location?: string
): string {
  const start = startDate.toISOString();
  const end = endDate ? endDate.toISOString() : addDays(startDate, 1).toISOString();
  
  const params = new URLSearchParams({
    subject: title,
    body: description,
    startdt: start,
    enddt: end,
    ...(location && { location }),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Создает событие календаря для дня рождения сотрудника
 */
export function createBirthdayCalendarEvent(employee: Employee, year: number): {
  googleUrl: string;
  outlookUrl: string;
  title: string;
  description: string;
} {
  if (!employee.birth_date) {
    throw new Error('Дата рождения не указана');
  }

  const birthDate = new Date(employee.birth_date);
  const birthdayThisYear = new Date(year, birthDate.getMonth(), birthDate.getDate());
  const age = year - birthDate.getFullYear();

  const title = `🎉 День рождения: ${employee.full_name}`;
  const description = `День рождения сотрудника\n\n${employee.full_name}${employee.position ? `\nДолжность: ${employee.position}` : ''}${employee.department ? `\nДепартамент: ${employee.department.join(', ')}` : ''}\n\nИсполняется ${age} лет`;

  return {
    googleUrl: generateGoogleCalendarUrl(title, description, birthdayThisYear),
    outlookUrl: generateOutlookCalendarUrl(title, description, birthdayThisYear),
    title,
    description,
  };
}

/**
 * Отправляет сообщение в Slack через webhook
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  channel?: string,
  username?: string
): Promise<boolean> {
  try {
    const payload = {
      text: message,
      ...(channel && { channel }),
      ...(username && { username }),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Slack notification error:', error);
    return false;
  }
}

/**
 * Форматирует уведомление о днях рождения для Slack
 */
export function formatSlackBirthdayMessage(employees: Employee[]): string {
  const today = employees.filter(emp => {
    if (!emp.birth_date) return false;
    const birthDate = new Date(emp.birth_date);
    const today = new Date();
    return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
  });

  if (today.length === 0) {
    return 'Сегодня нет дней рождения 🎉';
  }

  let message = `🎉 *Дни рождения сегодня:*\n\n`;
  today.forEach(emp => {
    message += `• *${emp.full_name}*${emp.position ? ` (${emp.position})` : ''}\n`;
  });

  return message;
}

/**
 * Отправляет сообщение в Telegram через бота
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Telegram notification error:', error);
    return false;
  }
}

/**
 * Форматирует уведомление о днях рождения для Telegram
 */
export function formatTelegramBirthdayMessage(employees: Employee[]): string {
  const today = employees.filter(emp => {
    if (!emp.birth_date) return false;
    const birthDate = new Date(emp.birth_date);
    const today = new Date();
    return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
  });

  if (today.length === 0) {
    return 'Сегодня нет дней рождения 🎉';
  }

  let message = '🎉 <b>Дни рождения сегодня:</b>\n\n';
  today.forEach(emp => {
    message += `• <b>${emp.full_name}</b>${emp.position ? ` (${emp.position})` : ''}\n`;
  });

  return message;
}

/**
 * Открывает календарь для добавления события
 */
export function openCalendarEvent(
  calendarType: 'google' | 'outlook',
  title: string,
  description: string,
  startDate: Date,
  endDate?: Date,
  location?: string
): void {
  const url = calendarType === 'google'
    ? generateGoogleCalendarUrl(title, description, startDate, endDate, location)
    : generateOutlookCalendarUrl(title, description, startDate, endDate, location);
  
  window.open(url, '_blank');
}

/**
 * Интеграция с системами учета времени
 * Генерирует отчет о рабочем времени для сотрудника
 */
export interface TimeTrackingEntry {
  date: string;
  hours: number;
  project?: string;
  description?: string;
}

export function generateTimeTrackingReport(
  employee: Employee,
  entries: TimeTrackingEntry[],
  format: 'csv' | 'json' = 'csv'
): string {
  if (format === 'json') {
    return JSON.stringify({
      employee: {
        id: employee.id,
        name: employee.full_name,
        position: employee.position,
      },
      entries,
      totalHours: entries.reduce((sum, entry) => sum + entry.hours, 0),
      period: {
        start: entries.length > 0 ? entries[0].date : null,
        end: entries.length > 0 ? entries[entries.length - 1].date : null,
      },
    }, null, 2);
  }

  // CSV format
  const headers = ['Дата', 'Часы', 'Проект', 'Описание'];
  const rows = entries.map(entry => [
    entry.date,
    entry.hours.toString(),
    entry.project || '',
    entry.description || '',
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

/**
 * Экспортирует отчет учета времени
 */
export function exportTimeTrackingReport(
  employee: Employee,
  entries: TimeTrackingEntry[],
  format: 'csv' | 'json' = 'csv'
): void {
  const content = generateTimeTrackingReport(employee, entries, format);
  const mimeType = format === 'json' ? 'application/json' : 'text/csv';
  const extension = format === 'json' ? 'json' : 'csv';
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `time_tracking_${employee.id}_${format(new Date(), 'yyyy-MM-dd')}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

