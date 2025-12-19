-- ============================================================================
-- ИНИЦИАЛИЗАЦИЯ НАЧАЛЬНЫХ ДАННЫХ ДЛЯ HR SYSTEM PRO
-- ============================================================================
-- Этот скрипт заполняет базу данных начальной структурой департаментов
-- из constants.ts
-- 
-- ВАЖНО: Выполняйте этот скрипт ПОСЛЕ supabase_schema_complete.sql
-- ============================================================================

-- Проверяем существование таблиц перед вставкой
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
    RAISE EXCEPTION 'Таблица departments не существует. Сначала выполните supabase_schema_complete.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subdepartments') THEN
    RAISE EXCEPTION 'Таблица subdepartments не существует. Сначала выполните supabase_schema_complete.sql';
  END IF;
END $$;

-- Вставляем департаменты
INSERT INTO public.departments (id, name, full_name, color, icon, description, manager, sort_order) VALUES
  ('dept7', '7. Административный', '7. Административный Департамент', '#0ea5e9', 'building', 'Стратегическое планирование и надзор.', 'Исполнительный Директор (ИД)', 1),
  ('dept1', '1. Построения', '1. Департамент Построения', '#fbbf24', 'users', 'Строители Организации и кадров.', 'Директор по персоналу', 2),
  ('dept2', '2. Коммерческий', '2. Коммерческий Департамент', '#a855f7', 'briefcase', 'Продажи и Продвижение.', 'Коммерческий директор', 3),
  ('dept3', '3. Финансовый', '3. Финансовый Департамент', '#ec4899', 'trending-up', 'Учет и распределение средств.', 'Фин. директор', 4),
  ('dept4', '4. Производства', '4. Департамент Производства', '#22c55e', 'settings', 'Создание продукта и сервис.', 'Директор по производству', 5),
  ('dept5', '5. Качества', '5. Департамент Качества', '#64748b', 'award', 'Контроль и обучение.', 'Директор по качеству', 6),
  ('dept6', '6. Расширения', '6. Департамент Расширения', '#f97316', 'globe', 'PR и новые рынки.', 'Директор по развитию', 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  manager = EXCLUDED.manager,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept7
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept7_19', 'dept7', 'Отдел 7.19 - ГД', '19', 'ИД', 'Жизнеспособная компания', 1),
  ('dept7_20', 'dept7', 'Отдел 7.20 - Юр. вопросы', '20', 'Юрист', 'Безопасность', 2),
  ('dept7_21', 'dept7', 'Отдел 7.21 - Офис совета', '21', 'Учредитель', 'Активы', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept1
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept1_1', 'dept1', 'Отдел 1.1 - Найм', '1', 'Нач. Найма', 'Продуктивный штат', 1),
  ('dept1_2', 'dept1', 'Отдел 1.2 - Коммуникации', '2', 'Офис-менеджер', 'Линии связи', 2),
  ('dept1_3', 'dept1', 'Отдел 1.3 - Инспекция', '3', 'Инспектор', 'Эффективность', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept2
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept2_4', 'dept2', 'Отдел 2.4 - Маркетинг', '4', 'Маркетолог', 'Лиды', 1),
  ('dept2_5', 'dept2', 'Отдел 2.5 - Контент', '5', 'Контент-менеджер', 'Понимание продукта', 2),
  ('dept2_6', 'dept2', 'Отдел 2.6 - Продажи', '6', 'РОП', 'Доход', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept3
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept3_7', 'dept3', 'Отдел 3.7 - Доходы', '7', 'Кассир', 'Собранные деньги', 1),
  ('dept3_8', 'dept3', 'Отдел 3.8 - Расходы', '8', 'Фин. менеджер', 'Оплаченные счета', 2),
  ('dept3_9', 'dept3', 'Отдел 3.9 - Бухгалтерия', '9', 'Главбух', 'Точный учет', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept4
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept4_10', 'dept4', 'Отдел 4.10 - Бронирование', '10', 'Менеджер', 'Заказы', 1),
  ('dept4_11', 'dept4', 'Отдел 4.11 - Транспорт', '11', 'Логист', 'Трансферы', 2),
  ('dept4_12', 'dept4', 'Отдел 4.12 - Предоставление', '12', 'Координатор', 'Исполненные услуги', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept5
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept5_13', 'dept5', 'Отдел 5.13 - Контроль', '13', 'ОКК', 'Безупречный продукт', 1),
  ('dept5_14', 'dept5', 'Отдел 5.14 - Обучение', '14', 'Тренер', 'Компетентные кадры', 2),
  ('dept5_15', 'dept5', 'Отдел 5.15 - Методология', '15', 'Методист', 'Стандарты', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем поддепартаменты для dept6
INSERT INTO public.subdepartments (id, department_id, name, code, manager, vfp, sort_order) VALUES
  ('dept6_16', 'dept6', 'Отдел 6.16 - PR', '16', 'PR-менеджер', 'Известность', 1),
  ('dept6_17', 'dept6', 'Отдел 6.17 - Вводные услуги', '17', 'Менеджер', 'Новые клиенты', 2),
  ('dept6_18', 'dept6', 'Отдел 6.18 - Партнеры', '18', 'Партнер-менеджер', 'Поток от агентов', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  sort_order = EXCLUDED.sort_order;

-- Вставляем метаданные компании (owner)
INSERT INTO public.org_metadata (type, node_id, goal, vfp, manager, content)
VALUES (
  'company',
  'owner',
  NULL,
  NULL,
  'Владелец',
  '{"id": "owner", "name": "Учредитель", "fullName": "Офис Учредителя", "color": "#f59e0b", "icon": "crown", "description": "Стратегическое управление и замыслы."}'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  content = EXCLUDED.content;

