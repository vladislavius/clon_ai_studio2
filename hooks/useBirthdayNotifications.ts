import { useEffect, useRef } from 'react';
import { Employee } from '../types';
import { getBirthdaysIn7Days, getBirthdaysIn3Days, formatTelegramUpcomingBirthday, formatSlackUpcomingBirthday } from '../utils/birthdayNotifications';
import { getAllIntegrationTokens } from '../utils/integrations';
import { format } from 'date-fns';

interface BirthdayNotification {
  employeeId: string;
  daysUntil: number;
  date: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'birthday_notifications_sent';

/**
 * Получает список уже отправленных уведомлений из localStorage
 */
function getSentNotifications(): BirthdayNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Сохраняет информацию об отправленном уведомлении
 */
function markNotificationSent(employeeId: string, daysUntil: number, date: string): void {
  try {
    const sent = getSentNotifications();
    const notification: BirthdayNotification = { employeeId, daysUntil, date };
    
    // Проверяем, не было ли уже отправлено такое уведомление
    const exists = sent.some(
      n => n.employeeId === employeeId && n.daysUntil === daysUntil && n.date === date
    );
    
    if (!exists) {
      sent.push(notification);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sent));
    }
  } catch (error) {
    console.error('Error saving notification:', error);
  }
}

/**
 * Проверяет, было ли уже отправлено уведомление
 */
function wasNotificationSent(employeeId: string, daysUntil: number, date: string): boolean {
  const sent = getSentNotifications();
  return sent.some(
    n => n.employeeId === employeeId && n.daysUntil === daysUntil && n.date === date
  );
}

/**
 * Очищает старые уведомления (старше 30 дней)
 */
function cleanupOldNotifications(): void {
  try {
    const sent = getSentNotifications();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filtered = sent.filter(n => {
      const notificationDate = new Date(n.date);
      return notificationDate >= thirtyDaysAgo;
    });
    
    if (filtered.length !== sent.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
}

/**
 * Отправляет уведомление в Telegram
 */
async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    console.log('[Telegram] Отправка сообщения:', { url, chatId, messageLength: message.length });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Telegram] Ошибка API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return false;
    }
    
    const result = await response.json();
    if (result.ok) {
      console.log('[Telegram] Сообщение успешно отправлено');
      return true;
    } else {
      console.error('[Telegram] Ошибка в ответе:', result);
      return false;
    }
  } catch (error) {
    console.error('[Telegram] Ошибка отправки уведомления:', error);
    return false;
  }
}

/**
 * Отправляет уведомление в Slack
 */
async function sendSlackNotification(webhookUrl: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Slack notification error:', error);
    return false;
  }
}

/**
 * Хук для автоматической отправки уведомлений о днях рождения
 */
export function useBirthdayNotifications(employees: Employee[]): void {
  const hasCheckedRef = useRef(false);
  const lastCheckDateRef = useRef<string | null>(null);

  useEffect(() => {
    // Проверяем только один раз при загрузке или если изменилась дата
    if (employees.length === 0) {
      console.log('[Birthday Notifications] Нет сотрудников, пропускаем проверку');
      return;
    }
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Если уже проверяли сегодня, пропускаем (но логируем для отладки)
    if (hasCheckedRef.current && lastCheckDateRef.current === today) {
      console.log('[Birthday Notifications] Уже проверяли сегодня, пропускаем. Для повторной проверки обновите страницу.');
      return;
    }
    
    const checkAndSendNotifications = async () => {
      hasCheckedRef.current = true;
      lastCheckDateRef.current = today;
      
      console.log('[Birthday Notifications] Начинаем проверку уведомлений...', { today, employeesCount: employees.length });
      
      // Очищаем старые уведомления
      cleanupOldNotifications();
      
      // Получаем интеграции
      const tokens = await getAllIntegrationTokens();
      const telegramToken = tokens.find(t => t.type === 'telegram');
      const slackToken = tokens.find(t => t.type === 'slack');
      
      console.log('[Birthday Notifications] Интеграции:', {
        telegramToken: telegramToken ? {
          hasToken: !!telegramToken.token_encrypted,
          hasWebhookUrl: !!telegramToken.webhook_url,
          webhookUrl: telegramToken.webhook_url
        } : null,
        slackToken: slackToken ? {
          hasWebhookUrl: !!slackToken.webhook_url
        } : null
      });
      
      if (!telegramToken && !slackToken) {
        console.log('[Birthday Notifications] Нет настроенных интеграций, пропускаем');
        return;
      }
      
      // Проверяем, что для Telegram есть и токен, и chat_id (webhook_url)
      if (telegramToken && (!telegramToken.token_encrypted || !telegramToken.webhook_url)) {
        console.warn('[Birthday Notifications] Telegram токен неполный:', {
          hasToken: !!telegramToken.token_encrypted,
          hasChatId: !!telegramToken.webhook_url
        });
      }
      
      // Получаем дни рождения за 7 и 3 дня
      const birthdays7Days = getBirthdaysIn7Days(employees);
      const birthdays3Days = getBirthdaysIn3Days(employees);
      
      console.log('[Birthday Notifications] Найдено дней рождения:', {
        'за 7 дней': birthdays7Days.length,
        'за 3 дня': birthdays3Days.length,
        '7 дней список': birthdays7Days.map(e => ({ name: e.full_name, date: e.birth_date })),
        '3 дня список': birthdays3Days.map(e => ({ name: e.full_name, date: e.birth_date }))
      });
      
      let sentCount = 0;
      
      // Отправляем уведомления за 7 дней
      for (const emp of birthdays7Days) {
        if (!emp.birth_date) continue;
        
        // Проверяем, не было ли уже отправлено
        if (wasNotificationSent(emp.id, 7, today)) {
          continue;
        }
        
        // Отправляем в Telegram
        if (telegramToken && telegramToken.token_encrypted && telegramToken.webhook_url) {
          const message = formatTelegramUpcomingBirthday(emp, 7);
          console.log('[Birthday Notifications] Отправка в Telegram:', {
            employee: emp.full_name,
            daysUntil: 7,
            hasToken: !!telegramToken.token_encrypted,
            chatId: telegramToken.webhook_url
          });
          
          const success = await sendTelegramNotification(
            telegramToken.token_encrypted,
            telegramToken.webhook_url,
            message
          );
          
          if (success) {
            console.log('[Birthday Notifications] Успешно отправлено в Telegram для', emp.full_name);
            markNotificationSent(emp.id, 7, today);
            sentCount++;
            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('[Birthday Notifications] Ошибка отправки в Telegram для', emp.full_name);
          }
        } else {
          console.warn('[Birthday Notifications] Telegram не настроен или неполный:', {
            hasToken: telegramToken ? !!telegramToken.token_encrypted : false,
            hasChatId: telegramToken ? !!telegramToken.webhook_url : false
          });
        }
        
        // Отправляем в Slack
        if (slackToken && slackToken.webhook_url) {
          const message = formatSlackUpcomingBirthday(emp, 7);
          const success = await sendSlackNotification(slackToken.webhook_url, message);
          
          if (success) {
            markNotificationSent(emp.id, 7, today);
            sentCount++;
            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // Отправляем уведомления за 3 дня
      for (const emp of birthdays3Days) {
        if (!emp.birth_date) continue;
        
        // Проверяем, не было ли уже отправлено
        if (wasNotificationSent(emp.id, 3, today)) {
          continue;
        }
        
        // Отправляем в Telegram
        if (telegramToken && telegramToken.token_encrypted && telegramToken.webhook_url) {
          const message = formatTelegramUpcomingBirthday(emp, 3);
          console.log('[Birthday Notifications] Отправка в Telegram:', {
            employee: emp.full_name,
            daysUntil: 3,
            hasToken: !!telegramToken.token_encrypted,
            chatId: telegramToken.webhook_url
          });
          
          const success = await sendTelegramNotification(
            telegramToken.token_encrypted,
            telegramToken.webhook_url,
            message
          );
          
          if (success) {
            console.log('[Birthday Notifications] Успешно отправлено в Telegram для', emp.full_name);
            markNotificationSent(emp.id, 3, today);
            sentCount++;
            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.error('[Birthday Notifications] Ошибка отправки в Telegram для', emp.full_name);
          }
        } else {
          console.warn('[Birthday Notifications] Telegram не настроен или неполный:', {
            hasToken: telegramToken ? !!telegramToken.token_encrypted : false,
            hasChatId: telegramToken ? !!telegramToken.webhook_url : false
          });
        }
        
        // Отправляем в Slack
        if (slackToken && slackToken.webhook_url) {
          const message = formatSlackUpcomingBirthday(emp, 3);
          const success = await sendSlackNotification(slackToken.webhook_url, message);
          
          if (success) {
            markNotificationSent(emp.id, 3, today);
            sentCount++;
            // Небольшая задержка между сообщениями
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (sentCount > 0) {
        console.log(`[Birthday Notifications] Отправлено ${sentCount} уведомлений`);
      }
    };
    
    // Запускаем проверку с небольшой задержкой после загрузки
    const timeoutId = setTimeout(() => {
      checkAndSendNotifications().catch(error => {
        console.error('[Birthday Notifications] Ошибка при проверке уведомлений:', error);
      });
    }, 2000); // 2 секунды после загрузки
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [employees]);
}

