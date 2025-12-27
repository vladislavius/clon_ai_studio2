-- Проверка и исправление проблемы с сохранением токенов Telegram
-- Ошибка 400 при upsert в integration_tokens

-- 1. Проверяем структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens'
ORDER BY ordinal_position;

-- 2. Проверяем constraint UNIQUE
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens';

-- 3. Проверяем RLS политики
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'integration_tokens';

-- 4. Если token_encrypted имеет NOT NULL, но мы передаем пустую строку для Slack,
-- нужно изменить на NULL или убрать NOT NULL
-- Проверяем текущее состояние:
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN token_encrypted = '' THEN 1 END) as empty_tokens,
  COUNT(CASE WHEN token_encrypted IS NULL THEN 1 END) as null_tokens
FROM integration_tokens;

-- 5. Если нужно, изменяем constraint для token_encrypted
-- (раскомментируйте если нужно)
-- ALTER TABLE public.integration_tokens 
--   ALTER COLUMN token_encrypted DROP NOT NULL;

-- 6. Проверяем, что функция is_admin() существует
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'is_admin';



