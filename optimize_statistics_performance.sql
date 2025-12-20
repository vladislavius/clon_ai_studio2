-- Оптимизация производительности загрузки статистик
-- Добавляет индексы для ускорения запросов

-- Индекс для быстрого поиска значений по definition_id
CREATE INDEX IF NOT EXISTS idx_statistics_values_definition_id 
ON statistics_values(definition_id);

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_statistics_values_date 
ON statistics_values(date);

-- Составной индекс для частых запросов (definition_id + date)
CREATE INDEX IF NOT EXISTS idx_statistics_values_def_date 
ON statistics_values(definition_id, date);

-- Индекс для condition (если используется для фильтрации)
CREATE INDEX IF NOT EXISTS idx_statistics_values_condition 
ON statistics_values(condition) 
WHERE condition IS NOT NULL;

-- Анализ таблицы для обновления статистик планировщика
ANALYZE statistics_values;

-- Комментарий
COMMENT ON INDEX idx_statistics_values_definition_id IS 'Ускоряет загрузку значений по определению статистики';
COMMENT ON INDEX idx_statistics_values_date IS 'Ускоряет сортировку по дате';
COMMENT ON INDEX idx_statistics_values_def_date IS 'Ускоряет запросы с фильтрацией по definition_id и сортировкой по дате';
COMMENT ON INDEX idx_statistics_values_condition IS 'Ускоряет фильтрацию по условию (condition)';

