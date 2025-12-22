-- Создание таблицы для ЗРС (Завершенная Работа Сотрудника)

-- Включаем расширение uuid-ossp, если оно еще не включено
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Функция is_admin() для RLS
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

-- 1. Таблица ЗРС
CREATE TABLE IF NOT EXISTS zrs_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  to_whom VARCHAR(500) NOT NULL, -- Кому (должность и ФИО)
  from_whom VARCHAR(500) NOT NULL, -- От кого (должность и ФИО)
  situation TEXT NOT NULL, -- Ситуация
  data TEXT NOT NULL, -- Данные
  solution TEXT NOT NULL, -- Решение
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_approval', 'approved', 'rejected'
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT, -- Причина отклонения (если rejected)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_zrs_documents_employee_id ON zrs_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_zrs_documents_to_whom ON zrs_documents(to_whom);
CREATE INDEX IF NOT EXISTS idx_zrs_documents_status ON zrs_documents(status);
CREATE INDEX IF NOT EXISTS idx_zrs_documents_created_at ON zrs_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zrs_documents_approved_by ON zrs_documents(approved_by);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_zrs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем триггер, если он уже существует
DROP TRIGGER IF EXISTS update_zrs_documents_updated_at ON zrs_documents;
CREATE TRIGGER update_zrs_documents_updated_at
  BEFORE UPDATE ON zrs_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_zrs_updated_at();

-- RLS политики
ALTER TABLE zrs_documents ENABLE ROW LEVEL SECURITY;

-- Политики для zrs_documents (удаляем старые, если существуют)
DROP POLICY IF EXISTS "Admins can manage all ZRS documents" ON zrs_documents;
CREATE POLICY "Admins can manage all ZRS documents"
  ON zrs_documents
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read their own ZRS documents" ON zrs_documents;
CREATE POLICY "Users can read their own ZRS documents"
  ON zrs_documents
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      to_whom ILIKE '%' || (SELECT full_name FROM employees WHERE email = auth.email()) || '%' OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can create their own ZRS documents" ON zrs_documents;
CREATE POLICY "Users can create their own ZRS documents"
  ON zrs_documents
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can update their own ZRS documents" ON zrs_documents;
CREATE POLICY "Users can update their own ZRS documents"
  ON zrs_documents
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

DROP POLICY IF EXISTS "Users can delete their own ZRS documents" ON zrs_documents;
CREATE POLICY "Users can delete their own ZRS documents"
  ON zrs_documents
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- Комментарии к таблице
COMMENT ON TABLE zrs_documents IS 'Завершенная Работа Сотрудника (ЗРС) - структурированные запросы на одобрение';
COMMENT ON COLUMN zrs_documents.to_whom IS 'Кому отправлен ЗРС (должность и ФИО)';
COMMENT ON COLUMN zrs_documents.from_whom IS 'От кого отправлен ЗРС (должность и ФИО)';
COMMENT ON COLUMN zrs_documents.situation IS 'Ситуация - краткое описание проблемы или задачи';
COMMENT ON COLUMN zrs_documents.data IS 'Данные - вся необходимая информация для принятия решения';
COMMENT ON COLUMN zrs_documents.solution IS 'Решение - предложенный план действий';
COMMENT ON COLUMN zrs_documents.status IS 'Статус: draft, pending_approval, approved, rejected';

