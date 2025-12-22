-- Создание таблицы для полученных документов (загруженных HR)
-- Документы, которые HR получает и загружает в систему для хранения

-- Включаем расширение uuid-ossp, если оно еще не включено
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Функция is_admin() для RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Таблица полученных документов
CREATE TABLE IF NOT EXISTS received_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL, -- Название документа
  document_type VARCHAR(50) NOT NULL, -- 'zrs', 'contract', 'order', 'certificate', 'other'
  file_name VARCHAR(500) NOT NULL, -- Имя файла
  file_path TEXT NOT NULL, -- Путь к файлу в Storage
  file_url TEXT, -- Публичный URL файла
  file_size BIGINT, -- Размер файла в байтах
  mime_type VARCHAR(100), -- MIME тип файла
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Связанный сотрудник (если есть)
  sender_name VARCHAR(500), -- От кого получен документ (ФИО и должность)
  sender_email VARCHAR(255), -- Email отправителя (если есть)
  received_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Дата получения документа
  status VARCHAR(20) DEFAULT 'received', -- 'received', 'reviewed', 'archived', 'rejected'
  description TEXT, -- Описание/комментарий к документу
  signatures JSONB DEFAULT '[]'::jsonb, -- Массив подписей: [{signer_name, signer_position, signed_at, signature_type}]
  approvals JSONB DEFAULT '[]'::jsonb, -- Массив одобрений: [{approver_name, approver_position, approved_at, comment}]
  tags TEXT[], -- Теги для поиска и категоризации
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL, -- Кто загрузил документ (HR)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_received_documents_type ON received_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_received_documents_employee_id ON received_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_received_documents_status ON received_documents(status);
CREATE INDEX IF NOT EXISTS idx_received_documents_received_date ON received_documents(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_received_documents_created_at ON received_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_received_documents_tags ON received_documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_received_documents_created_by ON received_documents(created_by);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_received_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_received_documents_updated_at_trigger ON received_documents;
CREATE TRIGGER update_received_documents_updated_at_trigger
  BEFORE UPDATE ON received_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_received_documents_updated_at();

-- RLS политики
ALTER TABLE received_documents ENABLE ROW LEVEL SECURITY;

-- Удаляем политики, если они существуют
DROP POLICY IF EXISTS "Admins can manage all received documents" ON received_documents;
DROP POLICY IF EXISTS "Authenticated users can read received documents" ON received_documents;
DROP POLICY IF EXISTS "Admins can create received documents" ON received_documents;
DROP POLICY IF EXISTS "Admins can update received documents" ON received_documents;
DROP POLICY IF EXISTS "Admins can delete received documents" ON received_documents;

-- Политики для received_documents
CREATE POLICY "Admins can manage all received documents"
  ON received_documents
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can read received documents"
  ON received_documents
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can create received documents"
  ON received_documents
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

CREATE POLICY "Admins can update received documents"
  ON received_documents
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

CREATE POLICY "Admins can delete received documents"
  ON received_documents
  FOR DELETE
  USING (auth.role() = 'authenticated' AND public.is_admin());

-- Комментарии к таблице
COMMENT ON TABLE received_documents IS 'Полученные документы, загруженные HR для хранения';
COMMENT ON COLUMN received_documents.document_type IS 'Тип документа: zrs, contract, order, certificate, other';
COMMENT ON COLUMN received_documents.status IS 'Статус: received, reviewed, archived, rejected';
COMMENT ON COLUMN received_documents.signatures IS 'JSONB массив подписей: [{signer_name, signer_position, signed_at, signature_type}]';
COMMENT ON COLUMN received_documents.approvals IS 'JSONB массив одобрений: [{approver_name, approver_position, approved_at, comment}]';
COMMENT ON COLUMN received_documents.tags IS 'Массив тегов для поиска и категоризации';


