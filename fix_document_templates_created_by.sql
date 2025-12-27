-- Исправление: добавление колонки created_by в таблицу document_templates
-- если она отсутствует

-- Проверяем и добавляем колонку created_by, если она отсутствует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'document_templates' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.document_templates 
      ADD COLUMN created_by UUID REFERENCES employees(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Колонка created_by добавлена в document_templates.';
  ELSE
    RAISE NOTICE 'ℹ️ Колонка created_by уже существует в document_templates.';
  END IF;
END $$;

-- Проверяем результат
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'document_templates'
  AND column_name = 'created_by';



