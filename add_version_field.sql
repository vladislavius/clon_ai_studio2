-- =====================================================
-- Миграция: Добавление поля version для Optimistic Locking
-- =====================================================
-- Этот скрипт добавляет поле version в таблицу employees
-- для предотвращения конфликтов при одновременном редактировании
--
-- ВАЖНО: Выполнить в Supabase SQL Editor ПОСЛЕ setup_rls_policies.sql
-- =====================================================

-- =====================================================
-- 1. Добавление колонки version
-- =====================================================

-- Проверяем, существует ли уже колонка
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'version'
  ) THEN
    -- Добавляем колонку version с значением по умолчанию 1
    ALTER TABLE employees 
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    
    RAISE NOTICE 'Column "version" added to employees table';
  ELSE
    RAISE NOTICE 'Column "version" already exists in employees table';
  END IF;
END $$;

-- =====================================================
-- 2. Обновление существующих записей
-- =====================================================

-- Устанавливаем версию 1 для всех существующих записей
UPDATE employees 
SET version = 1 
WHERE version IS NULL OR version = 0;

-- =====================================================
-- 3. Создание функции для автоинкремента версии
-- =====================================================

-- Функция, которая автоматически увеличивает версию при обновлении
CREATE OR REPLACE FUNCTION increment_employee_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Увеличиваем версию на 1 при каждом обновлении
  NEW.version = OLD.version + 1;
  
  -- Обновляем updated_at
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_employee_version() IS 'Автоматически увеличивает версию записи сотрудника при обновлении';

-- =====================================================
-- 4. Создание триггера для автоинкремента
-- =====================================================

-- Удаляем триггер если существует
DROP TRIGGER IF EXISTS trigger_increment_employee_version ON employees;

-- Создаем триггер, который срабатывает ПЕРЕД обновлением
CREATE TRIGGER trigger_increment_employee_version
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION increment_employee_version();

COMMENT ON TRIGGER trigger_increment_employee_version ON employees IS 
'Триггер для автоматического увеличения версии при обновлении записи сотрудника';

-- =====================================================
-- 5. Создание индекса для оптимизации
-- =====================================================

-- Создаем индекс для быстрого поиска по id и version (для optimistic locking)
CREATE INDEX IF NOT EXISTS idx_employees_id_version 
ON employees(id, version);

-- =====================================================
-- 6. Проверка миграции
-- =====================================================

-- Проверяем структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
AND column_name IN ('version', 'updated_at')
ORDER BY ordinal_position;

-- Проверяем, что триггер создан
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_increment_employee_version';

-- Статистика по версиям (для проверки)
SELECT 
  version,
  COUNT(*) as count
FROM employees
GROUP BY version
ORDER BY version;

-- =====================================================
-- 7. Тестирование optimistic locking
-- =====================================================

/*
ТЕСТ (выполнить вручную для проверки):

-- Создаем тестового сотрудника
INSERT INTO employees (id, full_name, position, version)
VALUES ('test-version-001', 'Test Employee', 'Developer', 1)
RETURNING id, full_name, version;

-- Получаем текущую версию
SELECT id, full_name, version FROM employees WHERE id = 'test-version-001';
-- Должно вернуть version = 1

-- Обновляем запись (правильная версия)
UPDATE employees 
SET full_name = 'Updated Name', version = 2
WHERE id = 'test-version-001' AND version = 1
RETURNING id, full_name, version;
-- Должно вернуть 1 строку с version = 2

-- Пытаемся обновить со старой версией (должно не сработать)
UPDATE employees 
SET full_name = 'Another Update', version = 2
WHERE id = 'test-version-001' AND version = 1
RETURNING id, full_name, version;
-- Должно вернуть 0 строк (конфликт версий!)

-- Проверяем финальное состояние
SELECT id, full_name, version FROM employees WHERE id = 'test-version-001';
-- Должно показать version = 3 (триггер увеличил на 1)

-- Удаляем тестовые данные
DELETE FROM employees WHERE id = 'test-version-001';
*/

-- =====================================================
-- 8. Откат миграции (если нужно)
-- =====================================================

/*
ROLLBACK SCRIPT (использовать только если нужно откатить изменения):

-- Удалить триггер
DROP TRIGGER IF EXISTS trigger_increment_employee_version ON employees;

-- Удалить функцию
DROP FUNCTION IF EXISTS increment_employee_version();

-- Удалить индекс
DROP INDEX IF EXISTS idx_employees_id_version;

-- Удалить колонку
ALTER TABLE employees DROP COLUMN IF EXISTS version;
*/

-- =====================================================
-- Миграция завершена
-- =====================================================

SELECT 'Migration completed successfully! Version field added to employees table.' as status;
