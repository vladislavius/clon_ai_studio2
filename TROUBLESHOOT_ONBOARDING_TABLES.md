# Устранение проблем с таблицами онбординга

## Проблема: Таблица создана, но приложение её не видит (ошибка 400)

### Возможные причины:

1. **Кеш схемы Supabase (PostgREST)** - самая частая причина
2. **RLS политики блокируют доступ**
3. **Таблица создана в другой схеме**
4. **Отсутствуют необходимые политики**

---

## Решение 1: Обновление кеша схемы Supabase

Supabase (PostgREST) кеширует схему базы данных. После создания таблиц нужно обновить кеш:

### Вариант A: Через Supabase Dashboard (рекомендуется)

1. Откройте **Supabase Dashboard**: https://supabase.assisthelp.ru
2. Перейдите в **Settings** → **API**
3. Найдите раздел **"Reload schema cache"** или **"Refresh schema"**
4. Нажмите кнопку обновления

### Вариант B: Через SQL (если есть доступ)

Выполните в SQL Editor:

```sql
-- Обновление кеша схемы PostgREST
NOTIFY pgrst, 'reload schema';
```

### Вариант C: Перезапуск проекта Supabase

Если у вас есть доступ к настройкам проекта, можно перезапустить PostgREST сервис.

---

## Решение 2: Проверка существования таблиц

Выполните скрипт `check_onboarding_tables.sql` в SQL Editor Supabase:

1. Откройте **SQL Editor** в Supabase
2. Скопируйте содержимое файла `check_onboarding_tables.sql`
3. Выполните скрипт
4. Проверьте результаты:
   - Должны вернуться 3 таблицы: `onboarding_templates`, `onboarding_instances`, `onboarding_tasks`
   - Должны быть видны все колонки
   - Должны быть RLS политики

---

## Решение 3: Повторное выполнение скрипта создания

Если таблицы не найдены, выполните скрипт `create_onboarding_tables.sql` еще раз:

1. Откройте **SQL Editor** в Supabase
2. Скопируйте содержимое файла `create_onboarding_tables.sql`
3. Выполните скрипт
4. Проверьте, что нет ошибок
5. Обновите кеш схемы (см. Решение 1)

---

## Решение 4: Проверка RLS политик

Если таблицы существуют, но доступ блокируется, проверьте RLS:

```sql
-- Проверка включен ли RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');

-- Проверка политик
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');
```

Если политик нет или они неправильные, выполните скрипт `create_onboarding_tables.sql` еще раз.

---

## Решение 5: Временное отключение RLS (только для тестирования)

⚠️ **ВНИМАНИЕ:** Это только для диагностики! Не используйте в продакшене!

```sql
-- Временно отключить RLS для проверки
ALTER TABLE onboarding_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks DISABLE ROW LEVEL SECURITY;

-- Проверьте, работает ли доступ
-- Затем ВКЛЮЧИТЕ обратно:
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
```

---

## Решение 6: Проверка схемы

Убедитесь, что таблицы созданы в схеме `public`:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');
```

Должно быть:
- `table_schema = 'public'`
- Все 3 таблицы должны быть видны

---

## После исправления:

1. **Обновите кеш схемы** (см. Решение 1)
2. **Обновите страницу приложения** (F5 или Ctrl+R)
3. **Проверьте консоль браузера** - ошибка 400 должна исчезнуть
4. **Попробуйте создать шаблон онбординга** - должно работать

---

## Если ничего не помогло:

1. Проверьте логи Supabase в Dashboard → Logs
2. Убедитесь, что вы авторизованы как администратор
3. Проверьте, что функция `is_admin()` работает корректно:

```sql
-- Проверка функции is_admin
SELECT public.is_admin();
```

Если возвращает ошибку, выполните:

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.employees WHERE email = auth.email() AND is_admin = TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```


