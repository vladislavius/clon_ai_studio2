-- Проверка и исправление таблиц онбординга

-- 1. Проверяем, что таблицы существуют (уже проверено - все 3 есть)
SELECT '✅ Таблицы существуют' as status;

-- 2. Проверяем RLS (должно быть TRUE)
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity = TRUE THEN '✅ RLS включен'
    ELSE '❌ RLS выключен - ВКЛЮЧАЕМ'
  END as rls_status,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');

-- 3. Включаем RLS, если выключен
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Проверяем количество политик (должно быть минимум по 2 для каждой таблицы)
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename = 'onboarding_templates' AND COUNT(*) >= 2 THEN '✅ Достаточно'
    WHEN tablename = 'onboarding_instances' AND COUNT(*) >= 4 THEN '✅ Достаточно'
    WHEN tablename = 'onboarding_tasks' AND COUNT(*) >= 3 THEN '✅ Достаточно'
    ELSE '⚠️ Недостаточно политик'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
GROUP BY tablename
ORDER BY tablename;

-- 5. Список всех политик
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL OR with_check IS NOT NULL THEN '✅ Настроена'
    ELSE '⚠️ Пустая'
  END as policy_status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY tablename, policyname;

-- 6. ОБНОВЛЯЕМ КЕШ СХЕМЫ POSTGREST (ВАЖНО!)
-- Это критически важно! Без этого PostgREST не увидит новые таблицы
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✅ Уведомление об обновлении кеша отправлено. Подождите 10-15 секунд.';
END $$;

-- 7. Проверяем функцию is_admin()
SELECT 
  'is_admin()' as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = 'is_admin'
    ) THEN '✅ Существует'
    ELSE '❌ Не найдена'
  END as status;

-- 8. Тестовая проверка доступа (должна вернуть пустой массив, но БЕЗ ошибки)
-- Выполните этот запрос после обновления кеша:
-- SELECT * FROM onboarding_instances LIMIT 1;

