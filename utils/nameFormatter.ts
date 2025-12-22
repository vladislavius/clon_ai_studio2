/**
 * Утилиты для форматирования имен
 */

/**
 * Преобразует полное ФИО в сокращенный формат (Фамилия И.О.)
 * Пример: "Доценко Олег Юрьевич" -> "Доценко О.Ю."
 * Пример: "Ivanov Ivan" -> "Ivanov I."
 */
export function formatAbbreviatedName(fullName: string): string {
  if (!fullName || !fullName.trim()) {
    return '';
  }

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) {
    return '';
  }

  // Если только одно слово - возвращаем как есть
  if (parts.length === 1) {
    return parts[0];
  }

  // Первое слово - фамилия
  const surname = parts[0];
  
  // Остальные слова - имена и отчества
  const initials = parts.slice(1).map(part => {
    // Берем первую букву и добавляем точку
    return part.charAt(0).toUpperCase() + '.';
  }).join('');

  return `${surname} ${initials}`;
}

/**
 * Извлекает ФИО из строки "должность ФИО" или просто ФИО
 * Пример: "Руководитель 5 и 6 департамента Доценко Олег Юрьевич" -> "Доценко Олег Юрьевич"
 * Пример: "упаковка блога Глушко Елизавета Николаевна" -> "Глушко Елизавета Николаевна"
 */
export function extractFullName(text: string): string {
  if (!text || !text.trim()) {
    return '';
  }

  // Пытаемся найти ФИО (обычно это последние 2-3 слова)
  const words = text.trim().split(/\s+/).filter(Boolean);
  
  // Если слов меньше 2, возвращаем как есть
  if (words.length < 2) {
    return text.trim();
  }

  // Берем последние 2-3 слова (обычно это ФИО)
  // ФИО обычно состоит из 2-3 слов: Фамилия Имя или Фамилия Имя Отчество
  const possibleName = words.slice(-3).join(' ');
  
  // Проверяем, начинается ли с заглавной буквы (фамилия обычно с заглавной)
  if (words[words.length - 3] && words[words.length - 3][0] === words[words.length - 3][0].toUpperCase()) {
    return possibleName;
  }
  
  // Если не нашли, берем последние 2 слова
  if (words.length >= 2) {
    return words.slice(-2).join(' ');
  }

  return text.trim();
}


