-- Оптимизация производительности загрузки сотрудников
-- Добавляет индексы для ускорения запросов

-- ============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ employees
-- ============================================

-- Индекс для сортировки по created_at (используется в ORDER BY)
CREATE INDEX IF NOT EXISTS idx_employees_created_at 
ON employees(created_at DESC);

-- Индекс для поиска по department (если используется фильтрация)
CREATE INDEX IF NOT EXISTS idx_employees_department 
ON employees USING GIN(department);

-- Индекс для поиска по full_name (если используется поиск)
CREATE INDEX IF NOT EXISTS idx_employees_full_name 
ON employees(full_name);

-- Индекс для поиска по email (если используется)
CREATE INDEX IF NOT EXISTS idx_employees_email 
ON employees(email) 
WHERE email IS NOT NULL;

-- Примечание: Составной индекс с GIN для массива и обычной колонки может быть неэффективным
-- Используем отдельные индексы вместо составного

-- ============================================
-- ИНДЕКСЫ ДЛЯ ТАБЛИЦЫ employee_attachments
-- ============================================

-- Индекс для быстрого поиска вложений по employee_id
CREATE INDEX IF NOT EXISTS idx_employee_attachments_employee_id 
ON employee_attachments(employee_id);

-- ============================================
-- АНАЛИЗ ТАБЛИЦ ДЛЯ ОБНОВЛЕНИЯ СТАТИСТИК
-- ============================================

ANALYZE employees;
ANALYZE employee_attachments;

-- ============================================
-- ПРОВЕРКА ИНДЕКСОВ
-- ============================================

-- Проверка созданных индексов
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('employees', 'employee_attachments')
ORDER BY tablename, indexname;

-- Комментарии к индексам
COMMENT ON INDEX idx_employees_created_at IS 'Ускоряет сортировку по дате создания';
COMMENT ON INDEX idx_employees_department IS 'Ускоряет фильтрацию по департаменту';
COMMENT ON INDEX idx_employees_full_name IS 'Ускоряет поиск по имени';
COMMENT ON INDEX idx_employee_attachments_employee_id IS 'Ускоряет загрузку вложений сотрудника';

