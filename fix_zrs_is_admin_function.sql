-- ИСПРАВЛЕНИЕ ФУНКЦИИ is_admin() ДЛЯ ТАБЛИЦЫ zrs_documents
-- Проблема: функция пытается обратиться к несуществующей колонке is_admin в таблице employees
-- Решение: используем проверку через JWT токен (app_metadata или user_metadata)

-- ВАЖНО: используем CREATE OR REPLACE, а не DROP, т.к. функция используется в RLS политиках
-- Создаем правильную функцию (заменяет старую без удаления зависимостей)
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

-- Проверяем, что функция работает
DO $$
BEGIN
  -- Пытаемся вызвать функцию (не должно быть ошибки)
  PERFORM public.is_admin();
  RAISE NOTICE '✅ Функция is_admin() исправлена и работает!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Ошибка в функции is_admin(): %', SQLERRM;
END $$;

-- Обновляем кеш схемы
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✅ Кеш схемы обновлен! Подождите 10-15 секунд.';
END $$;



