# Инструкция по созданию таблиц онбординга

## Проблема
В консоли браузера появляется ошибка:
```
Failed to load resource: the server responded with a status of 400 ()
Таблица onboarding_instances не существует
```

## Решение

1. Откройте Supabase Dashboard: https://supabase.assisthelp.ru
2. Перейдите в раздел **SQL Editor**
3. Откройте файл `create_onboarding_tables.sql` из проекта
4. Скопируйте весь содержимое файла
5. Вставьте в SQL Editor в Supabase
6. Нажмите **Run** (или `Ctrl+Enter`)

## Проверка

После выполнения скрипта проверьте, что таблицы созданы:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('onboarding_templates', 'onboarding_instances', 'onboarding_tasks');
```

Должны вернуться 3 строки.

## Если возникают ошибки

### Ошибка: "policy already exists"
- Это нормально, скрипт использует `DROP POLICY IF EXISTS`, поэтому можно выполнять повторно

### Ошибка: "trigger already exists"
- Это нормально, скрипт использует `DROP TRIGGER IF EXISTS`, поэтому можно выполнять повторно

### Ошибка: "function already exists"
- Это нормально, скрипт использует `CREATE OR REPLACE FUNCTION`, поэтому можно выполнять повторно

## После выполнения

1. **ВАЖНО: Обновите кеш схемы Supabase!**
   - Выполните скрипт `refresh_schema_cache.sql` в SQL Editor
   - ИЛИ перейдите в Settings → API → найдите кнопку "Reload schema cache"
   - Подождите 5-10 секунд после обновления кеша

2. Обновите страницу приложения (F5 или Ctrl+R)

3. Ошибка 400 должна исчезнуть

4. Вкладка "Онбординг" должна работать корректно

## ⚠️ Если таблица создана, но приложение её не видит

Это проблема с кешем схемы PostgREST. См. подробную инструкцию в файле `TROUBLESHOOT_ONBOARDING_TABLES.md`

