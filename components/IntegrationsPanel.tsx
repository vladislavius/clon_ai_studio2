import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, Mail, MessageSquare, Clock, Settings, CheckCircle2, X, ExternalLink } from 'lucide-react';
import { Employee } from '../types';
import { getUpcomingBirthdays } from '../utils/notifications';
import { useToast } from './Toast';
import { 
  saveIntegrationToken, 
  getIntegrationToken, 
  getAllIntegrationTokens,
  migrateTokensFromLocalStorage,
  openCalendarEvent, 
  createBirthdayCalendarEvent,
  type IntegrationToken
} from '../utils/integrations';
import {
  getBirthdaysIn7Days,
  getBirthdaysIn3Days,
  formatTelegramUpcomingBirthday,
  formatSlackUpcomingBirthday
} from '../utils/birthdayNotifications';

interface IntegrationsPanelProps {
  employees: Employee[];
  isAdmin?: boolean;
}

const IntegrationsPanel: React.FC<IntegrationsPanelProps> = ({ employees, isAdmin }) => {
  const toast = useToast();
  const [slackWebhook, setSlackWebhook] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [loading, setLoading] = useState(true);

  // Загрузка токенов из БД при монтировании компонента
  useEffect(() => {
    const loadTokens = async () => {
      setLoading(true);
      try {
        // Сначала мигрируем токены из localStorage (если есть)
        await migrateTokensFromLocalStorage();

        // Загружаем токены из БД
        const tokens = await getAllIntegrationTokens();

        // Обрабатываем Slack токен
        const slackToken = tokens.find(t => t.integration_type === 'slack');
        if (slackToken?.webhook_url) {
          setSlackWebhook(slackToken.webhook_url);
        }

        // Обрабатываем Telegram токен
        // Для Telegram: token_encrypted содержит bot token, webhook_url содержит chat ID
        const telegramToken = tokens.find(t => t.integration_type === 'telegram');
        if (telegramToken) {
          if (telegramToken.token_encrypted) {
            setTelegramBotToken(telegramToken.token_encrypted);
          }
          if (telegramToken.webhook_url) {
            setTelegramChatId(telegramToken.webhook_url);
          }
        }

        // Проверяем, остались ли токены в localStorage (предупреждение)
        if (typeof window !== 'undefined' && import.meta.env.DEV) {
          const hasLocalSlack = localStorage.getItem('slack_webhook');
          const hasLocalTelegram = localStorage.getItem('telegram_bot_token');
          if (hasLocalSlack || hasLocalTelegram) {
            console.warn('⚠️ Обнаружены токены в localStorage. Они должны быть мигрированы в БД. Проверьте миграцию.');
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки токенов:', error);
        toast.error('Ошибка загрузки настроек интеграций');
      } finally {
        setLoading(false);
      }
    };

    loadTokens();
  }, [toast]);

  const saveSlackConfig = async () => {
    if (!slackWebhook.trim()) {
      toast.error('Укажите Webhook URL');
      return;
    }

    // Для Slack передаем null вместо пустой строки для token_encrypted
    const success = await saveIntegrationToken('slack', '', slackWebhook.trim());
    if (success) {
      toast.success('Настройки Slack сохранены');
      // Удаляем из localStorage если там был
      if (typeof window !== 'undefined') {
        localStorage.removeItem('slack_webhook');
      }
    } else {
      toast.error('Ошибка сохранения настроек Slack. Проверьте консоль для деталей.');
    }
  };

  const saveTelegramConfig = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      toast.error('Заполните токен бота и Chat ID');
      return;
    }

    // Для Telegram: сохраняем bot token в token_encrypted, chat ID в webhook_url
    const success = await saveIntegrationToken('telegram', telegramBotToken.trim(), telegramChatId.trim());
    if (success) {
      toast.success('Настройки Telegram сохранены');
      setTelegramStatus('idle');
      // Удаляем из localStorage если там были
      if (typeof window !== 'undefined') {
        localStorage.removeItem('telegram_bot_token');
        localStorage.removeItem('telegram_chat_id');
      }
    } else {
      toast.error('Ошибка сохранения настроек Telegram');
    }
  };

  const checkTelegramConnection = useCallback(async () => {
    if (!telegramBotToken || !telegramChatId) {
      setTelegramStatus('invalid');
      toast.error('Заполните токен бота и Chat ID');
      return;
    }

    setTelegramStatus('checking');
    try {
      // Проверяем доступность бота через getMe
      const getMeUrl = `https://api.telegram.org/bot${telegramBotToken}/getMe`;
      const getMeResponse = await fetch(getMeUrl);
      
      if (!getMeResponse.ok) {
        setTelegramStatus('invalid');
        toast.error('Неверный токен бота');
        return;
      }

      // Проверяем доступность чата через sendMessage с пустым сообщением (не отправляем)
      // Вместо этого просто проверяем формат токена и ID
      const tokenPattern = /^\d+:[A-Za-z0-9_-]+$/;
      const chatIdPattern = /^-?\d+$/;
      
      if (!tokenPattern.test(telegramBotToken)) {
        setTelegramStatus('invalid');
        toast.error('Неверный формат токена бота');
        return;
      }

      if (!chatIdPattern.test(telegramChatId)) {
        setTelegramStatus('invalid');
        toast.error('Неверный формат Chat ID');
        return;
      }

      setTelegramStatus('valid');
      toast.success('Подключение к Telegram успешно проверено');
    } catch (error) {
      setTelegramStatus('invalid');
      toast.error('Ошибка проверки подключения к Telegram');
    }
  }, [telegramBotToken, telegramChatId, toast]);

  const handleAddBirthdayToCalendar = (employee: Employee, calendarType: 'google' | 'outlook') => {
    try {
      const year = new Date().getFullYear();
      const event = createBirthdayCalendarEvent(employee, year);
      openCalendarEvent(calendarType, event.title, event.description, new Date(employee.birth_date!));
      toast.success(`Событие добавлено в ${calendarType === 'google' ? 'Google' : 'Outlook'} Calendar`);
    } catch (error) {
      toast.error('Ошибка при создании события календаря');
    }
  };

  const handleSendSlackNotification = async () => {
    if (!slackWebhook) {
      toast.error('Укажите Slack Webhook URL');
      return;
    }

    // Отправляем уведомления за 7 и 3 дня
    const birthdays7Days = getBirthdaysIn7Days(employees);
    const birthdays3Days = getBirthdaysIn3Days(employees);
    
    // Защита от отправки всех сотрудников
    if (birthdays7Days.length > 50 || birthdays3Days.length > 50) {
      toast.error('Обнаружена ошибка: слишком много сотрудников для уведомления. Проверьте логику фильтрации.');
      console.error('Too many birthdays:', { birthdays7Days: birthdays7Days.length, birthdays3Days: birthdays3Days.length });
      return;
    }
    
    if (birthdays7Days.length === 0 && birthdays3Days.length === 0) {
      toast.info('Нет предстоящих дней рождения для уведомления (за 7 или 3 дня)');
      return;
    }

    try {
      let sentCount = 0;
      
      // Отправляем уведомления за 7 дней
      for (const emp of birthdays7Days) {
        // Дополнительная проверка: убеждаемся, что у сотрудника есть дата рождения
        if (!emp.birth_date) continue;
        
        const message = formatSlackUpcomingBirthday(emp, 7);
        const response = await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        });
        if (!response.ok) {
          throw new Error('Ошибка отправки в Slack');
        }
        sentCount++;
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Отправляем уведомления за 3 дня
      for (const emp of birthdays3Days) {
        // Дополнительная проверка: убеждаемся, что у сотрудника есть дата рождения
        if (!emp.birth_date) continue;
        
        const message = formatSlackUpcomingBirthday(emp, 3);
        const response = await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message }),
        });
        if (!response.ok) {
          throw new Error('Ошибка отправки в Slack');
        }
        sentCount++;
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (sentCount > 0) {
        toast.success(`Уведомления отправлены в Slack (${sentCount} сообщений)`);
      } else {
        toast.info('Нет сотрудников для уведомления');
      }
    } catch (error) {
      console.error('Slack notification error:', error);
      toast.error('Ошибка подключения к Slack');
    }
  };

  const handleSendTelegramNotification = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error('Укажите токен бота и Chat ID');
      return;
    }

    // Отправляем уведомления за 7 и 3 дня
    const birthdays7Days = getBirthdaysIn7Days(employees);
    const birthdays3Days = getBirthdaysIn3Days(employees);
    
    // Защита от отправки всех сотрудников
    if (birthdays7Days.length > 50 || birthdays3Days.length > 50) {
      toast.error('Обнаружена ошибка: слишком много сотрудников для уведомления. Проверьте логику фильтрации.');
      console.error('Too many birthdays:', { birthdays7Days: birthdays7Days.length, birthdays3Days: birthdays3Days.length });
      return;
    }
    
    if (birthdays7Days.length === 0 && birthdays3Days.length === 0) {
      toast.info('Нет предстоящих дней рождения для уведомления (за 7 или 3 дня)');
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      let sentCount = 0;
      
      // Отправляем уведомления за 7 дней
      for (const emp of birthdays7Days) {
        // Дополнительная проверка: убеждаемся, что у сотрудника есть дата рождения
        if (!emp.birth_date) continue;
        
        const message = formatTelegramUpcomingBirthday(emp, 7);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Telegram API error:', errorData);
          throw new Error('Ошибка отправки в Telegram');
        }
        sentCount++;
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Отправляем уведомления за 3 дня
      for (const emp of birthdays3Days) {
        // Дополнительная проверка: убеждаемся, что у сотрудника есть дата рождения
        if (!emp.birth_date) continue;
        
        const message = formatTelegramUpcomingBirthday(emp, 3);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Telegram API error:', errorData);
          throw new Error('Ошибка отправки в Telegram');
        }
        sentCount++;
        // Небольшая задержка между сообщениями
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (sentCount > 0) {
        toast.success(`Уведомления отправлены в Telegram (${sentCount} сообщений)`);
      } else {
        toast.info('Нет сотрудников для уведомления');
      }
    } catch (error) {
      console.error('Telegram notification error:', error);
      toast.error('Ошибка подключения к Telegram');
    }
  };

  const upcomingBirthdays = getUpcomingBirthdays(employees, 7);

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in pb-20 px-3 md:px-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-1.5 md:mb-2">Интеграции</h2>
        <p className="text-xs md:text-sm text-slate-500">Подключите внешние сервисы для автоматизации уведомлений</p>
      </div>

      {/* Calendar Integrations */}
      <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg md:rounded-xl flex items-center justify-center text-blue-600">
            <Calendar size={16} className="md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-slate-800">Календари</h3>
            <p className="text-xs md:text-sm text-slate-500">Добавьте дни рождения в календарь</p>
          </div>
        </div>

        {upcomingBirthdays.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {upcomingBirthdays.slice(0, 5).map(emp => (
              <div key={emp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-2.5 md:p-3 bg-slate-50 rounded-lg md:rounded-xl border border-slate-100">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs md:text-sm text-slate-800 truncate">{emp.full_name}</p>
                  <p className="text-[10px] md:text-xs text-slate-500">{emp.birth_date}</p>
                </div>
                <div className="flex gap-1.5 md:gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleAddBirthdayToCalendar(emp, 'google')}
                    className="flex-1 sm:flex-none px-2.5 md:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center gap-1 md:gap-1.5"
                  >
                    <ExternalLink size={11} className="md:w-3 md:h-3" /> Google
                  </button>
                  <button
                    onClick={() => handleAddBirthdayToCalendar(emp, 'outlook')}
                    className="flex-1 sm:flex-none px-2.5 md:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center gap-1 md:gap-1.5"
                  >
                    <ExternalLink size={11} className="md:w-3 md:h-3" /> Outlook
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs md:text-sm text-slate-400 text-center py-3 md:py-4">Нет предстоящих дней рождения</p>
        )}
      </div>

      {/* Slack Integration */}
      <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-lg md:rounded-xl flex items-center justify-center text-purple-600">
            <MessageSquare size={16} className="md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-slate-800">Slack</h3>
            <p className="text-xs md:text-sm text-slate-500">Отправка уведомлений в Slack канал</p>
          </div>
        </div>

        <div className="space-y-2.5 md:space-y-3">
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5">Webhook URL</label>
            <input
              type="text"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-xs md:text-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              Создайте Incoming Webhook в настройках Slack приложения
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={saveSlackConfig}
              className="px-3 md:px-4 py-2 bg-purple-600 text-white font-bold rounded-lg md:rounded-xl text-xs md:text-sm hover:bg-purple-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={handleSendSlackNotification}
              disabled={!slackWebhook}
              className="px-3 md:px-4 py-2 bg-white border border-purple-200 text-purple-600 font-bold rounded-lg md:rounded-xl text-xs md:text-sm hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отправить тест
            </button>
          </div>
        </div>
      </div>

      {/* Telegram Integration */}
      <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 rounded-lg md:rounded-xl flex items-center justify-center text-blue-600">
            <MessageSquare size={16} className="md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-slate-800">Telegram</h3>
            <p className="text-xs md:text-sm text-slate-500">Отправка уведомлений в Telegram</p>
          </div>
        </div>

        <div className="space-y-2.5 md:space-y-3">
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5">Bot Token</label>
            <input
              type="text"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs md:text-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              Получите токен у @BotFather в Telegram
            </p>
          </div>
          <div>
            <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5">Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="123456789"
              className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white border border-slate-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs md:text-sm"
            />
            <p className="text-[10px] md:text-xs text-slate-400 mt-1">
              ID чата или канала для отправки уведомлений
            </p>
          </div>
          <div className="flex items-center gap-2">
            {telegramStatus === 'checking' && (
              <div className="text-[10px] md:text-xs text-blue-600 font-medium flex items-center gap-1">
                <Clock size={11} className="md:w-3 md:h-3 animate-spin" /> Проверка...
              </div>
            )}
            {telegramStatus === 'valid' && (
              <div className="text-[10px] md:text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 size={11} className="md:w-3 md:h-3" /> Подключение активно
              </div>
            )}
            {telegramStatus === 'invalid' && (
              <div className="text-[10px] md:text-xs text-red-600 font-medium flex items-center gap-1">
                <X size={11} className="md:w-3 md:h-3" /> Ошибка подключения
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={saveTelegramConfig}
              className="px-3 md:px-4 py-2 bg-blue-600 text-white font-bold rounded-lg md:rounded-xl text-xs md:text-sm hover:bg-blue-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={checkTelegramConnection}
              disabled={!telegramBotToken || !telegramChatId || telegramStatus === 'checking'}
              className="px-3 md:px-4 py-2 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg md:rounded-xl text-xs md:text-sm hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Проверить подключение
            </button>
            <button
              onClick={handleSendTelegramNotification}
              disabled={!telegramBotToken || !telegramChatId}
              className="px-3 md:px-4 py-2 bg-white border border-blue-200 text-blue-600 font-bold rounded-lg md:rounded-xl text-xs md:text-sm hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отправить тест
            </button>
          </div>
        </div>
      </div>

      {/* Time Tracking */}
      <div className="bg-white rounded-lg md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-lg md:rounded-xl flex items-center justify-center text-emerald-600">
            <Clock size={16} className="md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-slate-800">Учет времени</h3>
            <p className="text-xs md:text-sm text-slate-500">Экспорт данных для систем учета времени</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg md:rounded-xl p-3 md:p-4">
          <p className="text-xs md:text-sm text-emerald-800 mb-2 md:mb-3">
            Функция экспорта отчетов учета времени доступна через API утилит.
            Используйте функцию <code className="bg-white px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs">exportTimeTrackingReport</code> для экспорта данных.
          </p>
          <p className="text-[10px] md:text-xs text-emerald-700">
            Поддерживаются форматы CSV и JSON для интеграции с внешними системами.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;

