
import { createClient } from '@supabase/supabase-js';

// --- КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ ---
// 1. Зайдите в Project Settings -> API в Supabase
// 2. Скопируйте 'Project URL' и 'anon public key'
// 3. Вставьте их ниже внутри кавычек

const SUPABASE_URL = 'https://supabase.assisthelp.ru';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1NjU5NjAwLCJleHAiOjE5MjM0MjYwMDB9.-DxQZP7k4N9kt6Xfe7gFjTVtiLZ7BIMJQz44PWFkz-k';

// Проверка наличия ключей
const isConfigured = SUPABASE_URL && SUPABASE_URL.includes('http') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20;

export const supabase = isConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!isConfigured) {
  console.warn('Supabase не настроен. Приложение будет работать в Offline режиме или с ошибками подключения.');
}
