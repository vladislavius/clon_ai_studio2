-- Проверка структуры таблицы integration_tokens
-- Выполните этот скрипт для проверки текущей структуры

-- 1. Проверяем существование таблицы
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens';

-- 2. Проверяем все колонки таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens'
ORDER BY ordinal_position;

-- 3. Проверяем constraint UNIQUE
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens';

-- 4. Проверяем текущие данные (если таблица существует)
SELECT 
  integration_type,
  COUNT(*) as count,
  COUNT(CASE WHEN token_encrypted IS NULL THEN 1 END) as null_tokens,
  COUNT(CASE WHEN token_encrypted = '' THEN 1 END) as empty_tokens
FROM integration_tokens
GROUP BY integration_type;



