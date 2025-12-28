/**
 * Материал курса "Состояния"
 * Этот файл содержит весь материал курса по состояниям
 * Материал будет интегрирован из предоставленных файлов
 */

export interface StateMaterial {
  id: string;
  title: string;
  content: string; // HTML или markdown контент
  order: number;
}

export interface ChecksheetItem {
  id: string;
  sequenceNumber: number;
  text: string;
  type: 'reading' | 'practical' | 'theoretical' | 'essay' | 'training' | 'other';
  description?: string;
  linkedMaterialId?: string; // Связь с материалом
}

// Материал курса по состояниям
export const statesCourseMaterial: StateMaterial[] = [
  // Материал будет добавлен из предоставленных файлов
];

// Контрольный лист для курса по состояниям
export const statesCourseChecksheet: ChecksheetItem[] = [
  // Задания из контрольного листа будут добавлены здесь
];

