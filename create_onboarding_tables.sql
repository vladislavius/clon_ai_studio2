-- Создание таблиц для системы онбординга новых сотрудников

-- Включаем расширение uuid-ossp, если оно еще не включено
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Функция is_admin() для RLS (если еще не создана)
-- ВАЖНО: используем проверку через JWT токен, а не через колонку в employees
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Проверяем роль администратора через JWT токен
  -- Вариант 1: через app_metadata.role
  -- Вариант 2: через user_metadata.is_admin
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Таблица шаблонов онбординга
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255), -- Для какой должности
  department_id VARCHAR(50),
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Массив задач
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица экземпляров онбординга (для конкретных сотрудников)
CREATE TABLE IF NOT EXISTS onboarding_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  target_completion_date DATE,
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица задач онбординга
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'documents', 'access', 'equipment', 'training'
  assigned_to VARCHAR(20) NOT NULL, -- 'hr', 'employee', 'manager', 'it'
  assigned_user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_onboarding_instances_employee_id ON onboarding_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_instances_status ON onboarding_instances(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_instance_id ON onboarding_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_assigned_to ON onboarding_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_completed ON onboarding_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_due_date ON onboarding_tasks(due_date);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at (удаляем старые, если существуют)
DROP TRIGGER IF EXISTS update_onboarding_templates_updated_at ON onboarding_templates;
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

DROP TRIGGER IF EXISTS update_onboarding_instances_updated_at ON onboarding_instances;
CREATE TRIGGER update_onboarding_instances_updated_at
  BEFORE UPDATE ON onboarding_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

DROP TRIGGER IF EXISTS update_onboarding_tasks_updated_at ON onboarding_tasks;
CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- Функция для автоматического расчета прогресса
CREATE OR REPLACE FUNCTION calculate_onboarding_progress(instance_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = TRUE)
  INTO total_tasks, completed_tasks
  FROM onboarding_tasks
  WHERE instance_id = instance_uuid;
  
  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
END;
$$ LANGUAGE plpgsql;

-- RLS политики для безопасности
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Политики для onboarding_templates (только админы могут управлять)
-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "Admins can manage onboarding templates" ON onboarding_templates;
CREATE POLICY "Admins can manage onboarding templates"
  ON onboarding_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read onboarding templates" ON onboarding_templates;
CREATE POLICY "Authenticated users can read onboarding templates"
  ON onboarding_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политики для onboarding_instances (удаляем старые, если существуют)
DROP POLICY IF EXISTS "Admins can manage onboarding instances" ON onboarding_instances;
CREATE POLICY "Admins can manage onboarding instances"
  ON onboarding_instances
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read their own onboarding instances" ON onboarding_instances;
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

DROP POLICY IF EXISTS "Admins can create onboarding instances" ON onboarding_instances;
CREATE POLICY "Admins can create onboarding instances"
  ON onboarding_instances
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update their own onboarding instances" ON onboarding_instances;
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

-- Политики для onboarding_tasks (удаляем старые, если существуют)
DROP POLICY IF EXISTS "Admins can manage onboarding tasks" ON onboarding_tasks;
CREATE POLICY "Admins can manage onboarding tasks"
  ON onboarding_tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read tasks for their onboarding" ON onboarding_tasks;
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

DROP POLICY IF EXISTS "Users can update assigned tasks" ON onboarding_tasks;
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

-- Комментарии к таблицам
COMMENT ON TABLE onboarding_templates IS 'Шаблоны онбординга для разных должностей';
COMMENT ON TABLE onboarding_instances IS 'Экземпляры онбординга для конкретных сотрудников';
COMMENT ON TABLE onboarding_tasks IS 'Задачи онбординга';

COMMENT ON COLUMN onboarding_tasks.category IS 'Категория задачи: documents, access, equipment, training';
COMMENT ON COLUMN onboarding_tasks.assigned_to IS 'Кому назначена задача: hr, employee, manager, it';
COMMENT ON COLUMN onboarding_instances.status IS 'Статус: in_progress, completed, cancelled';

