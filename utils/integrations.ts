/**
 * Утилиты для работы с токенами интеграций
 * Безопасное хранение токенов на сервере вместо localStorage
 */

import { supabase } from '../supabaseClient';
import { Employee } from '../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export type IntegrationType = 'telegram' | 'slack' | 'email' | 'other';

export interface IntegrationToken {
  id: string;
  user_id: string;
  integration_type: IntegrationType;
  token_encrypted: string;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Сохраняет токен интеграции в базе данных
 * @param type - Тип интеграции
 * @param token - Токен для сохранения
 * @param webhookUrl - URL для webhook (опционально)
 * @returns true если успешно, false если ошибка
 */
export async function saveIntegrationToken(
  type: IntegrationType,
  token: string,
  webhookUrl?: string
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase не настроен');
    return false;
  }

  try {
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError);
      return false;
    }

    // Сохраняем токен (в будущем можно добавить шифрование)
    const { error } = await supabase
      .from('integration_tokens')
      .upsert({
        user_id: user.id,
        integration_type: type,
        token_encrypted: token, // В будущем: зашифровать перед сохранением
        webhook_url: webhookUrl || null,
      }, {
        onConflict: 'user_id,integration_type'
      });

    if (error) {
      console.error('Ошибка сохранения токена:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Неожиданная ошибка при сохранении токена:', error);
    return false;
  }
}

/**
 * Получает токен интеграции из базы данных
 * @param type - Тип интеграции
 * @returns Токен или null если не найден
 */
export async function getIntegrationToken(
  type: IntegrationType
): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase не настроен');
    return null;
  }

  try {
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError);
      return null;
    }

    // Получаем токен
    const { data, error } = await supabase
      .from('integration_tokens')
      .select('token_encrypted')
      .eq('user_id', user.id)
      .eq('integration_type', type)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Токен не найден
        return null;
      }
      console.error('Ошибка получения токена:', error);
      return null;
    }

    // В будущем: расшифровать токен перед возвратом
    return data.token_encrypted;
  } catch (error) {
    console.error('Неожиданная ошибка при получении токена:', error);
    return null;
  }
}

/**
 * Удаляет токен интеграции из базы данных
 * @param type - Тип интеграции
 * @returns true если успешно, false если ошибка
 */
export async function deleteIntegrationToken(
  type: IntegrationType
): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase не настроен');
    return false;
  }

  try {
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError);
      return false;
    }

    // Удаляем токен
    const { error } = await supabase
      .from('integration_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('integration_type', type);

    if (error) {
      console.error('Ошибка удаления токена:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Неожиданная ошибка при удалении токена:', error);
    return false;
  }
}

/**
 * Получает все токены интеграций текущего пользователя
 * @returns Массив токенов или пустой массив
 */
export async function getAllIntegrationTokens(): Promise<IntegrationToken[]> {
  if (!supabase) {
    console.error('Supabase не настроен');
    return [];
  }

  try {
    // Получаем текущего пользователя
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Ошибка получения пользователя:', userError);
      return [];
    }

    // Получаем все токены
    const { data, error } = await supabase
      .from('integration_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения токенов:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Неожиданная ошибка при получении токенов:', error);
    return [];
  }
}

/**
 * Миграция токенов из localStorage в базу данных
 * Вызывается один раз при первом использовании
 */
export async function migrateTokensFromLocalStorage(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Проверяем, есть ли токены в localStorage
    const telegramToken = localStorage.getItem('telegram_bot_token');
    const telegramChatId = localStorage.getItem('telegram_chat_id');
    const slackWebhook = localStorage.getItem('slack_webhook');

    // Мигрируем токены
    if (telegramToken) {
      const migrated = await saveIntegrationToken('telegram', telegramToken, telegramChatId || undefined);
      if (migrated) {
        localStorage.removeItem('telegram_bot_token');
        if (telegramChatId) localStorage.removeItem('telegram_chat_id');
        console.log('✅ Токен Telegram мигрирован в БД');
      }
    }

    if (slackWebhook) {
      const migrated = await saveIntegrationToken('slack', '', slackWebhook);
      if (migrated) {
        localStorage.removeItem('slack_webhook');
        console.log('✅ Webhook Slack мигрирован в БД');
      }
    }
  } catch (error) {
    console.error('Ошибка миграции токенов:', error);
  }
}

// ============================================================================
// ФУНКЦИИ ДЛЯ РАБОТЫ С КАЛЕНДАРЯМИ И УВЕДОМЛЕНИЯМИ
// ============================================================================

/**
 * Создает событие календаря для дня рождения
 */
export function createBirthdayCalendarEvent(employee: Employee, year: number) {
  const birthDate = employee.birth_date ? new Date(employee.birth_date) : new Date();
  const eventDate = new Date(year, birthDate.getMonth(), birthDate.getDate());
  
  return {
    title: `День рождения: ${employee.full_name}`,
    description: `День рождения сотрудника ${employee.full_name}${employee.position ? ` (${employee.position})` : ''}`,
    date: eventDate,
  };
}

/**
 * Открывает календарь с событием
 */
export function openCalendarEvent(
  calendarType: 'google' | 'outlook',
  title: string,
  description: string,
  date: Date
): void {
  const formattedDate = format(date, 'yyyyMMdd');
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  let url = '';
  if (calendarType === 'google') {
    url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&details=${encodedDescription}&dates=${formattedDate}/${formattedDate}`;
  } else if (calendarType === 'outlook') {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endFormatted = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
    const startFormatted = format(date, "yyyy-MM-dd'T'HH:mm:ss");
    url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodedTitle}&body=${encodedDescription}&startdt=${startFormatted}&enddt=${endFormatted}`;
  }

  if (url) {
    window.open(url, '_blank');
  }
}

/**
 * Форматирует сообщение для Slack о днях рождения
 */
export function formatSlackBirthdayMessage(employees: Employee[]): string {
  if (employees.length === 0) {
    return 'Сегодня нет дней рождения 🎉';
  }

  const today = format(new Date(), 'd MMMM', { locale: ru });
  let message = `🎂 *Дни рождения ${today}*\n\n`;

  employees.forEach((emp, index) => {
    const age = emp.birth_date 
      ? new Date().getFullYear() - new Date(emp.birth_date).getFullYear()
      : null;
    message += `${index + 1}. *${emp.full_name}*`;
    if (emp.position) message += ` - ${emp.position}`;
    if (age) message += ` (${age} лет)`;
    message += '\n';
  });

  return message;
}

/**
 * Форматирует сообщение для Telegram о днях рождения
 */
export function formatTelegramBirthdayMessage(employees: Employee[]): string {
  if (employees.length === 0) {
    return 'Сегодня нет дней рождения 🎉';
  }

  const today = format(new Date(), 'd MMMM', { locale: ru });
  let message = `🎂 <b>Дни рождения ${today}</b>\n\n`;

  employees.forEach((emp, index) => {
    const age = emp.birth_date 
      ? new Date().getFullYear() - new Date(emp.birth_date).getFullYear()
      : null;
    message += `${index + 1}. <b>${emp.full_name}</b>`;
    if (emp.position) message += ` - ${emp.position}`;
    if (age) message += ` (${age} лет)`;
    message += '\n';
  });

  return message;
}
