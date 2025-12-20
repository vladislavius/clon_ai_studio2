
import { createClient } from '@supabase/supabase-js';

// --- КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ ---
// 1. Зайдите в Project Settings -> API в Supabase
// 2. Скопируйте 'Project URL' и 'anon public key'
// 3. Создайте файл .env.local и добавьте переменные:
//    VITE_SUPABASE_URL=https://your-project.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key-here

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Проверка наличия ключей
const isConfigured = SUPABASE_URL && SUPABASE_URL.includes('http') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isConfigured) {
  console.warn('Supabase не настроен. Приложение будет работать в Offline режиме или с ошибками подключения.');
}
