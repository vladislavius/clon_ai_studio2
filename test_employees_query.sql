-- Тестовый запрос для проверки загрузки сотрудников
-- Выполните этот запрос в Supabase SQL Editor для диагностики

-- 1. Проверка количества записей
SELECT COUNT(*) as total_employees FROM employees;

-- 2. Проверка RLS статуса
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'employees';

-- 3. Проверка текущих политик
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- 4. Проверка функции is_admin()
SELECT public.is_admin() as is_admin_check;

-- 5. Тестовый запрос от имени аутентифицированного пользователя
-- (Выполните этот запрос после входа в систему)
SELECT * FROM employees LIMIT 5;

-- 6. Проверка сессии текущего пользователя
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() ->> 'email' as current_user_email,
  auth.jwt() -> 'app_metadata' ->> 'role' as user_role,
  auth.jwt() -> 'user_metadata' ->> 'is_admin' as is_admin_flag;


