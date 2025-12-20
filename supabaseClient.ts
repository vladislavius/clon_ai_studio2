
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
  console.warn('⚠️ Supabase не настроен. Приложение будет работать в Offline режиме или с ошибками подключения.');
  console.warn('📝 Проверьте:');
  console.warn('   1. Файл .env.local существует в корне проекта');
  console.warn('   2. Файл содержит VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  console.warn('   3. Dev сервер был перезапущен после создания .env.local');
  console.warn('   4. URL начинается с http:// или https://');
  console.warn('   5. ANON_KEY длиннее 20 символов');
  console.warn('Текущие значения:', {
    hasUrl: !!SUPABASE_URL,
    urlLength: SUPABASE_URL.length,
    hasKey: !!SUPABASE_ANON_KEY,
    keyLength: SUPABASE_ANON_KEY.length,
  });
}
