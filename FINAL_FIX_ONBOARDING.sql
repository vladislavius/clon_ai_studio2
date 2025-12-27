-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Обновление кеша схемы для таблиц онбординга
-- Выполните этот скрипт после создания таблиц

-- 1. Проверяем, что все таблицы существуют
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');
  
  IF table_count = 3 THEN
    RAISE NOTICE '✅ Все 3 таблицы существуют';
  ELSE
    RAISE EXCEPTION '❌ Не все таблицы созданы. Выполните create_onboarding_tables.sql';
  END IF;
END $$;

-- 2. Убеждаемся, что RLS включен
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS включен для всех таблиц';

-- 3. ОБНОВЛЯЕМ КЕШ СХЕМЫ POSTGREST
-- Это самое важное! PostgREST кеширует схему и не видит новые таблицы без обновления кеша
DO $$
BEGIN
  -- Отправляем уведомление PostgREST об обновлении схемы
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✅ Кеш схемы обновлен!';
  RAISE NOTICE '⏱️ Подождите 10-15 секунд перед обновлением страницы приложения';
END $$;

-- 4. Проверяем политики (информация)
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename = 'onboarding_templates' AND COUNT(*) >= 2 THEN '✅ OK'
    WHEN tablename = 'onboarding_instances' AND COUNT(*) >= 4 THEN '✅ OK'
    WHEN tablename = 'onboarding_tasks' AND COUNT(*) >= 3 THEN '✅ OK'
    ELSE '⚠️ Недостаточно политик'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
GROUP BY tablename
ORDER BY tablename;

-- 5. Финальная проверка: тестовый запрос (должен работать без ошибки 400)
-- Раскомментируйте после обновления кеша и обновления страницы:
-- SELECT COUNT(*) FROM onboarding_instances;



