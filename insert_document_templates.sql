-- Добавление примерных шаблонов документов

-- Проверяем и добавляем недостающие колонки, если они отсутствуют
DO $$
BEGIN
  -- Проверяем и добавляем колонку description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_templates' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.document_templates ADD COLUMN description TEXT;
    RAISE NOTICE '✅ Колонка description добавлена в document_templates.';
  ELSE
    RAISE NOTICE 'ℹ️ Колонка description уже существует в document_templates.';
  END IF;

  -- Проверяем и добавляем колонку updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_templates' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.document_templates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Колонка updated_at добавлена в document_templates.';
  ELSE
    RAISE NOTICE 'ℹ️ Колонка updated_at уже существует в document_templates.';
  END IF;

  -- Проверяем и добавляем колонку created_at, если её нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'document_templates' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.document_templates ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Колонка created_at добавлена в document_templates.';
  ELSE
    RAISE NOTICE 'ℹ️ Колонка created_at уже существует в document_templates.';
  END IF;
END $$;

-- 1. Шаблон трудового договора
INSERT INTO document_templates (id, name, type, content, variables, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'Трудовой договор',
  'contract',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { text-align: center; color: #333; }
    h2 { color: #555; margin-top: 30px; }
    .header { text-align: center; margin-bottom: 40px; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature { width: 45%; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ТРУДОВОЙ ДОГОВОР</h1>
    <p>№ {{contract_number}}</p>
    <p>г. {{city}}, {{date}}</p>
  </div>

  <p><strong>{{company_name}}</strong>, именуемое в дальнейшем «Работодатель», в лице {{employer_representative}}, действующего на основании {{employer_basis}}, с одной стороны, и</p>

  <p><strong>{{employee_name}}</strong>, именуемый(ая) в дальнейшем «Работник», с другой стороны, заключили настоящий трудовой договор о нижеследующем:</p>

  <h2>1. ПРЕДМЕТ ДОГОВОРА</h2>
  <p>1.1. Работник обязуется выполнять работу по должности <strong>{{position}}</strong> в {{department}}.</p>
  <p>1.2. Работа по настоящему договору является для Работника основной.</p>
  <p>1.3. Место работы: {{work_location}}.</p>

  <h2>2. СРОК ДЕЙСТВИЯ ДОГОВОРА</h2>
  <p>2.1. Настоящий договор вступает в силу с {{start_date}} и действует до {{end_date}}.</p>
  <p>2.2. Работник приступает к работе с {{start_date}}.</p>

  <h2>3. ПРАВА И ОБЯЗАННОСТИ СТОРОН</h2>
  <p>3.1. Работник имеет право на:</p>
  <ul>
    <li>предоставление работы, обусловленной настоящим договором;</li>
    <li>своевременную и в полном размере выплату заработной платы;</li>
    <li>отдых, обеспечиваемый установлением нормальной продолжительности рабочего времени;</li>
    <li>полную достоверную информацию об условиях труда и требованиях охраны труда на рабочем месте.</li>
  </ul>

  <p>3.2. Работник обязан:</p>
  <ul>
    <li>добросовестно исполнять свои трудовые обязанности;</li>
    <li>соблюдать правила внутреннего трудового распорядка;</li>
    <li>соблюдать трудовую дисциплину;</li>
    <li>бережно относиться к имуществу Работодателя.</li>
  </ul>

  <h2>4. ОПЛАТА ТРУДА</h2>
  <p>4.1. Работнику устанавливается должностной оклад в размере {{salary}} рублей в месяц.</p>
  <p>4.2. Выплата заработной платы производится {{payment_schedule}}.</p>

  <h2>5. РЕЖИМ РАБОЧЕГО ВРЕМЕНИ И ВРЕМЕНИ ОТДЫХА</h2>
  <p>5.1. Работнику устанавливается {{work_schedule}}.</p>
  <p>5.2. Продолжительность рабочей недели составляет {{work_hours}} часов.</p>

  <h2>6. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
  <p>6.1. Стороны несут ответственность в соответствии с действующим законодательством Российской Федерации.</p>

  <h2>7. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</h2>
  <p>7.1. Настоящий договор составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.</p>
  <p>7.2. Все изменения и дополнения к настоящему договору оформляются дополнительными соглашениями в письменной форме.</p>

  <div class="signature-block">
    <div class="signature">
      <p><strong>Работодатель:</strong></p>
      <p>_________________ {{employer_representative}}</p>
      <p>М.П.</p>
    </div>
    <div class="signature">
      <p><strong>Работник:</strong></p>
      <p>_________________ {{employee_name}}</p>
    </div>
  </div>
</body>
</html>',
  '[
    {"name": "contract_number", "label": "Номер договора", "type": "text", "required": true},
    {"name": "city", "label": "Город", "type": "text", "required": true},
    {"name": "date", "label": "Дата", "type": "date", "required": true},
    {"name": "company_name", "label": "Название компании", "type": "text", "required": true},
    {"name": "employer_representative", "label": "Представитель работодателя", "type": "text", "required": true},
    {"name": "employer_basis", "label": "Основание (Устав, доверенность)", "type": "text", "required": true},
    {"name": "employee_name", "label": "ФИО сотрудника", "type": "text", "required": true},
    {"name": "position", "label": "Должность", "type": "text", "required": true},
    {"name": "department", "label": "Отдел", "type": "text", "required": true},
    {"name": "work_location", "label": "Место работы", "type": "text", "required": true},
    {"name": "start_date", "label": "Дата начала работы", "type": "date", "required": true},
    {"name": "end_date", "label": "Дата окончания (если срочный)", "type": "date", "required": false},
    {"name": "salary", "label": "Оклад (руб.)", "type": "number", "required": true},
    {"name": "payment_schedule", "label": "График выплаты", "type": "text", "required": true},
    {"name": "work_schedule", "label": "Режим работы", "type": "text", "required": true},
    {"name": "work_hours", "label": "Количество часов в неделю", "type": "number", "required": true}
  ]'::jsonb,
  'Стандартный шаблон трудового договора с переменными для заполнения',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Шаблон приказа о приеме на работу
INSERT INTO document_templates (id, name, type, content, variables, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  'Приказ о приеме на работу',
  'order',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { text-align: center; color: #333; }
    .header { text-align: center; margin-bottom: 40px; }
    .order-content { margin: 30px 0; }
    .signature { margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ПРИКАЗ</h1>
    <p>о приеме на работу</p>
    <p>№ {{order_number}} от {{date}}</p>
  </div>

  <div class="order-content">
    <p><strong>ПРИКАЗЫВАЮ:</strong></p>
    <p>1. Принять на работу с {{start_date}} по должности <strong>{{position}}</strong> в {{department}} с окладом {{salary}} рублей.</p>
    <p>2. Назначить ответственным за оформление документов: {{hr_responsible}}.</p>
    <p>3. Ознакомить {{employee_name}} с настоящим приказом под роспись.</p>
  </div>

  <div class="signature">
    <p><strong>Руководитель:</strong> _________________ {{director_name}}</p>
    <p>С приказом ознакомлен(а): _________________ {{employee_name}}</p>
    <p>Дата: {{date}}</p>
  </div>
</body>
</html>',
  '[
    {"name": "order_number", "label": "Номер приказа", "type": "text", "required": true},
    {"name": "date", "label": "Дата", "type": "date", "required": true},
    {"name": "start_date", "label": "Дата начала работы", "type": "date", "required": true},
    {"name": "position", "label": "Должность", "type": "text", "required": true},
    {"name": "department", "label": "Отдел", "type": "text", "required": true},
    {"name": "salary", "label": "Оклад (руб.)", "type": "number", "required": true},
    {"name": "hr_responsible", "label": "Ответственный HR", "type": "text", "required": true},
    {"name": "employee_name", "label": "ФИО сотрудника", "type": "text", "required": true},
    {"name": "director_name", "label": "ФИО руководителя", "type": "text", "required": true}
  ]'::jsonb,
  'Шаблон приказа о приеме сотрудника на работу',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. Шаблон справки с места работы
INSERT INTO document_templates (id, name, type, content, variables, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000103',
  'Справка с места работы',
  'certificate',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.8; margin: 40px; }
    h1 { text-align: center; color: #333; }
    .header { text-align: center; margin-bottom: 40px; }
    .certificate-content { margin: 30px 0; text-align: justify; }
    .signature { margin-top: 60px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>СПРАВКА</h1>
    <p>№ {{certificate_number}} от {{date}}</p>
  </div>

  <div class="certificate-content">
    <p>Дана {{employee_name}}, {{employee_passport}}, в том, что он(а) действительно работает в {{company_name}} с {{start_date}} по настоящее время в должности <strong>{{position}}</strong> в {{department}}.</p>
    <p>Оклад составляет {{salary}} рублей в месяц.</p>
    <p>Справка выдана для предъявления по месту требования.</p>
  </div>

  <div class="signature">
    <p><strong>Руководитель:</strong> _________________ {{director_name}}</p>
    <p>М.П.</p>
  </div>
</body>
</html>',
  '[
    {"name": "certificate_number", "label": "Номер справки", "type": "text", "required": true},
    {"name": "date", "label": "Дата выдачи", "type": "date", "required": true},
    {"name": "employee_name", "label": "ФИО сотрудника", "type": "text", "required": true},
    {"name": "employee_passport", "label": "Паспортные данные", "type": "text", "required": true},
    {"name": "company_name", "label": "Название компании", "type": "text", "required": true},
    {"name": "start_date", "label": "Дата начала работы", "type": "date", "required": true},
    {"name": "position", "label": "Должность", "type": "text", "required": true},
    {"name": "department", "label": "Отдел", "type": "text", "required": true},
    {"name": "salary", "label": "Оклад (руб.)", "type": "number", "required": true},
    {"name": "director_name", "label": "ФИО руководителя", "type": "text", "required": true}
  ]'::jsonb,
  'Шаблон справки с места работы для сотрудника',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. Шаблон дополнительного соглашения
INSERT INTO document_templates (id, name, type, content, variables, description, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000104',
  'Дополнительное соглашение к трудовому договору',
  'other',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { text-align: center; color: #333; }
    .header { text-align: center; margin-bottom: 40px; }
    .agreement-content { margin: 30px 0; }
    .signature-block { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature { width: 45%; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ</h1>
    <p>к трудовому договору № {{contract_number}} от {{contract_date}}</p>
    <p>№ {{agreement_number}} от {{date}}</p>
  </div>

  <div class="agreement-content">
    <p><strong>{{company_name}}</strong>, именуемое в дальнейшем «Работодатель», в лице {{employer_representative}}, действующего на основании {{employer_basis}}, с одной стороны, и</p>
    <p><strong>{{employee_name}}</strong>, именуемый(ая) в дальнейшем «Работник», с другой стороны, заключили настоящее дополнительное соглашение о нижеследующем:</p>

    <h2>1. ИЗМЕНЕНИЯ</h2>
    <p>{{changes_description}}</p>

    <h2>2. ПРОЧИЕ УСЛОВИЯ</h2>
    <p>2.1. Все остальные условия трудового договора остаются без изменений.</p>
    <p>2.2. Настоящее соглашение вступает в силу с {{effective_date}}.</p>
    <p>2.3. Настоящее соглашение составлено в двух экземплярах, имеющих одинаковую юридическую силу.</p>
  </div>

  <div class="signature-block">
    <div class="signature">
      <p><strong>Работодатель:</strong></p>
      <p>_________________ {{employer_representative}}</p>
      <p>М.П.</p>
    </div>
    <div class="signature">
      <p><strong>Работник:</strong></p>
      <p>_________________ {{employee_name}}</p>
    </div>
  </div>
</body>
</html>',
  '[
    {"name": "contract_number", "label": "Номер трудового договора", "type": "text", "required": true},
    {"name": "contract_date", "label": "Дата трудового договора", "type": "date", "required": true},
    {"name": "agreement_number", "label": "Номер соглашения", "type": "text", "required": true},
    {"name": "date", "label": "Дата соглашения", "type": "date", "required": true},
    {"name": "company_name", "label": "Название компании", "type": "text", "required": true},
    {"name": "employer_representative", "label": "Представитель работодателя", "type": "text", "required": true},
    {"name": "employer_basis", "label": "Основание", "type": "text", "required": true},
    {"name": "employee_name", "label": "ФИО сотрудника", "type": "text", "required": true},
    {"name": "changes_description", "label": "Описание изменений", "type": "text", "required": true},
    {"name": "effective_date", "label": "Дата вступления в силу", "type": "date", "required": true}
  ]'::jsonb,
  'Шаблон дополнительного соглашения к трудовому договору',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Проверка добавленных шаблонов
SELECT 
  id,
  name,
  type,
  description,
  jsonb_array_length(variables) as variables_count,
  created_at
FROM document_templates
ORDER BY created_at;

