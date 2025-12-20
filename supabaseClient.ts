
import { createClient } from '@supabase/supabase-js';

// --- КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ ---
// ВАЖНО: Создайте файл .env.local в корне проекта со следующими переменными:
// VITE_SUPABASE_URL=https://your-project.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key-here
//
// Инструкция: см. ENV_SETUP.md

// Получаем переменные окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Проверка наличия ключей
const isConfigured = !!(supabaseUrl && supabaseKey && supabaseUrl.includes('http') && supabaseKey.length > 20);

// Создаем клиент только если ключи настроены
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Логирование только в режиме разработки
if (import.meta.env.DEV) {
  if (isConfigured) {
    console.log('[SupabaseClient] ✅ Инициализирован с URL:', supabaseUrl);
  } else {
    console.error('[SupabaseClient] ❌ КРИТИЧЕСКАЯ ОШИБКА: Переменные окружения не настроены!');
    console.error('[SupabaseClient] Создайте файл .env.local с VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
    console.error('[SupabaseClient] Инструкция: см. ENV_SETUP.md');
  }
}

// Предупреждение в продакшн режиме (без раскрытия деталей)
if (!import.meta.env.DEV && !isConfigured) {
  console.warn('⚠️ Supabase не настроен. Приложение будет работать в Offline режиме.');
}
