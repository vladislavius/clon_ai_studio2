
export interface Employee {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  position: string;
  nickname?: string;
  birth_date?: string;
  join_date?: string;
  email?: string;
  email2?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  actual_address?: string;
  registration_address?: string;
  bank_name?: string;
  bank_details?: string;
  crypto_wallet?: string;
  crypto_currency?: string;
  crypto_network?: string;
  inn?: string;
  passport_number?: string;
  passport_date?: string;
  passport_issuer?: string;
  foreign_passport?: string;
  foreign_passport_date?: string;
  foreign_passport_issuer?: string;
  photo_url?: string;
  additional_info?: string;
  department?: string[]; // IDs
  subdepartment?: string[]; // IDs
  emergency_contacts: EmergencyContact[];
  custom_fields: CustomField[];
  attachments: Attachment[];
  version?: number; // For optimistic locking - автоматически увеличивается при каждом обновлении
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  telegram?: string;
}

export interface CustomField {
  label: string;
  value: string;
}

export interface Attachment {
  id: string;
  employee_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  uploaded_at: string;
  document_category?: 'contract_nda' | 'passport_scan' | 'inn_snils' | 'zrs' | 'other'; // Категория документа
}

export interface Department {
  id: string;
  name: string;
  fullName: string;
  color: string;
  icon: string;
  description: string;
  longDescription?: string; // New: Detailed description
  functions?: string[]; // New: List of functions
  mainStat?: string; // New: Main Statistic name
  manager: string;
  goal?: string; // Цель
  vfp?: string; // Ценный Конечный Продукт (ЦКП)
  troubleSigns?: string[]; // New: Признаки проблем
  developmentActions?: string[]; // New: Действия по развитию
  departments?: Record<string, SubDepartment>;
}

export interface SubDepartment {
  id: string;
  name: string;
  code: string;
  manager: string;
  description?: string; // New
  vfp?: string; // New
}

// --- Onboarding Types ---

export type OnboardingTaskCategory = 'documents' | 'access' | 'equipment' | 'training';
export type OnboardingTaskAssignee = 'hr' | 'employee' | 'manager' | 'it';
export type OnboardingStatus = 'in_progress' | 'completed' | 'cancelled';

export interface OnboardingTaskTemplate {
  title: string;
  description?: string;
  category: OnboardingTaskCategory;
  assigned_to: OnboardingTaskAssignee;
  due_days?: number; // Количество дней от начала онбординга
  order_index: number;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  position?: string;
  department_id?: string;
  tasks: OnboardingTaskTemplate[];
  created_at: string;
  updated_at: string;
}

export interface OnboardingTask {
  id: string;
  instance_id: string;
  title: string;
  description?: string;
  category: OnboardingTaskCategory;
  assigned_to: OnboardingTaskAssignee;
  assigned_user_id?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  attachments: Attachment[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingInstance {
  id: string;
  employee_id: string;
  template_id?: string;
  start_date: string;
  target_completion_date?: string;
  status: OnboardingStatus;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  employee?: Employee; // Для join
  tasks?: OnboardingTask[]; // Для join
}

// --- Statistics Types ---

export type StatOwnerType = 'company' | 'department' | 'employee';

export type WiseCondition = 'non_existence' | 'danger' | 'emergency' | 'normal' | 'affluence' | 'power' | 'power_change';

export interface StatisticDefinition {
  id: string;
  created_at?: string;
  title: string;
  description?: string; // Общее описание
  calculation_method?: string; // Методика расчета
  purpose?: string; // Цель/ЦКП
  type: StatOwnerType;
  owner_id?: string; // employee_id or dept_id
  inverted?: boolean; // true if lower is better
  is_favorite?: boolean; // New field for favorites
  is_double?: boolean; // New field for Double Statistics (Two lines)
}

export interface StatisticValue {
  id: string;
  definition_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  value2?: number; // Second value for double stats
  condition?: WiseCondition;
  notes?: string;
}

export type ViewMode = 'employees' | 'org_chart' | 'statistics' | 'settings';
export type EmployeeSubView = 'list' | 'birthdays' | 'onboarding' | 'documents';
export type DocumentsSubView = 'sent' | 'received';

// --- Documents Types ---

export type DocumentType = 'contract' | 'order' | 'certificate' | 'other';
export type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'archived' | 'rejected';
export type SignatureType = 'image' | 'digital' | 'stamp';
export type WorkflowStatus = 'pending' | 'signed' | 'rejected' | 'skipped';
export type SignerRole = 'employee' | 'manager' | 'hr' | 'director';

export interface DocumentTemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  required?: boolean;
  options?: string[]; // Для типа 'select'
  default?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  content: string; // HTML или Markdown с переменными {{variable_name}}
  variables: DocumentTemplateVariable[];
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Document {
  id: string;
  employee_id: string;
  template_id?: string;
  title: string;
  content: string;
  version: number;
  status: DocumentStatus;
  file_url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
  archived_at?: string;
  employee?: Employee; // Для join
  template?: DocumentTemplate; // Для join
  signatures?: DocumentSignature[]; // Для join
  workflow?: DocumentSignatureWorkflow[]; // Для join
}

export interface DocumentSignature {
  id: string;
  document_id: string;
  signer_id: string;
  signature_data: string; // Base64 изображение подписи
  signature_type: SignatureType;
  signed_at: string;
  ip_address?: string;
  user_agent?: string;
  comment?: string;
  order_index: number;
  signer?: Employee; // Для join
}

export interface DocumentSignatureWorkflow {
  id: string;
  document_id: string;
  signer_id: string;
  role: SignerRole;
  required: boolean;
  order_index: number;
  status: WorkflowStatus;
  notified_at?: string;
  notified_count: number;
  deadline?: string;
  created_at: string;
  signer?: Employee; // Для join
}

// --- Received Documents Types ---

export type ReceivedDocumentType = 'zrs' | 'contract' | 'order' | 'certificate' | 'other';
export type ReceivedDocumentStatus = 'received' | 'reviewed' | 'archived' | 'rejected';

export interface ReceivedDocumentSignature {
  signer_name: string;
  signer_position: string;
  signed_at: string;
  signature_type?: 'image' | 'digital' | 'stamp';
}

export interface ReceivedDocumentApproval {
  approver_name: string;
  approver_position: string;
  approved_at: string;
  comment?: string;
}

export interface ReceivedDocument {
  id: string;
  title: string;
  document_type: ReceivedDocumentType;
  file_name: string;
  file_path: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  employee_id?: string;
  sender_name?: string;
  sender_email?: string;
  received_date: string;
  status: ReceivedDocumentStatus;
  description?: string;
  signatures: ReceivedDocumentSignature[];
  approvals: ReceivedDocumentApproval[];
  tags: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  employee?: Employee; // Для join
  creator?: Employee; // Для join (кто загрузил)
}

// --- Employee Onboarding Wizard Types ---

export type EmploymentType = 'full_time' | 'contract' | 'self_employed' | 'ip';
export type WorkSchedule = 'full_day' | 'shift' | 'flexible' | 'remote' | 'hybrid';
export type EmployeeStatus = 'trainee' | 'employee' | 'awaiting_start';
export type PostReadinessStatus = 'ready' | 'needs_improvement' | 'not_ready';

export interface PostInfo {
  id: string;
  name: string;
  department_id: string;
  department_name: string;
  manager_id?: string;
  manager_name?: string;
  vfp?: string; // Ценный конечный продукт
  statistics?: string[]; // Названия статистик поста
  hat_written: boolean;
  materials_ready: boolean;
  readiness_status: PostReadinessStatus;
}

export interface EmployeeWizardData {
  // Step 1: Post Selection
  post_id?: string;
  post_info?: PostInfo;
  
  // Step 2: Personal Data (расширено всеми полями из Employee)
  last_name: string;
  first_name: string;
  middle_name?: string;
  birth_date?: string;
  nickname?: string; // Системный NIK
  
  // Контакты
  email?: string;
  email2?: string; // Личный email
  phone?: string;
  work_phone?: string;
  telegram?: string;
  whatsapp?: string;
  actual_address?: string;
  registration_address?: string;
  
  // Паспортные данные
  inn?: string;
  passport_series?: string;
  passport_number?: string;
  passport_date?: string;
  passport_issuer?: string;
  foreign_passport?: string;
  foreign_passport_date?: string;
  foreign_passport_issuer?: string;
  
  // Финансовые реквизиты
  bank_name?: string;
  bank_details?: string;
  crypto_wallet?: string;
  crypto_currency?: string;
  crypto_network?: string;
  
  // Файлы
  passport_scan?: File;
  documents?: File[];
  
  // Экстренные контакты
  emergency_contacts?: EmergencyContact[];
  
  // Step 3: Employment Conditions
  employment_type: EmploymentType;
  start_date: string;
  status: EmployeeStatus;
  salary?: number;
  has_bonus: boolean;
  bonus_conditions?: string;
  bonus_amount?: number;
  work_schedule: WorkSchedule;
  schedule_details?: string;
  
  // Step 4: Responsible Persons
  manager_id?: string;
  mentor_id?: string;
  hr_manager_id?: string;
  
  // Step 5: Access and Resources
  equipment_needed: string[];
  software_needed: string[];
  equipment_notes?: string; // Примечания к оборудованию
  office_location?: string;
  office_floor?: string;
  office_room?: string;
  workplace_number?: string;
  work_format: 'office' | 'remote' | 'hybrid';
  create_it_request: boolean;
  
  // Step 6: Onboarding Plan
  onboarding_type: 'standard' | 'accelerated' | 'custom';
  onboarding_template_id?: string;
  custom_onboarding_plan?: OnboardingPlan;
}

export interface OnboardingPlan {
  duration_days: number;
  milestones: OnboardingMilestone[];
}

export interface OnboardingMilestone {
  day: number;
  title: string;
  description?: string;
  tasks: OnboardingTaskTemplate[];
}

// --- Hat File (Шляпная папка) Types ---

export interface HatFile {
  id: string;
  employee_id: string;
  post_id: string;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  
  // Sections согласно структуре из документов
  // Раздел 1: Содержание
  basic_data: HatFileBasicData;
  
  // Раздел 2: Описание обязанностей
  responsibilities_description: HatFileResponsibilitiesDescription;
  
  // Раздел 3: Контрольный лист
  checksheets: HatFileChecksheet[];
  
  // Дополнительные разделы
  regulations: HatFileRegulations; // Регламенты и политики
  training_materials: HatFileTrainingMaterials; // Обучающие материалы
  development_roadmap: HatFileDevelopmentRoadmap; // Маршрутная карта развития
  tools_access: HatFileToolsAccess; // Инструменты и доступы
  history: HatFileHistory; // История сотрудника на посту
  additional: HatFileAdditional; // Дополнительные материалы
}

// Раздел 2: Описание обязанностей
export interface HatFileResponsibilitiesDescription {
  // Общее
  general: {
    department_structure?: string; // Структура отдела
    production_cycle_connection?: string; // Взаимосвязь с производственным циклом отдела
    other_info?: string; // Другая информация, относящаяся к посту
  };
  
  // Список обязанностей с подробным описанием
  responsibilities: ResponsibilityDescription[];
}

// Подробное описание обязанности
export interface ResponsibilityDescription {
  id: string;
  title: string; // Название обязанности (из списка)
  sequence_order: number; // Порядок в списке (от продукта к началу)
  
  // Структура описания обязанности:
  brief_description: string; // а) Краткое описание обязанности
  expected_product: string; // б) Ожидаемый продукт (результат) от этой обязанности
  action_sequence: ActionStep[]; // в) Последовательность действий
  
  // Успешные действия
  successful_actions: SuccessfulAction[];
  
  // Тренировочные упражнения
  training_exercises: TrainingExercise[];
}

// Шаг действия в последовательности
export interface ActionStep {
  id: string;
  order: number;
  description: string;
  details?: string; // Подробности, как именно выполнять
  highlights?: string[]; // "Изюминки" - что делает выполнение изумительным
}

// Успешное действие
export interface SuccessfulAction {
  id: string;
  title: string;
  description: string;
  discovered_by?: string; // Кто обнаружил
  discovered_at?: string;
  added_at: string;
}

// Тренировочное упражнение
export interface TrainingExercise {
  id: string;
  title: string;
  description: string;
  type: 'with_quota' | 'without_quota'; // С квотой или без
  quota?: string; // Квота (если есть)
  added_to_checksheet: boolean; // Добавлено ли в контрольный лист
}

export interface HatFileBasicData {
  // Раздел 1: Содержание (Content)
  post_name: string; // Название поста
  company_goal?: string; // Цель компании
  post_goal?: string; // Цель поста
  department_name?: string; // К какому отделу относится
  responsibilities: string[]; // Список обязанностей (заголовки)
  products: string[]; // Продукты поста (VFP)
  statistics: string[]; // Статистики поста (1-4 шт)
  org_chart_position?: string; // Место на оргсхеме
  reporting_line?: string; // Линия подчинения
  communication_lines?: string[]; // Линии коммуникации
}

export interface HatFileRegulations {
  documents: HatFileDocument[];
  links: HatFileLink[];
}

export interface HatFileDocument {
  id: string;
  name: string;
  file_path: string;
  file_url?: string;
  category: string;
  version: number;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface HatFileLink {
  id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
}

export interface HatFileTrainingMaterials {
  courses: HatFileCourse[];
  videos: HatFileVideo[];
  presentations: HatFilePresentation[];
}

export interface HatFileCourse {
  id: string;
  course_id: string; // ID из Академии
  title: string;
  duration_hours: number;
  required: boolean;
  assigned_at: string;
  completed_at?: string;
  progress?: number;
}

export interface HatFileVideo {
  id: string;
  title: string;
  url: string;
  duration?: number;
  description?: string;
}

export interface HatFilePresentation {
  id: string;
  title: string;
  file_path: string;
  file_url?: string;
}

export interface HatFileDevelopmentRoadmap {
  levels: DevelopmentLevel[];
}

export interface DevelopmentLevel {
  id: string;
  level_name: string; // Стажер, Младший специалист, etc.
  level_number: number;
  goal: string;
  duration_days?: number;
  steps: DevelopmentStep[];
  transition_criteria: string[];
}

export interface DevelopmentStep {
  id: string;
  title: string;
  description?: string;
  type: 'course' | 'task' | 'practice' | 'exam' | 'checkout';
  course_id?: string;
  duration_hours?: number;
  due_days?: number; // Дни от начала уровня
  completed: boolean;
  completed_at?: string;
}

export interface HatFileChecksheet {
  id: string;
  name: string;
  template_id?: string;
  employee_id: string; // Связь с сотрудником
  post_id: string; // Связь с постом
  items: ChecksheetItem[];
  assigned_at: string;
  started_at?: string; // Дата начала работы с контрольным листом
  completed_at?: string;
  instructions?: string; // Инструкция как работать с контрольным листом
  
  // Завершение обучения
  completion?: ChecksheetCompletion;
}

export interface ChecksheetItem {
  id: string;
  sequence_number: number; // Номер в списке (1, 2, 3...)
  text: string; // Текст задания
  type: ChecksheetItemType; // Тип задания
  description?: string; // Подробное описание задания
  
  // Связь с материалами из шляпной папки
  linked_section?: 'content' | 'responsibilities' | 'regulations' | 'training' | 'roadmap' | 'tools' | 'additional';
  linked_material_id?: string; // ID конкретного материала (документа, курса и т.д.)
  linked_material_url?: string; // Прямая ссылка на материал
  
  // Выполнение
  checked: boolean;
  checked_at?: string;
  checked_by?: string; // Инициалы или ID проверяющего
  completion_date?: string; // Дата выполнения
  
  // Результаты выполнения
  submission?: ChecksheetItemSubmission; // Прикрепленный результат (эссе, зарисовка и т.д.)
  notes?: string; // Заметки проверяющего
  requires_revision?: boolean; // Требует доработки
  revision_notes?: string; // Комментарии по доработке
  
  // Для заданий типа "прояснение слов"
  glossary_terms?: string[]; // Список терминов для прояснения
}

export type ChecksheetItemType = 
  | 'practical' // Практическое задание
  | 'theoretical' // Теоретическое задание
  | 'essay' // Эссе
  | 'sketch' // Зарисовка
  | 'reading' // Прочитать раздел/материал
  | 'memorize' // Выучить наизусть
  | 'training' // Тренировка
  | 'glossary' // Прояснение слов в глоссарии
  | 'online_course' // Пройти онлайн-курс
  | 'inspection' // Провести инспекцию
  | 'coordination' // Провести координацию
  | 'other'; // Другое

export interface ChecksheetItemSubmission {
  id: string;
  item_id: string;
  type: 'essay' | 'sketch' | 'file' | 'link' | 'text';
  content?: string; // Текст эссе или описания
  file_url?: string; // Ссылка на прикрепленный файл
  file_name?: string;
  link_url?: string; // Ссылка на внешний ресурс
  submitted_at: string;
  submitted_by: string; // ID сотрудника
}

export interface ChecksheetCompletion {
  // Декларация стажера
  trainee_declaration: string; // "Я выполнил все требования..."
  trainee_signature?: string; // Подпись стажера
  trainee_signature_date?: string;
  
  // Декларация ответственного за обучение
  trainer_declaration: string; // "Я обучил этого стажера хорошо..."
  trainer_signature?: string; // Подпись ответственного
  trainer_signature_date?: string;
  trainer_id?: string; // ID ответственного за обучение
}

export interface HatFileToolsAccess {
  software: SoftwareAccess[];
  equipment: EquipmentItem[];
  accounts: AccountAccess[];
}

export interface SoftwareAccess {
  id: string;
  name: string;
  required: boolean;
  access_granted: boolean;
  granted_at?: string;
  login?: string;
  notes?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  required: boolean;
  provided: boolean;
  provided_at?: string;
  serial_number?: string;
  notes?: string;
}

export interface AccountAccess {
  id: string;
  service_name: string;
  email?: string;
  login?: string;
  access_granted: boolean;
  granted_at?: string;
}

export interface HatFileHistory {
  events: HistoryEvent[];
}

export interface HistoryEvent {
  id: string;
  date: string;
  type: 'appointment' | 'training' | 'correction' | 'achievement' | 'status_change';
  title: string;
  description?: string;
  related_id?: string;
}

export interface HatFileAdditional {
  faq: FAQItem[];
  knowledge_base: KnowledgeBaseItem[];
  best_practices: BestPractice[];
  external_links: ExternalLink[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface BestPractice {
  id: string;
  title: string;
  description: string;
  example?: string;
}

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  description?: string;
}
