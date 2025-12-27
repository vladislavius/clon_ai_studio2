-- Проверка существования таблицы zrs_documents и её структуры

-- 1. Проверяем существование таблицы
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'zrs_documents'
    ) 
    THEN '✅ Таблица zrs_documents существует'
    ELSE '❌ Таблица zrs_documents НЕ существует'
  END AS table_status;

-- 2. Проверяем структуру таблицы (если она существует)
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'zrs_documents'
ORDER BY ordinal_position;

-- 3. Проверяем RLS политики
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'zrs_documents';

-- 4. Проверяем индексы
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'zrs_documents';

-- 5. Проверяем функцию is_admin()
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = 'is_admin'
    ) 
    THEN '✅ Функция is_admin() существует'
    ELSE '❌ Функция is_admin() НЕ существует'
  END AS function_status;



