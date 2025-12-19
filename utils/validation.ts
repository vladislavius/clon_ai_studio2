/**
 * Утилиты для валидации данных
 */

/**
 * Валидирует email адрес
 * @param email - Email адрес для проверки
 * @returns true если email валиден, иначе false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Валидирует телефонный номер
 * @param phone - Телефонный номер для проверки
 * @returns true если телефон валиден, иначе false
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Разрешаем цифры, пробелы, дефисы, плюсы, скобки
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  // Минимум 7 цифр, максимум 15 (международный формат)
  return phoneRegex.test(phone) && cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Валидирует дату
 * @param date - Дата в формате строки (YYYY-MM-DD)
 * @returns true если дата валидна, иначе false
 */
export function validateDate(date: string | null | undefined): boolean {
  if (!date || typeof date !== 'string') return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  // Проверяем формат YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

/**
 * Валидирует дату рождения (не должна быть в будущем)
 * @param birthDate - Дата рождения
 * @returns true если дата валидна, иначе false
 */
export function validateBirthDate(birthDate: string | null | undefined): boolean {
  if (!validateDate(birthDate)) return false;
  const date = new Date(birthDate!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
}

/**
 * Валидирует ИНН (российский формат - 10 или 12 цифр)
 * @param inn - ИНН для проверки
 * @returns true если ИНН валиден, иначе false
 */
export function validateINN(inn: string | null | undefined): boolean {
  if (!inn || typeof inn !== 'string') return false;
  const cleaned = inn.replace(/\s/g, '');
  const innRegex = /^\d{10}$|^\d{12}$/;
  return innRegex.test(cleaned);
}

/**
 * Валидирует Telegram username
 * @param username - Telegram username
 * @returns true если username валиден, иначе false
 */
export function validateTelegram(username: string | null | undefined): boolean {
  if (!username || typeof username !== 'string') return false;
  const telegramRegex = /^@?[a-zA-Z0-9_]{5,32}$/;
  return telegramRegex.test(username.trim());
}

/**
 * Валидирует URL
 * @param url - URL для проверки
 * @returns true если URL валиден, иначе false
 */
export function validateURL(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Валидирует обязательное поле
 * @param value - Значение для проверки
 * @returns true если значение не пустое, иначе false
 */
export function validateRequired(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Получает сообщение об ошибке валидации
 * @param field - Название поля
 * @param value - Значение
 * @param type - Тип валидации
 * @returns Сообщение об ошибке или null
 */
export function getValidationError(
  field: string,
  value: string | null | undefined,
  type: 'email' | 'phone' | 'date' | 'birthDate' | 'inn' | 'telegram' | 'url' | 'required'
): string | null {
  switch (type) {
    case 'email':
      return validateEmail(value || '') ? null : `${field}: неверный формат email`;
    case 'phone':
      return validatePhone(value || '') ? null : `${field}: неверный формат телефона`;
    case 'date':
      return validateDate(value) ? null : `${field}: неверный формат даты`;
    case 'birthDate':
      return validateBirthDate(value) ? null : `${field}: дата рождения не может быть в будущем`;
    case 'inn':
      return validateINN(value) ? null : `${field}: ИНН должен содержать 10 или 12 цифр`;
    case 'telegram':
      return validateTelegram(value) ? null : `${field}: неверный формат Telegram username`;
    case 'url':
      return validateURL(value) ? null : `${field}: неверный формат URL`;
    case 'required':
      return validateRequired(value) ? null : `${field}: обязательное поле`;
    default:
      return null;
  }
}

