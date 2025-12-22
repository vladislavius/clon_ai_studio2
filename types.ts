
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

export type ViewMode = 'employees' | 'org_chart' | 'statistics' | 'settings' | 'onboarding' | 'documents' | 'received_documents';

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
