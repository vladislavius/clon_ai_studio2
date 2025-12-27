-- ============================================================================
-- СОЗДАНИЕ ТАБЛИЦ departments И subdepartments
-- ============================================================================
-- Эти таблицы опциональны - приложение работает с org_metadata
-- Но они могут быть полезны для полного управления департаментами
-- ============================================================================

-- Создаем функцию is_admin() если она не существует
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- ТАБЛИЦА departments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY, -- 'dept1', 'dept2', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  
  -- Массивы для функций и действий
  functions TEXT[] DEFAULT '{}',
  trouble_signs TEXT[] DEFAULT '{}',
  development_actions TEXT[] DEFAULT '{}',
  
  manager TEXT NOT NULL,
  goal TEXT,
  vfp TEXT,
  main_stat TEXT,
  
  -- Порядок отображения
  sort_order INTEGER DEFAULT 0,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Индексы для departments
CREATE INDEX IF NOT EXISTS idx_departments_sort_order ON public.departments (sort_order);
CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments (name);

-- ----------------------------------------------------------------------------
-- ТАБЛИЦА subdepartments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subdepartments (
  id TEXT PRIMARY KEY, -- 'dept1_1', 'dept2_4', etc.
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  manager TEXT NOT NULL,
  description TEXT,
  vfp TEXT,
  
  -- Порядок отображения внутри департамента
  sort_order INTEGER DEFAULT 0,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT unique_code_per_department UNIQUE (department_id, code)
);

-- Индексы для subdepartments
CREATE INDEX IF NOT EXISTS idx_subdepartments_department_id ON public.subdepartments (department_id);
CREATE INDEX IF NOT EXISTS idx_subdepartments_sort_order ON public.subdepartments (department_id, sort_order);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для departments
DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггер для subdepartments
DROP TRIGGER IF EXISTS update_subdepartments_updated_at ON public.subdepartments;
CREATE TRIGGER update_subdepartments_updated_at
  BEFORE UPDATE ON public.subdepartments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Включаем RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdepartments ENABLE ROW LEVEL SECURITY;

-- Политики для departments
-- Чтение: все авторизованные пользователи
CREATE POLICY "departments_select_authenticated"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "departments_modify_admins_only"
ON public.departments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Политики для subdepartments
-- Чтение: все авторизованные пользователи
CREATE POLICY "subdepartments_select_authenticated"
ON public.subdepartments
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "subdepartments_modify_admins_only"
ON public.subdepartments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Проверка создания
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'departments'
  ) THEN
    RAISE NOTICE '✅ Таблица departments успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка создания таблицы departments';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subdepartments'
  ) THEN
    RAISE NOTICE '✅ Таблица subdepartments успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка создания таблицы subdepartments';
  END IF;
END $$;






