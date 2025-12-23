/**
 * Типы для административной технологии Хаббарда
 * ЦКП (Ценный Конечный Продукт) и управление по статистикам
 */

// ЦКП компании
export interface CompanyVFP {
  id: string;
  title: string;        // ЦКП компании
  description: string;  // Краткое описание
}

// Дивизион (1–7)
export interface Division {
  id: string;           // "1", "2", ...
  name: string;         // "1. Построения"
  color: string;        // цвет для UI
  mainProduct: string;  // главный продукт дивизиона (ВФП)
  mainStatId: string;   // id ключевой статистики
}

// Отдел внутри дивизиона
export interface Department {
  id: string;
  divisionId: string;
  name: string;         // "Отдел 2.6 — Продаж"
  vfp: string;          // ВФП отдела
  mainStatId: string;
}

// Тип тренда статистики
export type StatTrend = "UP" | "DOWN" | "FLAT";

// Тип владельца статистики
export type StatOwnerType = "COMPANY" | "DIVISION" | "DEPARTMENT" | "EMPLOYEE";

// Статистика
export interface Stat {
  id: string;
  name: string;
  ownerType: StatOwnerType;
  ownerId: string;        // id компании/дивизиона/отдела/сотрудника
  unit: string;          // "THB", "шт", "%"
  period: "WEEK" | "MONTH";
  plan: number;          // план на период
  fact: number;          // факт за текущий период
  previousFact: number;  // факт за предыдущий период
  trend: StatTrend;      // вычисляется на основе previousFact/fact
  changePercent: number; // дельта, %
  history?: number[];    // история значений для графика
}

// Условие (Normal, Affluence, и т.д.)
export type ConditionLevel =
  | "NON_EXISTENCE"
  | "DANGER"
  | "EMERGENCY"
  | "NORMAL"
  | "AFFLUENCE"
  | "POWER";

// Рекомендованное условие по статистике
export interface StatCondition {
  statId: string;
  level: ConditionLevel;
  reason: string; // короткое объяснение: "Резкий рост 80% за неделю" и т.п.
}

// Сотрудник
export interface Employee {
  id: string;
  fullName: string;
  position: string;
  departmentId: string;
  avatarUrl?: string;
}

// История статистики для графика
export interface StatHistory {
  statId: string;
  period: string; // "2024-01-W01", "2024-01" и т.п.
  value: number;
}

