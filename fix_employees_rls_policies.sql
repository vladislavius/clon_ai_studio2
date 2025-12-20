-- Оптимизация RLS политик для таблицы employees
-- Удаление конфликтующих и избыточных политик

-- ВАЖНО: Выполните этот скрипт в Supabase SQL Editor
-- Сначала удалите старые политики, затем создайте новые оптимизированные

-- ============================================
-- ШАГ 1: Удаление всех существующих политик
-- ============================================

DROP POLICY IF EXISTS "Admins can do everything on employees" ON employees;
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON employees;
DROP POLICY IF EXISTS "Only Admin can modify employees" ON employees;
DROP POLICY IF EXISTS "Public Access Employees" ON employees;
DROP POLICY IF EXISTS "Read Employees" ON employees;
DROP POLICY IF EXISTS "Users can view all employees" ON employees;
DROP POLICY IF EXISTS "Write Employees" ON employees;

-- ============================================
-- ШАГ 2: Создание оптимизированных политик
-- ============================================

-- Политика 1: Все аутентифицированные пользователи могут читать сотрудников
CREATE POLICY "Authenticated users can read employees"
ON employees
FOR SELECT
TO authenticated
USING (true);

-- Политика 2: Только администраторы могут создавать, обновлять и удалять
-- Используем функцию is_admin() для проверки прав
CREATE POLICY "Admins can manage employees"
ON employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ПРИМЕЧАНИЕ: Если функция is_admin() не работает, используйте упрощенную версию:
-- CREATE POLICY "Admins can manage employees"
-- ON employees
-- FOR ALL
-- TO authenticated
-- USING (
--   (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
--   (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
-- )
-- WITH CHECK (
--   (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
--   (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
-- );

-- ============================================
-- ШАГ 3: Убедитесь, что функция is_admin() существует
-- ============================================

-- Если функция не существует, создайте её:
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем роль из JWT токена
  RETURN (
    (auth.jwt() ->> 'user_role')::text = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );
END;
$$;

-- ============================================
-- ШАГ 4: Проверка RLS статуса
-- ============================================

-- Убедитесь, что RLS включен
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Проверка политик
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
WHERE tablename = 'employees'
ORDER BY policyname;

