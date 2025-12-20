-- =================================================================
-- СКРИПТ ПОЛНОГО ИСПРАВЛЕНИЯ ПРОИЗВОДИТЕЛЬНОСТИ И ДОСТУПА
-- Выполните этот скрипт в Supabase SQL Editor для сброса и настройки
-- =================================================================

-- 1. Сначала отключаем RLS везде, чтобы разблокировать доступ на время настройки
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistics_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistics_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE org_metadata DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем ВСЕ существующие политики (чтобы убрать конфликты и дубликаты)
DROP POLICY IF EXISTS "Everyone can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Employees are viewable by everyone in same company" ON employees; -- Старая версия

DROP POLICY IF EXISTS "Everyone can view attachments" ON employee_attachments;
DROP POLICY IF EXISTS "Admins can insert attachments" ON employee_attachments;
DROP POLICY IF EXISTS "Admins can update attachments" ON employee_attachments;
DROP POLICY IF EXISTS "Admins can delete attachments" ON employee_attachments;

DROP POLICY IF EXISTS "Everyone can view statistics definitions" ON statistics_definitions;
DROP POLICY IF EXISTS "Admins can manage all statistics definitions" ON statistics_definitions;
DROP POLICY IF EXISTS "Employees can manage their own statistics" ON statistics_definitions;

DROP POLICY IF EXISTS "Everyone can view statistics values" ON statistics_values;
DROP POLICY IF EXISTS "Admins can manage all statistics values" ON statistics_values;
DROP POLICY IF EXISTS "Employees can manage their own statistics values" ON statistics_values;

-- 3. Включаем необходимые расширения для индексов
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Для быстрого поиска по тексту
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Для работы с UUID

-- 4. Создаем ОПТИМИЗИРОВАННЫЕ индексы (включая пропущенный email!)
-- Индекс по email критичен для RLS проверок!
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees USING gin(full_name gin_trgm_ops);

-- Индексы для статистик (UUID поля)
CREATE INDEX IF NOT EXISTS idx_statistics_values_definition_id ON statistics_values(definition_id);
CREATE INDEX IF NOT EXISTS idx_statistics_values_date ON statistics_values(date);
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_owner_id ON statistics_definitions(owner_id);
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_type ON statistics_definitions(type);

-- Индексы для оргструктуры
CREATE INDEX IF NOT EXISTS idx_org_metadata_type_node_id ON org_metadata(type, node_id);

-- 5. Обновляем функцию is_admin (чтобы избежать ошибок типов)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверка на NULL
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  -- Безопасное приведение типов и проверка роли
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN RETURN true; END IF;
  IF (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean IS TRUE THEN RETURN true; END IF;
  
  -- Fallback по email
  IF (auth.jwt() ->> 'email') IN ('hrtisland@gmail.com') THEN RETURN true; END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Включаем RLS обратно и создаем ПРОСТЫЕ политики
-- Мы используем кастинг ::text чтобы избежать ошибки 42883 (UUID vs Text)

--------- EMPLOYEES ---------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Write Employees" ON employees FOR ALL USING (is_admin()) WITH CHECK (is_admin());

--------- ATTACHMENTS ---------
ALTER TABLE employee_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Attachments" ON employee_attachments FOR SELECT USING (true);
CREATE POLICY "Write Attachments" ON employee_attachments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

--------- ORG METADATA ---------
ALTER TABLE org_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Org" ON org_metadata FOR SELECT USING (true);
CREATE POLICY "Write Org" ON org_metadata FOR ALL USING (is_admin()) WITH CHECK (is_admin());

--------- STATISTICS DEFINITIONS ---------
ALTER TABLE statistics_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Stat Defs" ON statistics_definitions FOR SELECT USING (true);
CREATE POLICY "Admin All Stat Defs" ON statistics_definitions FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Оптимизированная политика для сотрудников (с явным кастом)
CREATE POLICY "Employee Own Stat Defs" ON statistics_definitions FOR ALL
USING (
  type = 'employee' AND
  owner_id IS NOT NULL AND
  owner_id = (SELECT id::text FROM employees WHERE email = (auth.jwt() ->> 'email') LIMIT 1)
);

--------- STATISTICS VALUES ---------
ALTER TABLE statistics_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read Stat Values" ON statistics_values FOR SELECT USING (true);
CREATE POLICY "Admin All Stat Values" ON statistics_values FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Упрощенная политика для значений (избегаем тяжелых джойнов если возможно, но используем индексы)
CREATE POLICY "Employee Own Stat Values" ON statistics_values FOR ALL
USING (
  definition_id IN (
    SELECT id FROM statistics_definitions 
    WHERE type = 'employee' 
    AND owner_id = (SELECT id::text FROM employees WHERE email = (auth.jwt() ->> 'email') LIMIT 1)
  )
);
