-- Быстрая проверка таблиц онбординга

-- 1. Проверяем существование таблиц
SELECT 
  'Таблицы:' as check_type,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Существует'
    ELSE '❌ Не найдена'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY table_name;

-- 2. Проверяем количество записей в таблицах
SELECT 
  'Данные:' as check_type,
  'onboarding_templates' as table_name,
  COUNT(*)::text as status
FROM onboarding_templates
UNION ALL
SELECT 
  'Данные:' as check_type,
  'onboarding_instances' as table_name,
  COUNT(*)::text as status
FROM onboarding_instances
UNION ALL
SELECT 
  'Данные:' as check_type,
  'onboarding_tasks' as table_name,
  COUNT(*)::text as status
FROM onboarding_tasks;

-- 3. Проверяем RLS (должно быть TRUE для всех)
SELECT 
  'RLS:' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity = TRUE THEN '✅ Включен'
    ELSE '❌ Выключен'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');

-- 4. Проверяем политики (должно быть минимум по 2 для каждой таблицы)
SELECT 
  'Политики:' as check_type,
  tablename,
  COUNT(*)::text || ' политик' as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
GROUP BY tablename
ORDER BY tablename;



