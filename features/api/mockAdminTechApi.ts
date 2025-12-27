/**
 * Mock API для административной технологии
 * Симулирует загрузку данных с сервера
 */

import {
  CompanyVFP,
  Division,
  Department,
  Stat,
  Employee,
  StatCondition,
  StatOwnerType,
  StatHistory,
} from '../../shared/types/adminTech';

// Mock данные
const mockCompanyVFP: CompanyVFP = {
  id: 'company-vfp',
  title: 'ЦКП компании: Успешные туры на Пхукете',
  description: 'Обеспечение качественного отдыха и незабываемых впечатлений для туристов на Пхукете',
};

const mockDivisions: Division[] = [
  {
    id: '1',
    name: '1. Построения',
    color: '#fbbf24', // amber
    mainProduct: 'Построение эффективной организационной структуры',
    mainStatId: 'stat-div-1-main',
  },
  {
    id: '2',
    name: '2. Коммерческий',
    color: '#a855f7', // purple
    mainProduct: 'Продажа туров и услуг',
    mainStatId: 'stat-div-2-main',
  },
  {
    id: '3',
    name: '3. Финансовый',
    color: '#ec4899', // pink
    mainProduct: 'Финансовая стабильность и прибыль',
    mainStatId: 'stat-div-3-main',
  },
  {
    id: '4',
    name: '4. Производства',
    color: '#10b981', // emerald
    mainProduct: 'Организация туров и экскурсий',
    mainStatId: 'stat-div-4-main',
  },
  {
    id: '5',
    name: '5. Качества',
    color: '#6b7280', // gray
    mainProduct: 'Качество обслуживания клиентов',
    mainStatId: 'stat-div-5-main',
  },
  {
    id: '6',
    name: '6. Расширения',
    color: '#f97316', // orange
    mainProduct: 'Расширение клиентской базы',
    mainStatId: 'stat-div-6-main',
  },
  {
    id: '7',
    name: '7. Административный',
    color: '#3b82f6', // blue
    mainProduct: 'Административное управление',
    mainStatId: 'stat-div-7-main',
  },
];

const mockDepartments: Department[] = [
  {
    id: 'dept-2-6',
    divisionId: '2',
    name: 'Отдел 2.6 — Продаж',
    vfp: 'Продажа туров и дополнительных услуг',
    mainStatId: 'stat-dept-2-6-main',
  },
  {
    id: 'dept-2-4',
    divisionId: '2',
    name: 'Отдел 2.4 — Маркетинга',
    vfp: 'Привлечение новых клиентов через маркетинг',
    mainStatId: 'stat-dept-2-4-main',
  },
  {
    id: 'dept-4-1',
    divisionId: '4',
    name: 'Отдел 4.1 — Организации туров',
    vfp: 'Организация и проведение туров',
    mainStatId: 'stat-dept-4-1-main',
  },
];

const mockStats: Stat[] = [
  // Статистики дивизионов
  {
    id: 'stat-div-2-main',
    name: 'Выручка от продаж',
    ownerType: 'DIVISION',
    ownerId: '2',
    unit: 'THB',
    period: 'MONTH',
    plan: 5000000,
    fact: 5200000,
    previousFact: 4800000,
    trend: 'UP',
    changePercent: 8.33,
    history: [4500000, 4600000, 4800000, 5200000],
  },
  {
    id: 'stat-div-3-main',
    name: 'Чистая прибыль',
    ownerType: 'DIVISION',
    ownerId: '3',
    unit: 'THB',
    period: 'MONTH',
    plan: 1000000,
    fact: 950000,
    previousFact: 1100000,
    trend: 'DOWN',
    changePercent: -13.64,
    history: [1200000, 1100000, 1100000, 950000],
  },
  {
    id: 'stat-div-4-main',
    name: 'Количество проведенных туров',
    ownerType: 'DIVISION',
    ownerId: '4',
    unit: 'шт',
    period: 'WEEK',
    plan: 50,
    fact: 48,
    previousFact: 52,
    trend: 'DOWN',
    changePercent: -7.69,
    history: [55, 52, 52, 48],
  },
  // Статистики отделов
  {
    id: 'stat-dept-2-6-main',
    name: 'Продажи туров',
    ownerType: 'DEPARTMENT',
    ownerId: 'dept-2-6',
    unit: 'THB',
    period: 'WEEK',
    plan: 1200000,
    fact: 1350000,
    previousFact: 1150000,
    trend: 'UP',
    changePercent: 17.39,
    history: [1100000, 1150000, 1150000, 1350000],
  },
  {
    id: 'stat-dept-2-4-main',
    name: 'Новые лиды',
    ownerType: 'DEPARTMENT',
    ownerId: 'dept-2-4',
    unit: 'шт',
    period: 'WEEK',
    plan: 100,
    fact: 85,
    previousFact: 95,
    trend: 'DOWN',
    changePercent: -10.53,
    history: [110, 95, 95, 85],
  },
];

const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    fullName: 'Иванов Иван Иванович',
    position: 'Менеджер по продажам',
    departmentId: 'dept-2-6',
    avatarUrl: undefined,
  },
  {
    id: 'emp-2',
    fullName: 'Петрова Мария Сергеевна',
    position: 'Старший менеджер',
    departmentId: 'dept-2-6',
    avatarUrl: undefined,
  },
  {
    id: 'emp-3',
    fullName: 'Сидоров Петр Александрович',
    position: 'Маркетолог',
    departmentId: 'dept-2-4',
    avatarUrl: undefined,
  },
];

// Функции API
export async function getCompanyVFP(): Promise<CompanyVFP> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockCompanyVFP;
}

export async function getDivisionsWithStats(): Promise<Division[]> {
  await new Promise(resolve => setTimeout(resolve, 400));
  return mockDivisions;
}

export async function getDepartmentsByDivision(divisionId: string): Promise<Department[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockDepartments.filter(dept => dept.divisionId === divisionId);
}

export async function getStatsByOwner(ownerType: StatOwnerType, ownerId: string): Promise<Stat[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockStats.filter(stat => stat.ownerType === ownerType && stat.ownerId === ownerId);
}

export async function getAllStats(): Promise<Stat[]> {
  await new Promise(resolve => setTimeout(resolve, 400));
  return mockStats;
}

export async function getStatById(statId: string): Promise<Stat | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockStats.find(stat => stat.id === statId) || null;
}

export async function getEmployeesByDepartment(departmentId: string): Promise<Employee[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockEmployees.filter(emp => emp.departmentId === departmentId);
}

export async function getSuggestedConditionForStat(statId: string): Promise<StatCondition | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const stat = mockStats.find(s => s.id === statId);
  if (!stat) return null;

  // Простая логика определения условия
  const changePercent = stat.changePercent;
  const isStable = stat.history && stat.history.length >= 3 
    ? Math.abs(stat.history[stat.history.length - 1] - stat.history[stat.history.length - 2]) / stat.history[stat.history.length - 2] < 0.1
    : false;

  let level: import('../../shared/types/adminTech').ConditionLevel = 'NORMAL';
  let reason = '';

  if (changePercent > 50 && isStable) {
    level = 'POWER';
    reason = 'Очень высокий и стабильный рост';
  } else if (changePercent > 30) {
    level = 'AFFLUENCE';
    reason = `Резкий рост на ${changePercent.toFixed(1)}%`;
  } else if (changePercent > 10) {
    level = 'NORMAL';
    reason = `Умеренный рост на ${changePercent.toFixed(1)}%`;
  } else if (changePercent > -10) {
    level = 'NORMAL';
    reason = 'Стабильные показатели';
  } else if (changePercent > -30) {
    level = 'EMERGENCY';
    reason = `Падение на ${Math.abs(changePercent).toFixed(1)}%`;
  } else if (changePercent > -50) {
    level = 'DANGER';
    reason = `Сильное падение на ${Math.abs(changePercent).toFixed(1)}%`;
  } else {
    level = 'NON_EXISTENCE';
    reason = `Критическое падение на ${Math.abs(changePercent).toFixed(1)}%`;
  }

  return {
    statId,
    level,
    reason,
  };
}

export async function updateStatPlan(statId: string, newPlan: number): Promise<Stat> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const stat = mockStats.find(s => s.id === statId);
  if (!stat) throw new Error('Stat not found');
  
  stat.plan = newPlan;
  return stat;
}

export async function getStatHistory(statId: string, periods: number = 12): Promise<StatHistory[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const stat = mockStats.find(s => s.id === statId);
  if (!stat || !stat.history) return [];

  return stat.history.map((value, index) => ({
    statId,
    period: `2024-W${periods - stat.history!.length + index + 1}`,
    value,
  }));
}


