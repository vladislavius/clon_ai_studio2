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
  manager: string;
  departments?: Record<string, SubDepartment>;
}

export interface SubDepartment {
  id: string;
  name: string;
  code: string;
  manager: string;
}

export type ViewMode = 'employees' | 'structure' | 'birthdays' | 'import-export';