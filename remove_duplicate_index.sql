-- Удаление дублирующегося индекса для department
-- Есть два индекса: idx_employees_department и idx_employees_dept

-- Удаляем старый индекс (оставляем более новое имя)
DROP INDEX IF EXISTS idx_employees_dept;

-- Проверка оставшихся индексов
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'employees'
ORDER BY indexname;


