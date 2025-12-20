-- Исправление проблемы с сохранением токенов интеграций
-- Проблема: token_encrypted имеет NOT NULL, но для Slack может быть пустым

-- 0. Проверяем и добавляем колонку webhook_url если её нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'integration_tokens' 
      AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE public.integration_tokens 
      ADD COLUMN webhook_url TEXT;
    RAISE NOTICE 'Колонка webhook_url добавлена';
  ELSE
    RAISE NOTICE 'Колонка webhook_url уже существует';
  END IF;
END $$;

-- 1. Изменяем constraint для token_encrypted, чтобы разрешить NULL
-- (для Slack webhook_url может быть заполнен, а token_encrypted пустым)
ALTER TABLE public.integration_tokens 
  ALTER COLUMN token_encrypted DROP NOT NULL;

-- 2. Добавляем CHECK constraint для валидации:
-- - Если integration_type = 'slack', то webhook_url должен быть заполнен
-- - Если integration_type = 'telegram', то token_encrypted должен быть заполнен
-- (раскомментируйте если нужно)
-- ALTER TABLE public.integration_tokens
--   ADD CONSTRAINT check_token_or_webhook CHECK (
--     (integration_type = 'slack' AND webhook_url IS NOT NULL) OR
--     (integration_type != 'slack' AND token_encrypted IS NOT NULL)
--   );

-- 3. Проверяем текущие данные
SELECT 
  integration_type,
  COUNT(*) as count,
  COUNT(CASE WHEN token_encrypted IS NULL THEN 1 END) as null_tokens,
  COUNT(CASE WHEN token_encrypted = '' THEN 1 END) as empty_tokens,
  COUNT(CASE WHEN webhook_url IS NOT NULL THEN 1 END) as has_webhook
FROM integration_tokens
GROUP BY integration_type;

-- 4. Обновляем пустые строки на NULL (если есть)
UPDATE public.integration_tokens
SET token_encrypted = NULL
WHERE token_encrypted = '';

-- 5. Проверяем constraint UNIQUE
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
  AND table_name = 'integration_tokens'
  AND constraint_type = 'UNIQUE';

-- 6. Проверяем RLS политики
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'integration_tokens';

