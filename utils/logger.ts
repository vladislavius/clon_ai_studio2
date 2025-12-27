/**
 * Утилита для условного логирования
 * В продакшн режиме логи не выводятся (кроме ошибок)
 */

const DEBUG = import.meta.env.DEV;

/**
 * Логирует сообщение только в режиме разработки
 */
export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Логирует предупреждение только в режиме разработки
 */
export function debugWarn(...args: unknown[]): void {
  if (DEBUG) {
    console.warn('[WARN]', ...args);
  }
}

/**
 * Логирует ошибку (всегда, даже в продакшн)
 */
export function logError(...args: unknown[]): void {
  console.error('[ERROR]', ...args);
}

/**
 * Логирует информацию (только в dev)
 */
export function logInfo(...args: unknown[]): void {
  if (DEBUG) {
    console.info('[INFO]', ...args);
  }
}

/**
 * Логирует успешную операцию (только в dev)
 */
export function logSuccess(message: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.log('✅', message, ...args);
  }
}



