/**
 * Безопасное хранилище с базовым шифрованием для токенов и чувствительных данных
 * 
 * ВАЖНО: Это базовая защита от XSS. Для продакшена рекомендуется:
 * - Использовать серверное хранение токенов
 * - Использовать более сильное шифрование (Web Crypto API)
 * - Использовать httpOnly cookies для токенов
 */

/**
 * Базовое кодирование (не является криптографически стойким, но защищает от случайного просмотра)
 */
function encode(value: string): string {
  try {
    // Используем base64 для базового кодирования
    // В продакшене лучше использовать Web Crypto API
    return btoa(encodeURIComponent(value));
  } catch (e) {
    console.error('Encoding error:', e);
    return value; // Fallback на исходное значение
  }
}

/**
 * Декодирование
 */
function decode(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch (e) {
    console.error('Decoding error:', e);
    return encoded; // Fallback на исходное значение
  }
}

/**
 * Безопасное хранилище для чувствительных данных
 */
export const secureStorage = {
  /**
   * Сохраняет значение с кодированием
   * @param key - Ключ
   * @param value - Значение для сохранения
   */
  setItem(key: string, value: string): void {
    try {
      const encoded = encode(value);
      localStorage.setItem(`secure_${key}`, encoded);
    } catch (e) {
      console.error('Secure storage setItem error:', e);
      // Fallback на обычное хранилище если localStorage недоступен
    }
  },

  /**
   * Получает значение с декодированием
   * @param key - Ключ
   * @returns Декодированное значение или null
   */
  getItem(key: string): string | null {
    try {
      const encoded = localStorage.getItem(`secure_${key}`);
      if (!encoded) return null;
      return decode(encoded);
    } catch (e) {
      console.error('Secure storage getItem error:', e);
      return null;
    }
  },

  /**
   * Удаляет значение
   * @param key - Ключ
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(`secure_${key}`);
    } catch (e) {
      console.error('Secure storage removeItem error:', e);
    }
  },

  /**
   * Очищает все зашифрованные данные
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('Secure storage clear error:', e);
    }
  },
};

/**
 * Предупреждение о безопасности для разработчиков
 */
export const SECURITY_WARNING = `
⚠️ ВНИМАНИЕ: Безопасность
========================

Текущая реализация использует базовое кодирование для защиты от случайного просмотра.
Это НЕ является криптографически стойким решением.

Рекомендации для продакшена:
1. Хранить токены на сервере (httpOnly cookies)
2. Использовать Web Crypto API для шифрования
3. Реализовать токены с коротким временем жизни
4. Использовать refresh tokens
5. Реализовать rate limiting на сервере

Текущее решение подходит только для разработки и демо.
`;

