-- Индексы для ускорения работы со статистиками
CREATE INDEX IF NOT EXISTS idx_statistics_values_definition_id ON statistics_values(definition_id);
CREATE INDEX IF NOT EXISTS idx_statistics_values_date ON statistics_values(date);
CREATE INDEX IF NOT EXISTS idx_statistics_definitions_owner_id ON statistics_definitions(owner_id);

-- Индекс для поиска сотрудников
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees USING gin(full_name gin_trgm_ops);

-- Индекс для быстрого поиска департаментов в метаданных
CREATE INDEX IF NOT EXISTS idx_org_metadata_type_node_id ON org_metadata(type, node_id);
