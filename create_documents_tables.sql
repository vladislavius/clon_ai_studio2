-- Создание таблиц для системы документооборота

-- 1. Таблица шаблонов документов
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'contract', 'order', 'certificate', 'other'
  content TEXT NOT NULL, -- HTML или Markdown с переменными {{variable_name}}
  variables JSONB DEFAULT '[]'::jsonb, -- Массив переменных для подстановки
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL
);

-- 2. Таблица документов
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_signature', 'signed', 'archived', 'rejected'
  file_url TEXT,
  file_path TEXT, -- Путь к файлу в storage
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- 3. Таблица подписей документов
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 изображение подписи или данные ЭЦП
  signature_type VARCHAR(20) DEFAULT 'image', -- 'image', 'digital', 'stamp'
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  comment TEXT,
  order_index INTEGER DEFAULT 0 -- Порядок подписания
);

-- Добавляем колонку signature_type, если она отсутствует (для существующих таблиц)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_signatures' 
    AND column_name = 'signature_type'
  ) THEN
    ALTER TABLE document_signatures 
    ADD COLUMN signature_type VARCHAR(20) DEFAULT 'image';
    RAISE NOTICE '✅ Колонка signature_type добавлена в document_signatures.';
  END IF;
END $$;

-- 4. Таблица workflow подписания (кто должен подписать)
CREATE TABLE IF NOT EXISTS document_signature_workflow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(50), -- 'employee', 'manager', 'hr', 'director'
  required BOOLEAN DEFAULT TRUE, -- Обязательная подпись
  order_index INTEGER DEFAULT 0, -- Порядок подписания
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'signed', 'rejected', 'skipped'
  notified_at TIMESTAMPTZ, -- Когда было отправлено уведомление
  notified_count INTEGER DEFAULT 0, -- Количество отправленных уведомлений
  deadline TIMESTAMPTZ, -- Срок подписания
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_id ON document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signature_workflow_document_id ON document_signature_workflow(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signature_workflow_signer_id ON document_signature_workflow(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signature_workflow_status ON document_signature_workflow(status);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
-- Удаляем триггеры, если они уже существуют
DROP TRIGGER IF EXISTS update_document_templates_updated_at ON document_templates;
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Функция для автоматического обновления статуса документа при подписании
CREATE OR REPLACE FUNCTION update_document_status_on_signature()
RETURNS TRIGGER AS $$
DECLARE
  total_signers INTEGER;
  signed_count INTEGER;
  required_signed_count INTEGER;
BEGIN
  -- Подсчитываем общее количество подписантов
  SELECT COUNT(*), COUNT(*) FILTER (WHERE required = TRUE)
  INTO total_signers, required_signed_count
  FROM document_signature_workflow
  WHERE document_id = NEW.document_id;
  
  -- Подсчитываем количество подписанных
  SELECT COUNT(*)
  INTO signed_count
  FROM document_signature_workflow
  WHERE document_id = NEW.document_id
    AND status = 'signed';
  
  -- Если все обязательные подписи получены, документ считается подписанным
  IF signed_count >= required_signed_count AND required_signed_count > 0 THEN
    UPDATE documents
    SET status = 'signed', signed_at = NOW()
    WHERE id = NEW.document_id
      AND status != 'signed';
  ELSIF signed_count > 0 THEN
    UPDATE documents
    SET status = 'pending_signature'
    WHERE id = NEW.document_id
      AND status = 'draft';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления статуса при изменении workflow
-- Удаляем триггер, если он уже существует
DROP TRIGGER IF EXISTS update_document_status_on_workflow_change ON document_signature_workflow;
CREATE TRIGGER update_document_status_on_workflow_change
  AFTER INSERT OR UPDATE ON document_signature_workflow
  FOR EACH ROW
  WHEN (NEW.status = 'signed')
  EXECUTE FUNCTION update_document_status_on_signature();

-- RLS политики для безопасности
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signature_workflow ENABLE ROW LEVEL SECURITY;

-- Политики для document_templates (только админы могут управлять)
-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "Admins can manage document templates" ON document_templates;
CREATE POLICY "Admins can manage document templates"
  ON document_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read document templates" ON document_templates;
CREATE POLICY "Authenticated users can read document templates"
  ON document_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Политики для documents
-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
CREATE POLICY "Admins can manage all documents"
  ON documents
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read their own documents" ON documents;
CREATE POLICY "Users can read their own documents"
  ON documents
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      employee_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      created_by IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents"
  ON documents
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

DROP POLICY IF EXISTS "Users can update their own documents" ON documents;
CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      created_by IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      created_by IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- Политики для document_signatures
-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "Admins can manage all signatures" ON document_signatures;
CREATE POLICY "Admins can manage all signatures"
  ON document_signatures
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read signatures for their documents" ON document_signatures;
CREATE POLICY "Users can read signatures for their documents"
  ON document_signatures
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      document_id IN (
        SELECT id FROM documents 
        WHERE employee_id IN (
          SELECT id FROM employees WHERE email = auth.email()
        ) OR created_by IN (
          SELECT id FROM employees WHERE email = auth.email()
        )
      ) OR
      signer_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can sign documents assigned to them" ON document_signatures;
CREATE POLICY "Users can sign documents assigned to them"
  ON document_signatures
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      signer_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- Политики для document_signature_workflow
-- Удаляем политики, если они уже существуют
DROP POLICY IF EXISTS "Admins can manage workflow" ON document_signature_workflow;
CREATE POLICY "Admins can manage workflow"
  ON document_signature_workflow
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read workflow for their documents" ON document_signature_workflow;
CREATE POLICY "Users can read workflow for their documents"
  ON document_signature_workflow
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      document_id IN (
        SELECT id FROM documents 
        WHERE employee_id IN (
          SELECT id FROM employees WHERE email = auth.email()
        ) OR created_by IN (
          SELECT id FROM employees WHERE email = auth.email()
        )
      ) OR
      signer_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can update their own workflow status" ON document_signature_workflow;
CREATE POLICY "Users can update their own workflow status"
  ON document_signature_workflow
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      signer_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      signer_id IN (
        SELECT id FROM employees WHERE email = auth.email()
      ) OR
      public.is_admin()
    )
  );

-- Комментарии к таблицам
COMMENT ON TABLE document_templates IS 'Шаблоны документов для генерации';
COMMENT ON TABLE documents IS 'Сгенерированные документы';
COMMENT ON TABLE document_signatures IS 'Подписи документов';
COMMENT ON TABLE document_signature_workflow IS 'Workflow подписания документов';

COMMENT ON COLUMN document_templates.type IS 'Тип документа: contract, order, certificate, other';
COMMENT ON COLUMN documents.status IS 'Статус: draft, pending_signature, signed, archived, rejected';
COMMENT ON COLUMN document_signatures.signature_type IS 'Тип подписи: image, digital, stamp';
COMMENT ON COLUMN document_signature_workflow.role IS 'Роль подписанта: employee, manager, hr, director';

