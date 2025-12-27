-- Добавление примерных шаблонов онбординга

-- 1. Общий шаблон онбординга для всех сотрудников
INSERT INTO onboarding_templates (id, name, position, department_id, tasks, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Общий онбординг',
  NULL,
  NULL,
  '[
    {
      "title": "Подписать трудовой договор",
      "description": "Подписать трудовой договор и дополнительные соглашения",
      "category": "documents",
      "assigned_to": "hr",
      "due_days": 0,
      "order_index": 0
    },
    {
      "title": "Ознакомиться с правилами внутреннего трудового распорядка",
      "description": "Изучить ПВТР и корпоративные политики",
      "category": "documents",
      "assigned_to": "employee",
      "due_days": 1,
      "order_index": 1
    },
    {
      "title": "Получить доступы к системам",
      "description": "Настроить доступы к корпоративным системам, почте, мессенджерам",
      "category": "access",
      "assigned_to": "it",
      "due_days": 1,
      "order_index": 2
    },
    {
      "title": "Получить рабочее оборудование",
      "description": "Получить ноутбук, телефон и другое необходимое оборудование",
      "category": "equipment",
      "assigned_to": "it",
      "due_days": 2,
      "order_index": 3
    },
    {
      "title": "Встреча с руководителем",
      "description": "Знакомство с руководителем, обсуждение задач и ожиданий",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 3,
      "order_index": 4
    },
    {
      "title": "Знакомство с командой",
      "description": "Встреча с коллегами, знакомство с командой и процессами",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 5,
      "order_index": 5
    }
  ]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  department_id = EXCLUDED.department_id,
  tasks = EXCLUDED.tasks,
  updated_at = NOW();

-- 2. Шаблон онбординга для разработчиков
INSERT INTO onboarding_templates (id, name, position, department_id, tasks, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Онбординг разработчика',
  'Разработчик',
  NULL,
  '[
    {
      "title": "Подписать трудовой договор",
      "description": "Подписать трудовой договор и NDA",
      "category": "documents",
      "assigned_to": "hr",
      "due_days": 0,
      "order_index": 0
    },
    {
      "title": "Получить доступы к Git репозиториям",
      "description": "Настроить SSH ключи, доступ к GitHub/GitLab",
      "category": "access",
      "assigned_to": "it",
      "due_days": 1,
      "order_index": 1
    },
    {
      "title": "Настроить рабочую среду",
      "description": "Установить IDE, необходимые инструменты разработки",
      "category": "equipment",
      "assigned_to": "employee",
      "due_days": 2,
      "order_index": 2
    },
    {
      "title": "Получить доступ к тестовым окружениям",
      "description": "Настроить доступ к staging и dev окружениям",
      "category": "access",
      "assigned_to": "it",
      "due_days": 2,
      "order_index": 3
    },
    {
      "title": "Изучить архитектуру проекта",
      "description": "Ознакомиться с документацией проекта и архитектурой",
      "category": "training",
      "assigned_to": "employee",
      "due_days": 3,
      "order_index": 4
    },
    {
      "title": "Code review с тимлидом",
      "description": "Провести первый code review с тимлидом",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 5,
      "order_index": 5
    },
    {
      "title": "Знакомство с процессами разработки",
      "description": "Изучить процессы code review, CI/CD, деплоя",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 7,
      "order_index": 6
    }
  ]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  department_id = EXCLUDED.department_id,
  tasks = EXCLUDED.tasks,
  updated_at = NOW();

-- 3. Шаблон онбординга для менеджеров
INSERT INTO onboarding_templates (id, name, position, department_id, tasks, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Онбординг менеджера',
  'Менеджер',
  NULL,
  '[
    {
      "title": "Подписать трудовой договор",
      "description": "Подписать трудовой договор и дополнительные соглашения",
      "category": "documents",
      "assigned_to": "hr",
      "due_days": 0,
      "order_index": 0
    },
    {
      "title": "Получить доступы к CRM и аналитике",
      "description": "Настроить доступы к системам управления и аналитическим панелям",
      "category": "access",
      "assigned_to": "it",
      "due_days": 1,
      "order_index": 1
    },
    {
      "title": "Знакомство с командой",
      "description": "Встреча с подчиненными и коллегами-менеджерами",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 2,
      "order_index": 2
    },
    {
      "title": "Изучить процессы и метрики",
      "description": "Ознакомиться с бизнес-процессами, KPI и метриками отдела",
      "category": "training",
      "assigned_to": "employee",
      "due_days": 3,
      "order_index": 3
    },
    {
      "title": "Встреча с директором",
      "description": "Обсуждение стратегии, целей и ожиданий",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 5,
      "order_index": 4
    },
    {
      "title": "Ознакомление с бюджетом отдела",
      "description": "Изучить бюджет и финансовые процессы отдела",
      "category": "training",
      "assigned_to": "manager",
      "due_days": 7,
      "order_index": 5
    }
  ]'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  department_id = EXCLUDED.department_id,
  tasks = EXCLUDED.tasks,
  updated_at = NOW();

-- Проверка добавленных шаблонов
SELECT 
  id,
  name,
  position,
  department_id,
  jsonb_array_length(tasks) as tasks_count,
  created_at
FROM onboarding_templates
ORDER BY created_at;



