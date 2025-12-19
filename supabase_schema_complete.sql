-- ============================================================================
-- HR SYSTEM PRO - ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ SUPABASE
-- ============================================================================
-- Версия: 2.0.0
-- Дата: 2024
-- Описание: Полная схема с RLS, ролями, триггерами и функциями
-- ============================================================================

-- ============================================================================
-- 1. РАСШИРЕНИЯ И ТИПЫ
-- ============================================================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Типы для статистик
CREATE TYPE stat_owner_type AS ENUM ('company', 'department', 'employee');
CREATE TYPE wise_condition AS ENUM (
  'non_existence',
  'danger',
  'emergency',
  'normal',
  'affluence',
  'power',
  'power_change'
);

-- Тип для метаданных оргструктуры
CREATE TYPE org_metadata_type AS ENUM ('company', 'department', 'subdepartment');

-- ============================================================================
-- 2. ТАБЛИЦЫ
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1. СОТРУДНИКИ (employees)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Основная информация
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  nickname TEXT,
  
  -- Даты
  birth_date DATE,
  join_date DATE,
  
  -- Контакты
  email TEXT,
  email2 TEXT,
  phone TEXT,
  whatsapp TEXT,
  telegram TEXT,
  
  -- Адреса
  actual_address TEXT,
  registration_address TEXT,
  
  -- Документы
  inn TEXT,
  passport_number TEXT,
  passport_date DATE,
  passport_issuer TEXT,
  foreign_passport TEXT,
  foreign_passport_date DATE,
  foreign_passport_issuer TEXT,
  
  -- Финансы
  bank_name TEXT,
  bank_details TEXT,
  crypto_wallet TEXT,
  crypto_currency TEXT,
  crypto_network TEXT,
  
  -- Медиа
  photo_url TEXT,
  
  -- Дополнительная информация
  additional_info TEXT,
  
  -- Организационная структура (массивы ID)
  department TEXT[] DEFAULT '{}',
  subdepartment TEXT[] DEFAULT '{}',
  
  -- JSONB поля для сложных структур
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  
  -- Ограничения
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_email2 CHECK (email2 IS NULL OR email2 ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Индексы для employees
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees USING GIN (department);
CREATE INDEX IF NOT EXISTS idx_employees_subdepartment ON public.employees USING GIN (subdepartment);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON public.employees (full_name);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees (created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.2. ВЛОЖЕНИЯ СОТРУДНИКОВ (employee_attachments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT positive_file_size CHECK (file_size > 0)
);

-- Индексы для employee_attachments
CREATE INDEX IF NOT EXISTS idx_employee_attachments_employee_id ON public.employee_attachments (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_attachments_uploaded_at ON public.employee_attachments (uploaded_at DESC);

-- ----------------------------------------------------------------------------
-- 2.3. ОПРЕДЕЛЕНИЯ СТАТИСТИК (statistics_definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statistics_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  title TEXT NOT NULL,
  description TEXT,
  calculation_method TEXT,
  purpose TEXT,
  
  type stat_owner_type NOT NULL,
  owner_id TEXT, -- UUID для employee, TEXT для department/subdepartment
  
  inverted BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  is_double BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT valid_owner_id CHECK (
    (type = 'employee' AND owner_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') OR
    (type IN ('department', 'company') AND owner_id IS NOT NULL)
  )
);

-- Индексы для statistics_definitions
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_owner_id ON public.statistics_definitions (owner_id);
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_type ON public.statistics_definitions (type);
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_is_favorite ON public.statistics_definitions (is_favorite) WHERE is_favorite = TRUE;

-- ----------------------------------------------------------------------------
-- 2.4. ЗНАЧЕНИЯ СТАТИСТИК (statistics_values)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.statistics_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  definition_id UUID NOT NULL REFERENCES public.statistics_definitions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value NUMERIC(15, 2) NOT NULL,
  value2 NUMERIC(15, 2), -- Для двойных статистик
  condition wise_condition,
  notes TEXT,
  
  CONSTRAINT unique_definition_date UNIQUE (definition_id, date),
  CONSTRAINT valid_date CHECK (date <= CURRENT_DATE)
);

-- Индексы для statistics_values
CREATE INDEX IF NOT EXISTS idx_statistics_values_definition_id ON public.statistics_values (definition_id);
CREATE INDEX IF NOT EXISTS idx_statistics_values_date ON public.statistics_values (date DESC);
CREATE INDEX IF NOT EXISTS idx_statistics_values_definition_date ON public.statistics_values (definition_id, date DESC);

-- ----------------------------------------------------------------------------
-- 2.5. МЕТАДАННЫЕ ОРГСТРУКТУРЫ (org_metadata)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  type org_metadata_type NOT NULL,
  node_id TEXT NOT NULL, -- ID департамента или поддепартамента
  
  -- Метаданные в JSONB для гибкости
  content JSONB DEFAULT '{}'::jsonb,
  
  -- Часто используемые поля для быстрого доступа
  goal TEXT,
  vfp TEXT,
  manager TEXT,
  description TEXT,
  long_description TEXT,
  color TEXT,
  icon TEXT,
  
  CONSTRAINT unique_node_type UNIQUE (type, node_id)
);

-- Индексы для org_metadata
CREATE INDEX IF NOT EXISTS idx_org_metadata_type ON public.org_metadata (type);
CREATE INDEX IF NOT EXISTS idx_org_metadata_node_id ON public.org_metadata (node_id);
CREATE INDEX IF NOT EXISTS idx_org_metadata_type_node ON public.org_metadata (type, node_id);

-- ----------------------------------------------------------------------------
-- 2.6. ДЕПАРТАМЕНТЫ (departments) - для полного управления
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
-- 2.7. ПОДДЕПАРТАМЕНТЫ (subdepartments)
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

-- ============================================================================
-- 3. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ============================================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггеры для org_metadata
CREATE TRIGGER update_org_metadata_updated_at
  BEFORE UPDATE ON public.org_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггеры для departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Триггеры для subdepartments
CREATE TRIGGER update_subdepartments_updated_at
  BEFORE UPDATE ON public.subdepartments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ РОЛЯМИ
-- ============================================================================

-- Функция для проверки, является ли пользователь администратором
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения текущего пользователя ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subdepartments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5.1. ПОЛИТИКИ ДЛЯ employees
-- ----------------------------------------------------------------------------

-- Чтение: все авторизованные пользователи
CREATE POLICY "employees_select_authenticated"
ON public.employees
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "employees_modify_admins_only"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.2. ПОЛИТИКИ ДЛЯ employee_attachments
-- ----------------------------------------------------------------------------

-- Чтение: все авторизованные пользователи
CREATE POLICY "employee_attachments_select_authenticated"
ON public.employee_attachments
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "employee_attachments_modify_admins_only"
ON public.employee_attachments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.3. ПОЛИТИКИ ДЛЯ statistics_definitions
-- ----------------------------------------------------------------------------

-- Чтение: все авторизованные пользователи
CREATE POLICY "statistics_definitions_select_authenticated"
ON public.statistics_definitions
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "statistics_definitions_modify_admins_only"
ON public.statistics_definitions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.4. ПОЛИТИКИ ДЛЯ statistics_values
-- ----------------------------------------------------------------------------

-- Чтение: все авторизованные пользователи
CREATE POLICY "statistics_values_select_authenticated"
ON public.statistics_values
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "statistics_values_modify_admins_only"
ON public.statistics_values
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.5. ПОЛИТИКИ ДЛЯ org_metadata
-- ----------------------------------------------------------------------------

-- Чтение: все авторизованные пользователи
CREATE POLICY "org_metadata_select_authenticated"
ON public.org_metadata
FOR SELECT
TO authenticated
USING (true);

-- Вставка/Обновление/Удаление: только администраторы
CREATE POLICY "org_metadata_modify_admins_only"
ON public.org_metadata
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5.6. ПОЛИТИКИ ДЛЯ departments
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 5.7. ПОЛИТИКИ ДЛЯ subdepartments
-- ----------------------------------------------------------------------------

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

-- ============================================================================
-- 6. STORAGE BUCKETS ДЛЯ ФАЙЛОВ
-- ============================================================================

-- Создаем bucket для фотографий сотрудников
-- Используем имя 'employee-files' для совместимости с кодом
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-files', 
  'employee-files', 
  true,
  5242880, -- 5MB лимит для фотографий
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Создаем bucket для документов сотрудников
-- Используем имя 'employee-docs' для совместимости с кодом
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-docs', 
  'employee-docs', 
  true,
  10485760, -- 10MB лимит для документов
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Политики для employee-files (фотографии)
CREATE POLICY "employee_files_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-files');

CREATE POLICY "employee_files_insert_admins_only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-files' AND
  public.is_admin()
);

CREATE POLICY "employee_files_update_admins_only"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-files' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'employee-files' AND
  public.is_admin()
);

CREATE POLICY "employee_files_delete_admins_only"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-files' AND
  public.is_admin()
);

-- Политики для employee-docs (документы)
CREATE POLICY "employee_docs_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-docs');

CREATE POLICY "employee_docs_insert_admins_only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-docs' AND
  public.is_admin()
);

CREATE POLICY "employee_docs_update_admins_only"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-docs' AND
  public.is_admin()
)
WITH CHECK (
  bucket_id = 'employee-docs' AND
  public.is_admin()
);

CREATE POLICY "employee_docs_delete_admins_only"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-docs' AND
  public.is_admin()
);

-- ============================================================================
-- 7. ФУНКЦИИ ДЛЯ РАБОТЫ С ОРГСТРУКТУРОЙ
-- ----------------------------------------------------------------------------

-- Функция для получения полной оргструктуры
CREATE OR REPLACE FUNCTION public.get_full_org_structure()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'departments', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'full_name', d.full_name,
          'color', d.color,
          'icon', d.icon,
          'description', d.description,
          'long_description', d.long_description,
          'functions', d.functions,
          'trouble_signs', d.trouble_signs,
          'development_actions', d.development_actions,
          'manager', d.manager,
          'goal', d.goal,
          'vfp', d.vfp,
          'main_stat', d.main_stat,
          'sort_order', d.sort_order,
          'subdepartments', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'code', s.code,
                'manager', s.manager,
                'description', s.description,
                'vfp', s.vfp,
                'sort_order', s.sort_order
              ) ORDER BY s.sort_order
            )
            FROM public.subdepartments s
            WHERE s.department_id = d.id
          )
        ) ORDER BY d.sort_order
      )
      FROM public.departments d
    ),
    'company_metadata', (
      SELECT content
      FROM public.org_metadata
      WHERE type = 'company' AND node_id = 'owner'
      LIMIT 1
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для обновления метаданных департамента
CREATE OR REPLACE FUNCTION public.update_department_metadata(
  p_node_id TEXT,
  p_content JSONB,
  p_goal TEXT DEFAULT NULL,
  p_vfp TEXT DEFAULT NULL,
  p_manager TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.org_metadata (type, node_id, content, goal, vfp, manager)
  VALUES ('department', p_node_id, p_content, p_goal, p_vfp, p_manager)
  ON CONFLICT (type, node_id)
  DO UPDATE SET
    content = EXCLUDED.content,
    goal = COALESCE(EXCLUDED.goal, org_metadata.goal),
    vfp = COALESCE(EXCLUDED.vfp, org_metadata.vfp),
    manager = COALESCE(EXCLUDED.manager, org_metadata.manager),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ФУНКЦИИ ДЛЯ РАБОТЫ С ФАЙЛАМИ
-- ============================================================================

-- Функция для удаления файла из storage при удалении attachment
-- ВАЖНО: Эта функция вызывается через триггер, но фактическое удаление
-- должно происходить через Supabase Storage API на клиенте
-- Здесь мы только логируем информацию для отладки
CREATE OR REPLACE FUNCTION public.delete_attachment_file()
RETURNS TRIGGER AS $$
DECLARE
  bucket_name TEXT;
  file_path TEXT;
BEGIN
  -- Определяем bucket по пути файла
  IF OLD.storage_path LIKE 'photos/%' THEN
    bucket_name := 'employee-files';
  ELSIF OLD.storage_path LIKE 'documents/%' THEN
    bucket_name := 'employee-docs';
  ELSE
    -- Пытаемся определить по началу пути
    IF OLD.storage_path LIKE '%photos%' THEN
      bucket_name := 'employee-files';
    ELSE
      bucket_name := 'employee-docs';
    END IF;
  END IF;
  
  file_path := OLD.storage_path;
  
  -- Логируем информацию о файле для удаления
  -- Фактическое удаление происходит на клиенте через useFileUpload.deleteFile()
  -- Это необходимо, так как Supabase Storage API требует аутентификации
  RAISE NOTICE 'File to delete: bucket=%, path=%', bucket_name, file_path;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического удаления файлов при удалении attachment
CREATE TRIGGER delete_file_on_attachment_delete
  AFTER DELETE ON public.employee_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_attachment_file();

-- Функция для поиска orphaned файлов (файлы без записей в БД)
-- ВАЖНО: Эта функция только находит файлы, удаление должно происходить
-- через Supabase Storage API на клиенте или через Dashboard
CREATE OR REPLACE FUNCTION public.find_orphaned_files()
RETURNS TABLE(
  bucket_id TEXT,
  file_path TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Находим файлы в employee-files без записей
  RETURN QUERY
  SELECT 
    o.bucket_id,
    o.name AS file_path,
    o.metadata->>'size'::BIGINT AS file_size,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'employee-files'
    AND o.name NOT IN (
      SELECT storage_path
      FROM public.employee_attachments
      WHERE storage_path = o.name
    )
    AND o.name NOT IN (
      SELECT SUBSTRING(photo_url FROM 'photos/[^/]+/[^"]+')
      FROM public.employees
      WHERE photo_url LIKE '%' || o.name || '%'
    );
  
  -- Находим файлы в employee-docs без записей
  RETURN QUERY
  SELECT 
    o.bucket_id,
    o.name AS file_path,
    (o.metadata->>'size')::BIGINT AS file_size,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'employee-docs'
    AND o.name NOT IN (
      SELECT storage_path
      FROM public.employee_attachments
      WHERE storage_path = o.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения размера всех файлов сотрудника
CREATE OR REPLACE FUNCTION public.get_employee_files_size(p_employee_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_size BIGINT := 0;
BEGIN
  SELECT COALESCE(SUM(file_size), 0)
  INTO total_size
  FROM public.employee_attachments
  WHERE employee_id = p_employee_id;
  
  RETURN total_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для валидации размера файла перед загрузкой
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  p_bucket_id TEXT,
  p_file_size BIGINT,
  p_mime_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  bucket_limit BIGINT;
  allowed_types TEXT[];
BEGIN
  -- Получаем лимиты bucket'а
  SELECT file_size_limit, allowed_mime_types
  INTO bucket_limit, allowed_types
  FROM storage.buckets
  WHERE id = p_bucket_id;
  
  -- Проверяем размер
  IF bucket_limit IS NOT NULL AND p_file_size > bucket_limit THEN
    RAISE EXCEPTION 'File size % exceeds limit of % bytes', p_file_size, bucket_limit;
  END IF;
  
  -- Проверяем MIME type (если указан)
  IF allowed_types IS NOT NULL AND array_length(allowed_types, 1) > 0 THEN
    IF NOT (p_mime_type = ANY(allowed_types)) THEN
      RAISE EXCEPTION 'File type % is not allowed. Allowed types: %', p_mime_type, array_to_string(allowed_types, ', ');
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ИНИЦИАЛИЗАЦИЯ БАЗОВЫХ ДАННЫХ (опционально)
-- ============================================================================

-- Можно добавить начальные данные для департаментов из constants.ts
-- Это можно сделать через миграцию или вручную через Supabase Dashboard

-- ============================================================================
-- КОНЕЦ СХЕМЫ
-- ============================================================================

-- Комментарии для документации
COMMENT ON TABLE public.employees IS 'Основная таблица сотрудников';
COMMENT ON TABLE public.employee_attachments IS 'Вложения и документы сотрудников';
COMMENT ON TABLE public.statistics_definitions IS 'Определения статистик и KPI';
COMMENT ON TABLE public.statistics_values IS 'Значения статистик по датам';
COMMENT ON TABLE public.org_metadata IS 'Метаданные организационной структуры';
COMMENT ON TABLE public.departments IS 'Департаменты организации';
COMMENT ON TABLE public.subdepartments IS 'Поддепартаменты и отделы';

COMMENT ON FUNCTION public.is_admin() IS 'Проверка прав администратора';
COMMENT ON FUNCTION public.get_full_org_structure() IS 'Получение полной оргструктуры в JSON';
COMMENT ON FUNCTION public.update_department_metadata() IS 'Обновление метаданных департамента';
COMMENT ON FUNCTION public.delete_attachment_file() IS 'Триггер для логирования удаления файлов (удаление происходит на клиенте)';
COMMENT ON FUNCTION public.find_orphaned_files() IS 'Поиск файлов без записей в БД';
COMMENT ON FUNCTION public.get_employee_files_size() IS 'Получение общего размера файлов сотрудника';
COMMENT ON FUNCTION public.validate_file_upload() IS 'Валидация размера и типа файла перед загрузкой';

