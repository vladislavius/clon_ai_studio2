-- =====================================================
-- Row Level Security (RLS) Setup для HR System Pro
-- =====================================================
-- Этот скрипт настраивает политики безопасности на уровне строк
-- для защиты данных от несанкционированного доступа
--
-- ВАЖНО: Выполнить этот скрипт в Supabase SQL Editor
-- После выполнения назначить роль admin через User Metadata
-- =====================================================

-- =====================================================
-- 1. Создание функции проверки роли администратора
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем наличие сессии
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Проверяем роль из JWT claims
  -- Приоритет 1: app_metadata.role
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN true;
  END IF;

  -- Приоритет 2: user_metadata.is_admin
  IF (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true THEN
    RETURN true;
  END IF;

  -- Приоритет 3: email в белом списке (fallback для legacy)
  IF (auth.jwt() ->> 'email') IN ('hrtisland@gmail.com') THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий для документации
COMMENT ON FUNCTION is_admin() IS 'Проверяет, является ли текущий пользователь администратором на основе JWT claims';

-- =====================================================
-- 2. RLS для таблицы employees
-- =====================================================

-- Включить RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Политика: Все могут читать
CREATE POLICY "Everyone can view employees"
ON employees FOR SELECT
USING (true);

-- Политика: Только админы могут создавать
CREATE POLICY "Admins can insert employees"
ON employees FOR INSERT
WITH CHECK (is_admin());

-- Политика: Только админы могут обновлять
CREATE POLICY "Admins can update employees"
ON employees FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Политика: Только админы могут удалять
CREATE POLICY "Admins can delete employees"
ON employees FOR DELETE
USING (is_admin());

-- =====================================================
-- 3. RLS для таблицы employee_attachments
-- =====================================================

ALTER TABLE employee_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view attachments"
ON employee_attachments FOR SELECT
USING (true);

CREATE POLICY "Admins can insert attachments"
ON employee_attachments FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update attachments"
ON employee_attachments FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete attachments"
ON employee_attachments FOR DELETE
USING (is_admin());

-- =====================================================
-- 4. RLS для таблицы statistics_definitions
-- =====================================================

ALTER TABLE statistics_definitions ENABLE ROW LEVEL SECURITY;

-- Все могут читать статистики
CREATE POLICY "Everyone can view statistics definitions"
ON statistics_definitions FOR SELECT
USING (true);

-- Админы могут управлять любыми статистиками
CREATE POLICY "Admins can manage all statistics definitions"
ON statistics_definitions FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Сотрудники могут управлять только своими личными статистиками
CREATE POLICY "Employees can manage their own statistics"
ON statistics_definitions FOR ALL
USING (
  type = 'employee' AND 
  owner_id IS NOT NULL AND 
  owner_id::text IN (
    SELECT id::text FROM employees WHERE email = (auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  type = 'employee' AND 
  owner_id IS NOT NULL AND 
  owner_id::text IN (
    SELECT id::text FROM employees WHERE email = (auth.jwt() ->> 'email')
  )
);

-- =====================================================
-- 5. RLS для таблицы statistics_values
-- =====================================================

ALTER TABLE statistics_values ENABLE ROW LEVEL SECURITY;

-- Все могут читать значения статистик
CREATE POLICY "Everyone can view statistics values"
ON statistics_values FOR SELECT
USING (true);

-- Админы могут управлять всеми значениями
CREATE POLICY "Admins can manage all statistics values"
ON statistics_values FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Сотрудники могут управлять значениями своих статистик
CREATE POLICY "Employees can manage their own statistics values"
ON statistics_values FOR ALL
USING (
  definition_id::text IN (
    SELECT sd.id::text FROM statistics_definitions sd
    WHERE sd.type = 'employee' 
    AND sd.owner_id::text IN (
      SELECT e.id::text FROM employees e WHERE e.email = (auth.jwt() ->> 'email')
    )
  )
)
WITH CHECK (
  definition_id::text IN (
    SELECT sd.id::text FROM statistics_definitions sd
    WHERE sd.type = 'employee' 
    AND sd.owner_id::text IN (
      SELECT e.id::text FROM employees e WHERE e.email = (auth.jwt() ->> 'email')
    )
  )
);

-- =====================================================
-- 6. RLS для таблицы integration_tokens
-- =====================================================

ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

-- Только админы могут видеть токены
CREATE POLICY "Admins can view integration tokens"
ON integration_tokens FOR SELECT
USING (is_admin());

-- Только админы могут управлять токенами
CREATE POLICY "Admins can manage integration tokens"
ON integration_tokens FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- 7. RLS для таблицы organization_metadata (если существует)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'organization_metadata') THEN
    EXECUTE 'ALTER TABLE organization_metadata ENABLE ROW LEVEL SECURITY';
    
    EXECUTE 'CREATE POLICY "Everyone can view organization metadata"
    ON organization_metadata FOR SELECT
    USING (true)';
    
    EXECUTE 'CREATE POLICY "Admins can manage organization metadata"
    ON organization_metadata FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================================================
-- 8. Проверка настроенных политик
-- =====================================================

-- Вывести список всех политик для проверки
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
ORDER BY tablename, policyname;

-- =====================================================
-- 9. Инструкции для администратора
-- =====================================================

/*
СЛЕДУЮЩИЕ ШАГИ (выполнить вручную):

1. Назначить роль admin первому пользователю:
   - Перейти в Supabase Dashboard → Authentication → Users
   - Найти вашего пользователя (например, hrtisland@gmail.com)
   - Нажать "..." → "Edit User"
   - В поле "User Metadata" добавить:
     {
       "is_admin": true
     }
   - Нажать "Save"

2. Протестировать доступ:
   - Войти в приложение как admin - должны работать все функции
   - Создать тестового пользователя без роли admin
   - Войти как обычный пользователь - должен видеть данные, но не может редактировать

3. В случае проблем (если доступ заблокирован):
   - Временно отключить RLS:
     ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
   - Проверить настройки
   - Включить обратно:
     ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

4. Для отката всех изменений (если что-то пошло не так):
   - Выполнить скрипт rollback_rls.sql (создать отдельно если нужно)
   - Или вручную удалить все политики:
     DROP POLICY IF EXISTS "policy_name" ON table_name;
     ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
*/
