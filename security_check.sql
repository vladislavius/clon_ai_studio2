-- ============================================================================
-- СКРИПТ ПРОВЕРКИ БЕЗОПАСНОСТИ RLS ПОЛИТИК
-- ============================================================================
-- Этот скрипт проверяет, что Row Level Security (RLS) правильно настроен
-- для всех таблиц в базе данных
-- ============================================================================

-- Проверка 1: Убедиться, что RLS включен для всех критических таблиц
DO $$
DECLARE
  rls_enabled BOOLEAN;
  table_name TEXT;
  tables_to_check TEXT[] := ARRAY[
    'employees',
    'employee_attachments',
    'statistics_definitions',
    'statistics_values',
    'org_metadata',
    'departments',
    'subdepartments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_check
  LOOP
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name;
    
    IF rls_enabled IS NULL THEN
      RAISE WARNING '⚠️ Таблица % не найдена (возможно, не создана)', table_name;
    ELSIF NOT rls_enabled THEN
      RAISE WARNING '⚠️ RLS не включен для таблицы %', table_name;
    ELSE
      RAISE NOTICE '✅ RLS включен для таблицы %', table_name;
    END IF;
  END LOOP;
END $$;

-- Проверка 2: Убедиться, что существуют политики безопасности
DO $$
DECLARE
  policy_count INTEGER;
  table_name TEXT;
  table_exists BOOLEAN;
  tables_to_check TEXT[] := ARRAY[
    'employees',
    'employee_attachments',
    'statistics_definitions',
    'statistics_values',
    'org_metadata',
    'departments',
    'subdepartments'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_check
  LOOP
    -- Проверяем, существует ли таблица
    SELECT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = table_name
    ) INTO table_exists;
    
    IF NOT table_exists THEN
      RAISE WARNING '⚠️ Таблица % не существует, пропускаем проверку политик', table_name;
    ELSE
      SELECT COUNT(*) INTO policy_count
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name;
      
      IF policy_count = 0 THEN
        RAISE WARNING '⚠️ Нет политик безопасности для таблицы %', table_name;
      ELSE
        RAISE NOTICE '✅ Найдено % политик для таблицы %', policy_count, table_name;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Проверка 3: Убедиться, что функция is_admin() существует
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE EXCEPTION 'Функция is_admin() не найдена!';
  ELSE
    RAISE NOTICE '✅ Функция is_admin() существует';
  END IF;
END $$;

-- Проверка 4: Показать все существующие политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Проверка 5: Проверить, что нет политик, разрешающих доступ анонимным пользователям
DO $$
DECLARE
  anon_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO anon_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND 'anon' = ANY(roles);
  
  IF anon_policy_count > 0 THEN
    RAISE WARNING '⚠️ Найдено % политик, разрешающих доступ анонимным пользователям!', anon_policy_count;
  ELSE
    RAISE NOTICE '✅ Нет политик для анонимных пользователей';
  END IF;
END $$;

-- Проверка 6: Показать все таблицы с отключенным RLS (если есть)
-- Показываем только существующие таблицы
SELECT 
  t.schemaname,
  t.tablename,
  CASE 
    WHEN c.relrowsecurity THEN '✅ RLS включен'
    ELSE '⚠️ RLS отключен'
  END as rls_status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = t.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'employees',
    'employee_attachments',
    'statistics_definitions',
    'statistics_values',
    'org_metadata',
    'departments',
    'subdepartments'
  )
ORDER BY t.tablename;

-- Итоговое сообщение
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Проверка безопасности завершена!';
  RAISE NOTICE 'Если все проверки пройдены успешно, ваша база данных защищена RLS.';
  RAISE NOTICE '============================================================================';
END $$;

