# 💼 Дорожная карта HR функций

## 🎯 Цель
Расширить функциональность приложения для полноценного HR-менеджмента.

---

## 📊 Приоритизация функций

### 🔴 Критично (Высокий приоритет)

#### 1. Управление отпусками и отгулами
**Приоритет:** 🔴 ВЫСОКИЙ  
**Сложность:** Средняя  
**Время:** 2-3 недели

**Функционал:**
- Календарь отпусков с визуализацией
- Заявки на отпуск с workflow approval
- Баланс отпусков (начисленные/использованные)
- История использования отпусков
- Автоматический расчет дней
- Уведомления о предстоящих отпусках
- Экспорт календаря (iCal)

**Таблицы БД:**
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'vacation', 'sick', 'personal', 'unpaid'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approver_id UUID REFERENCES employees(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_balances (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  vacation_days INTEGER DEFAULT 28,
  sick_days INTEGER DEFAULT 0,
  personal_days INTEGER DEFAULT 0,
  used_vacation INTEGER DEFAULT 0,
  used_sick INTEGER DEFAULT 0,
  used_personal INTEGER DEFAULT 0,
  UNIQUE(employee_id, year)
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
```

**Компоненты:**
- `LeaveManagement.tsx` - основной компонент
- `LeaveCalendar.tsx` - календарь с визуализацией
- `LeaveRequestForm.tsx` - форма создания заявки
- `LeaveBalanceCard.tsx` - карточка баланса
- `LeaveRequestList.tsx` - список заявок
- `LeaveApprovalModal.tsx` - модальное окно для одобрения

**Интеграции:**
- Google Calendar / Outlook Calendar
- Email уведомления
- Push-уведомления

---

#### 2. Онбординг новых сотрудников
**Приоритет:** 🔴 ВЫСОКИЙ  
**Сложность:** Средняя  
**Время:** 2 недели

**Функционал:**
- Чеклист онбординга с задачами
- Категории задач (документы, доступы, оборудование, обучение)
- Назначение задач (HR, сотрудник, менеджер)
- Отслеживание прогресса
- Автоматические напоминания
- Шаблоны онбординга по должностям
- Прикрепление файлов к задачам

**Таблицы БД:**
```sql
CREATE TABLE onboarding_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255), -- Для какой должности
  department_id VARCHAR(50),
  tasks JSONB NOT NULL, -- Массив задач
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE onboarding_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES onboarding_templates(id),
  start_date DATE NOT NULL,
  target_completion_date DATE,
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'documents', 'access', 'equipment', 'training'
  assigned_to VARCHAR(20) NOT NULL, -- 'hr', 'employee', 'manager', 'it'
  assigned_user_id UUID REFERENCES employees(id),
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES employees(id),
  notes TEXT,
  attachments JSONB,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Компоненты:**
- `OnboardingDashboard.tsx` - дашборд онбординга
- `OnboardingChecklist.tsx` - чеклист с задачами
- `OnboardingTaskCard.tsx` - карточка задачи
- `OnboardingTemplateEditor.tsx` - редактор шаблонов
- `OnboardingProgress.tsx` - прогресс-бар

**Автоматизация:**
- Автоматическое создание задач при добавлении сотрудника
- Напоминания о просроченных задачах
- Уведомления при завершении задач

---

### 🟡 Важно (Средний приоритет)

#### 3. Performance Reviews (Оценка эффективности)
**Приоритет:** 🟡 СРЕДНИЙ  
**Сложность:** Высокая  
**Время:** 3-4 недели

**Функционал:**
- Периодические оценки (quarterly, semi-annual, annual)
- Шаблоны оценок с критериями
- Самооценка сотрудника
- Оценка менеджером
- 360° feedback (коллеги, подчиненные)
- Комментарии и обратная связь
- Постановка целей (SMART goals)
- История оценок и тренды
- Экспорт отчетов

**Таблицы БД:**
```sql
CREATE TABLE review_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  period_type VARCHAR(20), -- 'quarterly', 'semi_annual', 'annual'
  criteria JSONB NOT NULL, -- Массив критериев оценки
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id),
  template_id UUID REFERENCES review_templates(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  self_review_data JSONB,
  manager_review_data JSONB,
  peer_reviews JSONB, -- Массив оценок от коллег
  overall_score DECIMAL(3,2), -- Средний балл
  strengths TEXT[],
  improvements TEXT[],
  goals JSONB, -- SMART goals
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'self_review', 'manager_review', 'completed'
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Компоненты:**
- `PerformanceReviews.tsx` - список оценок
- `ReviewForm.tsx` - форма оценки
- `ReviewHistory.tsx` - история оценок
- `ReviewDashboard.tsx` - дашборд с метриками
- `GoalTracking.tsx` - отслеживание целей

---

#### 4. Учет рабочего времени
**Приоритет:** 🟡 СРЕДНИЙ  
**Сложность:** Средняя  
**Время:** 2-3 недели

**Функционал:**
- Табель учета времени
- Отслеживание часов работы (clock in/out)
- Учет перерывов
- Привязка к проектам/задачам
- Одобрение табелей менеджером
- Отчеты по времени
- Интеграция с системами учета времени

**Таблицы БД:**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  break_duration INTEGER DEFAULT 0, -- minutes
  total_hours DECIMAL(4,2),
  project_id VARCHAR(100),
  task_description TEXT,
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, date, start_time)
);

CREATE TABLE time_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_hours DECIMAL(6,2),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approver_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Компоненты:**
- `TimeTracking.tsx` - основной компонент
- `TimeEntryForm.tsx` - форма ввода времени
- `TimeSheet.tsx` - табель
- `TimeApproval.tsx` - одобрение табелей
- `TimeReports.tsx` - отчеты

---

#### 5. Документооборот
**Приоритет:** 🟡 СРЕДНИЙ  
**Сложность:** Высокая  
**Время:** 3-4 недели

**Функционал:**
- Шаблоны документов (трудовой договор, приказы, справки)
- Генерация документов из шаблонов
- Электронная подпись
- Версионирование документов
- Workflow подписания
- Уведомления о необходимости подписания
- Хранение подписанных документов

**Таблицы БД:**
```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'contract', 'order', 'certificate', 'other'
  content TEXT NOT NULL, -- HTML или Markdown
  variables JSONB, -- Переменные для подстановки
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending_signature', 'signed', 'archived'
  file_url TEXT,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES employees(id),
  signature_data TEXT, -- Base64 изображение подписи
  signed_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

---

### 🟢 Желательно (Низкий приоритет)

#### 6. Компетенции и навыки
**Приоритет:** 🟢 НИЗКИЙ  
**Сложность:** Средняя  
**Время:** 2 недели

**Функционал:**
- Матрица компетенций
- Оценка навыков (self-assessment + manager assessment)
- Планы развития (IDP - Individual Development Plan)
- Сертификаты и обучение
- Трекинг прогресса развития

---

#### 7. Организационные изменения
**Приоритет:** 🟢 НИЗКИЙ  
**Сложность:** Низкая  
**Время:** 1 неделя

**Функционал:**
- История изменений должностей
- История переводов между департаментами
- Причины изменений
- Уведомления о изменениях
- Экспорт истории

---

#### 8. Рекрутинг и найм
**Приоритет:** 🟢 НИЗКИЙ  
**Сложность:** Высокая  
**Время:** 4-5 недель

**Функционал:**
- Управление вакансиями
- Кандидаты и резюме
- Интервью и оценки
- Офферы
- Онбординг новых сотрудников

---

## 🎯 Рекомендуемый порядок реализации

### Фаза 1 (Месяц 1)
1. ✅ Управление отпусками
2. ✅ Онбординг сотрудников

### Фаза 2 (Месяц 2)
3. ✅ Performance Reviews
4. ✅ Учет рабочего времени

### Фаза 3 (Месяц 3)
5. ✅ Документооборот
6. ✅ Компетенции и навыки

### Фаза 4 (Месяц 4+)
7. ✅ Организационные изменения
8. ✅ Рекрутинг и найм

---

## 📝 Детали реализации

### Общие принципы

1. **Модульность:** Каждая функция - отдельный модуль/компонент
2. **Переиспользование:** Общие компоненты (модальные окна, формы, таблицы)
3. **Типизация:** Строгие TypeScript типы для всех данных
4. **Валидация:** Валидация на клиенте и сервере
5. **Уведомления:** Toast уведомления для всех действий
6. **Офлайн:** Поддержка офлайн режима где возможно

---

## 🔗 Интеграции

### Планируемые интеграции:
- **Календари:** Google Calendar, Outlook Calendar
- **Email:** SendGrid, Mailgun для уведомлений
- **Мессенджеры:** Slack, Telegram (уже частично)
- **Документы:** DocuSign для электронной подписи
- **Учет времени:** Toggl, Clockify
- **Рекрутинг:** LinkedIn, HeadHunter API

---

**Дата создания:** 2024












