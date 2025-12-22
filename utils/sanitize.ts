/**
 * Утилиты для санитизации пользовательского ввода
 * Защита от XSS атак
 */

import DOMPurify from 'dompurify';

/**
 * Санитизирует HTML контент, удаляя потенциально опасные теги и атрибуты
 * @param dirty - Небезопасный HTML контент
 * @returns Санитизированный HTML
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') {
    // SSR fallback - просто экранируем HTML
    return sanitizeText(dirty);
  }

  // Используем DOMPurify для удаления всех HTML тегов, сохраняя только текст
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // Запрещаем все HTML теги по умолчанию
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Сохраняем текстовое содержимое
  });
}

/**
 * Санитизирует HTML контент, разрешая безопасные теги для rich text
 * Используйте ТОЛЬКО если действительно нужен HTML (например, для заметок)
 * @param dirty - Небезопасный HTML контент
 * @returns Санитизированный HTML с разрешенными тегами
 */
export function sanitizeRichHTML(dirty: string): string {
  if (typeof window === 'undefined') {
    return sanitizeText(dirty);
  }

  // Разрешаем только безопасные теги для форматирования
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Санитизирует текст, экранируя HTML символы
 * Используется для обычного текста, где HTML не нужен
 * @param text - Текст для санитизации
 * @returns Экранированный текст
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Экранируем HTML символы
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Санитизирует URL, проверяя его безопасность
 * @param url - URL для проверки
 * @returns Безопасный URL или пустая строка
 */
export function sanitizeURL(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    // Разрешаем только http и https протоколы
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    // Если URL невалидный, возвращаем пустую строку
    return '';
  }
}

/**
 * Санитизирует объект с пользовательскими данными
 * Рекурсивно обрабатывает все строковые поля
 * @param data - Объект для санитизации
 * @param fields - Список полей, которые нужно санитизировать (опционально)
 * @returns Санитизированный объект
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  data: T,
  fields?: string[]
): T {
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (fields && !fields.includes(key)) {
      continue;
    }

    const value = sanitized[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value) as T[Extract<keyof T, string>];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) : item
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
}





