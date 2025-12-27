-- Исправление RLS политик для таблиц онбординга
-- Проблема: политики могут использовать неправильный синтаксис для is_admin()

-- 1. Удаляем все существующие политики для onboarding_instances
DROP POLICY IF EXISTS "Admins can manage onboarding instances" ON onboarding_instances;
DROP POLICY IF EXISTS "Users can read their own onboarding instances" ON onboarding_instances;
DROP POLICY IF EXISTS "Admins can create onboarding instances" ON onboarding_instances;
DROP POLICY IF EXISTS "Users can update their own onboarding instances" ON onboarding_instances;

-- 2. Создаем политики заново с правильным синтаксисом
-- Важно: используем public.is_admin(), а не is_admin как колонку

-- Политика для админов (все операции)
CREATE POLICY "Admins can manage onboarding instances"
  ON onboarding_instances
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Политика для чтения (пользователи видят свои экземпляры)
CREATE POLICY "Users can read their own onboarding instances"
  ON onboarding_instances
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- Политика для создания (только админы)
CREATE POLICY "Admins can create onboarding instances"
  ON onboarding_instances
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND public.is_admin()
  );

-- Политика для обновления (пользователи могут обновлять свои экземпляры)
CREATE POLICY "Users can update their own onboarding instances"
  ON onboarding_instances
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- 3. Проверяем политики для onboarding_templates
DROP POLICY IF EXISTS "Admins can manage onboarding templates" ON onboarding_templates;
DROP POLICY IF EXISTS "Authenticated users can read onboarding templates" ON onboarding_templates;

CREATE POLICY "Admins can manage onboarding templates"
  ON onboarding_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read onboarding templates"
  ON onboarding_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Проверяем политики для onboarding_tasks
DROP POLICY IF EXISTS "Admins can manage onboarding tasks" ON onboarding_tasks;
DROP POLICY IF EXISTS "Users can read tasks for their onboarding" ON onboarding_tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON onboarding_tasks;

CREATE POLICY "Admins can manage onboarding tasks"
  ON onboarding_tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can read tasks for their onboarding"
  ON onboarding_tasks
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      instance_id IN (
        SELECT id FROM onboarding_instances 
        WHERE employee_id IN (
          SELECT id FROM employees WHERE email = auth.email()
        )
      ) OR
      assigned_user_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

CREATE POLICY "Users can update assigned tasks"
  ON onboarding_tasks
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      assigned_user_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      assigned_user_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- 5. Убеждаемся, что RLS включен
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- 6. ОБНОВЛЯЕМ КЕШ СХЕМЫ
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✅ Политики исправлены и кеш схемы обновлен!';
  RAISE NOTICE '⏱️ Подождите 10-15 секунд перед обновлением страницы приложения';
END $$;

-- 7. Проверка: список всех политик
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks')
ORDER BY tablename, policyname;



