-- ============================================================================
-- ЗАПОЛНЕНИЕ ДАННЫХ ДЛЯ ДЕПАРТАМЕНТОВ И ОТДЕЛОВ
-- ============================================================================
-- Этот скрипт заполняет данные для департаментов 1 и 2 и их отделов
-- с полной информацией: главная статистика, функции, признаки проблем, действия, ЦКП
-- ============================================================================

-- Департамент 1: Построения
INSERT INTO public.org_metadata (type, node_id, manager, goal, vfp, content)
VALUES (
  'department',
  'dept1',
  'Директор по персоналу',
  'Создание эффективной организационной структуры и развитие кадрового потенциала',
  'Продуктивный и эффективный штат сотрудников',
  '{
    "name": "1. Построения",
    "fullName": "1. Департамент Построения",
    "description": "Строители Организации и кадров.",
    "longDescription": "Департамент Построения отвечает за формирование и развитие организационной структуры компании, подбор и развитие персонала, обеспечение эффективной коммуникации внутри организации и контроль качества работы сотрудников.",
    "mainStat": "Кол-во штатных сотрудников (ГСД)",
    "functions": [
      "Подбор и найм персонала",
      "Адаптация новых сотрудников",
      "Развитие корпоративной культуры",
      "Организация внутренних коммуникаций",
      "Проведение инспекций и аудитов"
    ],
    "troubleSigns": [
      "Высокая текучесть кадров",
      "Недостаток квалифицированных специалистов",
      "Нарушение коммуникаций между отделами",
      "Низкая эффективность найма",
      "Отсутствие системы адаптации"
    ],
    "developmentActions": [
      "Внедрить систему оценки кандидатов",
      "Разработать программу адаптации",
      "Провести аудит коммуникаций",
      "Создать базу резюме",
      "Организовать регулярные встречи отделов"
    ]
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  goal = EXCLUDED.goal,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 1.1 - Найм
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept1_1',
  'Нач. Найма',
  'Продуктивный штат',
  '{
    "name": "Отдел 1.1 - Найм",
    "code": "1",
    "description": "Отдел отвечает за поиск, отбор и найм квалифицированных специалистов для всех департаментов компании."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 1.2 - Коммуникации
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept1_2',
  'Офис-менеджер',
  'Линии связи',
  '{
    "name": "Отдел 1.2 - Коммуникации",
    "code": "2",
    "description": "Отдел обеспечивает эффективную коммуникацию между всеми подразделениями компании, организует внутренние мероприятия и поддерживает корпоративную культуру."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 1.3 - Инспекция
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept1_3',
  'Инспектор',
  'Эффективность',
  '{
    "name": "Отдел 1.3 - Инспекция",
    "code": "3",
    "description": "Отдел проводит регулярные инспекции работы сотрудников и подразделений, выявляет проблемы и контролирует соблюдение стандартов качества."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Департамент 2: Коммерческий
INSERT INTO public.org_metadata (type, node_id, manager, goal, vfp, content)
VALUES (
  'department',
  'dept2',
  'Коммерческий директор',
  'Максимизация доходов компании через эффективные продажи и продвижение услуг',
  'Доход от продаж и новых клиентов',
  '{
    "name": "2. Коммерческий",
    "fullName": "2. Коммерческий Департамент",
    "description": "Продажи и Продвижение.",
    "longDescription": "Коммерческий департамент отвечает за привлечение клиентов, продвижение услуг компании, работу с лидами, контент-маркетинг и прямые продажи. Департамент обеспечивает рост доходов компании.",
    "mainStat": "Общий валовой доход (ГСД)",
    "functions": [
      "Генерация и обработка лидов",
      "Работа с клиентской базой",
      "Проведение консультаций",
      "Создание контента для продвижения",
      "Заключение сделок и продажи"
    ],
    "troubleSigns": [
      "Низкая конверсия лидов в продажи",
      "Падение количества новых клиентов",
      "Высокая стоимость привлечения клиента (CPL)",
      "Недостаток качественных лидов",
      "Снижение среднего чека"
    ],
    "developmentActions": [
      "Оптимизировать воронку продаж",
      "Улучшить качество контента",
      "Внедрить CRM-систему",
      "Провести обучение менеджеров по продажам",
      "Разработать новые каналы привлечения клиентов"
    ]
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  goal = EXCLUDED.goal,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 2.4 - Маркетинг
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept2_4',
  'Маркетолог',
  'Лиды',
  '{
    "name": "Отдел 2.4 - Маркетинг",
    "code": "4",
    "description": "Отдел маркетинга отвечает за привлечение потенциальных клиентов через различные каналы: реклама, социальные сети, контент-маркетинг и другие инструменты продвижения."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 2.5 - Контент
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept2_5',
  'Контент-менеджер',
  'Понимание продукта',
  '{
    "name": "Отдел 2.5 - Контент",
    "code": "5",
    "description": "Отдел контента создает информационные материалы, описания услуг, проводит консультации с потенциальными клиентами и обеспечивает понимание продукта целевой аудиторией."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- Отдел 2.6 - Продажи
INSERT INTO public.org_metadata (type, node_id, manager, vfp, content)
VALUES (
  'subdepartment',
  'dept2_6',
  'РОП',
  'Доход',
  '{
    "name": "Отдел 2.6 - Продажи",
    "code": "6",
    "description": "Отдел продаж работает с лидами, проводит переговоры с клиентами, заключает сделки и обеспечивает выполнение плана по доходам."
  }'::jsonb
)
ON CONFLICT (type, node_id) DO UPDATE SET
  manager = EXCLUDED.manager,
  vfp = EXCLUDED.vfp,
  content = EXCLUDED.content,
  updated_at = NOW();

-- ============================================================================
-- ПРОВЕРКА ЗАПОЛНЕННЫХ ДАННЫХ
-- ============================================================================

-- Проверить данные департамента 1
SELECT 
  node_id,
  manager,
  goal,
  vfp,
  content->>'mainStat' as main_stat,
  content->>'description' as description,
  jsonb_array_length(COALESCE(content->'functions', '[]'::jsonb)) as functions_count,
  jsonb_array_length(COALESCE(content->'troubleSigns', '[]'::jsonb)) as trouble_signs_count,
  jsonb_array_length(COALESCE(content->'developmentActions', '[]'::jsonb)) as actions_count
FROM public.org_metadata
WHERE type = 'department' AND node_id IN ('dept1', 'dept2');

-- Проверить данные отделов
SELECT 
  node_id,
  manager,
  vfp,
  content->>'description' as description
FROM public.org_metadata
WHERE type = 'subdepartment' AND node_id IN ('dept1_1', 'dept1_2', 'dept1_3', 'dept2_4', 'dept2_5', 'dept2_6');

