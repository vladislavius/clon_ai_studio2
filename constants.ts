import { Department, Employee } from './types';

export const ORGANIZATION_STRUCTURE: { [key: string]: Department } = {
  "dept7": {
      id: "dept7",
      name: "Админ.",
      fullName: "Административный департамент",
      color: "#06b6d4", // Cyan
      icon: "building",
      description: "Административное обеспечение",
      manager: "Генеральный директор",
      departments: {
          "dept7_19": { id: "dept7_19", name: "Офис Генерального директора", code: "7.19", manager: "Секретарь" },
          "dept7_20": { id: "dept7_20", name: "Офис по официальным вопросам", code: "7.20", manager: "Офис-менеджер" },
          "dept7_21": { id: "dept7_21", name: "Офис Совета директоров", code: "7.21", manager: "Секретарь Совета" }
      }
  },
  "dept1": {
      id: "dept1",
      name: "Персонал",
      fullName: "Департамент персонала",
      color: "#fbbf24", // Amber
      icon: "users",
      description: "Управление человеческими ресурсами",
      manager: "HR Директор",
      departments: {
          "dept1_1": { id: "dept1_1", name: "Отдел найма и адаптации", code: "1.1", manager: "Начальник отдела" },
          "dept1_2": { id: "dept1_2", name: "Отдел по работе с коммуникациями", code: "1.2", manager: "Начальник отдела" },
          "dept1_3": { id: "dept1_3", name: "Отдел эффективности персонала", code: "1.3", manager: "Начальник отдела" }
      }
  },
  "dept2": {
      id: "dept2",
      name: "Коммерческий",
      fullName: "Коммерческий департамент",
      color: "#8b5cf6", // Violet
      icon: "briefcase",
      description: "Продажи и клиентские отношения",
      manager: "Коммерческий директор",
      departments: {
          "dept2_4": { id: "dept2_4", name: "Отдел маркетинга и продвижения", code: "2.4", manager: "Начальник отдела" },
          "dept2_5": { id: "dept2_5", name: "Отдел контента и понимания", code: "2.5", manager: "Начальник отдела" },
          "dept2_6": { id: "dept2_6", name: "Отдел продаж", code: "2.6", manager: "Начальник отдела" }
      }
  },
  "dept3": {
      id: "dept3",
      name: "Финансы",
      fullName: "Финансовый департамент",
      color: "#ec4899", // Pink
      icon: "trending-up",
      description: "Финансовое планирование и контроль",
      manager: "Финансовый директор",
      departments: {
          "dept3_7": { id: "dept3_7", name: "Отдел управления доходами", code: "3.7", manager: "Руководитель не назначен" },
          "dept3_8": { id: "dept3_8", name: "Отдел управления расходами", code: "3.8", manager: "Начальник отдела" },
          "dept3_9": { id: "dept3_9", name: "Отдел учета", code: "3.9", manager: "Главный бухгалтер" }
      }
  },
  "dept4": {
      id: "dept4",
      name: "Производство",
      fullName: "Департамент производства",
      color: "#10b981", // Emerald
      icon: "settings",
      description: "Производственные процессы",
      manager: "Директор по производству",
      departments: {
          "dept4_10": { id: "dept4_10", name: "Отдел бронирования", code: "4.10", manager: "Начальник отдела" },
          "dept4_11": { id: "dept4_11", name: "Отдел транспорта", code: "4.11", manager: "Начальник отдела" },
          "dept4_12": { id: "dept4_12", name: "Отдел предоставления", code: "4.12", manager: "Начальник отдела" }
      }
  },
  "dept5": {
      id: "dept5",
      name: "Квалификация",
      fullName: "Департамент квалификации",
      color: "#3b82f6", // Blue
      icon: "award",
      description: "Контроль качества и обучение",
      manager: "Директор по качеству",
      departments: {
          "dept5_13": { id: "dept5_13", name: "Отдел контроля качества", code: "5.13", manager: "Начальник отдела" },
          "dept5_14": { id: "dept5_14", name: "Отдел обучения персонала", code: "5.14", manager: "Начальник отдела" },
          "dept5_15": { id: "dept5_15", name: "Отдел совершенствования", code: "5.15", manager: "Начальник отдела" }
      }
  },
  "dept6": {
      id: "dept6",
      name: "Расширение",
      fullName: "Департамент расширения",
      color: "#f97316", // Orange
      icon: "globe",
      description: "Развитие и расширение бизнеса",
      manager: "Директор по развитию",
      departments: {
          "dept6_16": { id: "dept6_16", name: "Отдел связи с общественностью", code: "6.16", manager: "Руководитель не назначен" },
          "dept6_17": { id: "dept6_17", name: "Отдел вводных услуг", code: "6.17", manager: "Руководитель не назначен" },
          "dept6_18": { id: "dept6_18", name: "Отдел партнеров", code: "6.18", manager: "Родникова Елена Николаевна" }
      }
  }
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
      id: "95cdbe41-3d38-426e-b9b5-4f8248458a66",
      created_at: "2023-10-12T23:16:25.037+00:00",
      updated_at: "2023-10-12T23:16:25.037+00:00",
      full_name: "Иванов Иван Иванович",
      position: "Менеджер по продажам",
      nickname: "ivanov_ii",
      birth_date: "1990-05-15",
      phone: "+7 (999) 123-45-67",
      email: "ivanov@company.com",
      email2: "ivanov_personal@gmail.com",
      telegram: "@ivanov_sales",
      whatsapp: "+79991234567",
      department: ["dept2"],
      subdepartment: ["dept2_6"],
      actual_address: "Москва, ул. Тверская, 1",
      registration_address: "Москва, ул. Ленина, 5",
      bank_name: "Сбербанк",
      bank_details: "40817810000000000123",
      inn: "770123456789",
      photo_url: "https://picsum.photos/200/200?random=1",
      emergency_contacts: [],
      custom_fields: [],
      attachments: []
  },
  {
      id: "test-employee-1",
      created_at: "2023-10-13T00:00:00.000+00:00",
      updated_at: "2023-10-13T00:00:00.000+00:00",
      full_name: "Петров Петр Петрович",
      position: "Начальник отдела",
      nickname: "petrov_pp",
      birth_date: "1985-03-20",
      phone: "+7 (999) 555-01-23",
      email: "petrov@company.com",
      department: ["dept1"],
      subdepartment: ["dept1_1"],
      photo_url: "https://picsum.photos/200/200?random=2",
      emergency_contacts: [],
      custom_fields: [],
      attachments: []
  },
  {
      id: "test-employee-2",
      created_at: "2023-10-13T00:00:00.000+00:00",
      updated_at: "2023-10-13T00:00:00.000+00:00",
      full_name: "Сидорова Анна Ивановна",
      position: "Коммерческий директор",
      nickname: "sidorova_ai",
      birth_date: "1988-07-10",
      phone: "+7 (999) 555-04-56",
      email: "sidorova@company.com",
      department: ["dept2"],
      subdepartment: ["dept2_4"],
      photo_url: "https://picsum.photos/200/200?random=3",
      emergency_contacts: [],
      custom_fields: [],
      attachments: []
  }
];