-- ============================================================================
-- СОЗДАНИЕ ТАБЛИЦЫ ДЛЯ БЕЗОПАСНОГО ХРАНЕНИЯ ТОКЕНОВ ИНТЕГРАЦИЙ
-- ============================================================================
-- Эта таблица хранит токены для интеграций (Telegram, Slack и т.д.)
-- на сервере, а не в localStorage клиента
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

-- Создаем таблицу для токенов интеграций
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('telegram', 'slack', 'email', 'other')),
  token_encrypted TEXT NOT NULL, -- Зашифрованный токен (в будущем можно добавить реальное шифрование)
  webhook_url TEXT, -- URL для webhook (если применимо)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Создаем индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_integration_tokens_user_id 
ON public.integration_tokens(user_id);

-- Создаем индекс для поиска по типу интеграции
CREATE INDEX IF NOT EXISTS idx_integration_tokens_type 
ON public.integration_tokens(integration_type);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_integration_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_integration_tokens_updated_at ON public.integration_tokens;
CREATE TRIGGER update_integration_tokens_updated_at
  BEFORE UPDATE ON public.integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_integration_tokens_updated_at();

-- Включаем RLS
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои токены
CREATE POLICY "users_own_tokens_select"
ON public.integration_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Политика: пользователи могут создавать только свои токены
CREATE POLICY "users_own_tokens_insert"
ON public.integration_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут обновлять только свои токены
CREATE POLICY "users_own_tokens_update"
ON public.integration_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Политика: пользователи могут удалять только свои токены
CREATE POLICY "users_own_tokens_delete"
ON public.integration_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Политика: администраторы могут видеть все токены (для управления)
CREATE POLICY "admins_all_tokens"
ON public.integration_tokens
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Комментарии для документации
COMMENT ON TABLE public.integration_tokens IS 'Хранит токены для интеграций (Telegram, Slack и т.д.)';
COMMENT ON COLUMN public.integration_tokens.token_encrypted IS 'Зашифрованный токен. В будущем можно добавить реальное шифрование на сервере.';
COMMENT ON COLUMN public.integration_tokens.integration_type IS 'Тип интеграции: telegram, slack, email, other';

-- Проверка создания таблицы
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'integration_tokens'
  ) THEN
    RAISE NOTICE '✅ Таблица integration_tokens успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка создания таблицы integration_tokens';
  END IF;
END $$;

