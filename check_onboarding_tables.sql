-- Проверка существования таблиц онбординга и их структуры

-- 1. Проверяем существование таблиц
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY table_name;

-- 2. Проверяем структуру таблицы onboarding_templates
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'onboarding_templates'
ORDER BY ordinal_position;

-- 3. Проверяем структуру таблицы onboarding_instances
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'onboarding_instances'
ORDER BY ordinal_position;

-- 4. Проверяем структуру таблицы onboarding_tasks
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'onboarding_tasks'
ORDER BY ordinal_position;

-- 5. Проверяем RLS политики для onboarding_templates
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'onboarding_templates'
ORDER BY policyname;

-- 6. Проверяем RLS политики для onboarding_instances
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'onboarding_instances'
ORDER BY policyname;

-- 7. Проверяем RLS политики для onboarding_tasks
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'onboarding_tasks'
ORDER BY policyname;

-- 8. Проверяем, включен ли RLS для таблиц
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');

-- 9. Проверяем индексы
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY tablename, indexname;

-- 10. Проверяем функцию is_admin()
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'is_admin';



