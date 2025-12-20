-- ============================================================================
-- ПРОВЕРКА ТАБЛИЦЫ integration_tokens
-- ============================================================================
-- Этот скрипт проверяет, что таблица создана правильно
-- ============================================================================

-- Проверка 1: Существует ли таблица
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'integration_tokens'
  ) THEN
    RAISE NOTICE '✅ Таблица integration_tokens существует';
  ELSE
    RAISE EXCEPTION '❌ Таблица integration_tokens не найдена';
  END IF;
END $$;

-- Проверка 2: Проверка колонок
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens'
ORDER BY ordinal_position;

-- Проверка 3: Проверка индексов
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'integration_tokens';

-- Проверка 4: Проверка RLS
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'integration_tokens';

-- Проверка 5: Проверка политик безопасности
SELECT 
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'integration_tokens'
ORDER BY policyname;

-- Проверка 6: Проверка функции is_admin()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE NOTICE '✅ Функция is_admin() существует';
  ELSE
    RAISE WARNING '⚠️ Функция is_admin() не найдена';
  END IF;
END $$;

-- Проверка 7: Проверка триггера
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'integration_tokens';

-- Итоговое сообщение
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Проверка таблицы integration_tokens завершена!';
  RAISE NOTICE 'Если все проверки пройдены, таблица готова к использованию.';
  RAISE NOTICE '============================================================================';
END $$;

