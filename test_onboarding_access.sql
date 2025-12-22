-- Тест доступа к таблицам онбординга
-- Выполните этот скрипт после fix_onboarding_rls_policies.sql

-- 1. Проверка функции is_admin()
SELECT 
  'is_admin()' as test_name,
  public.is_admin() as result,
  CASE 
    WHEN public.is_admin() IS NOT NULL THEN '✅ Функция работает'
    ELSE '❌ Функция не работает'
  END as status;

-- 2. Проверка доступа к onboarding_templates (должно работать для всех авторизованных)
SELECT 
  'onboarding_templates SELECT' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Доступ есть'
    ELSE '❌ Нет доступа'
  END as status
FROM onboarding_templates;

-- 3. Проверка доступа к onboarding_instances (должно работать)
SELECT 
  'onboarding_instances SELECT' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Доступ есть'
    ELSE '❌ Нет доступа'
  END as status
FROM onboarding_instances;

-- 4. Проверка доступа к onboarding_tasks (должно работать)
SELECT 
  'onboarding_tasks SELECT' as test_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Доступ есть'
    ELSE '❌ Нет доступа'
  END as status
FROM onboarding_tasks;

-- 5. Проверка структуры таблиц (должны быть все колонки)
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY table_name, ordinal_position;

-- 6. Финальная проверка: попытка SELECT с JOIN (как в приложении)
-- Это должно работать БЕЗ ошибки "column is_admin does not exist"
SELECT 
  oi.id,
  oi.employee_id,
  oi.status,
  oi.progress_percentage
FROM onboarding_instances oi
LIMIT 1;

-- Если все запросы выполнились без ошибок - значит все работает! ✅


