
import { useToast } from '../components/Toast';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Преобразует различные типы ошибок в понятное сообщение для пользователя
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }
  
  return 'Произошла неизвестная ошибка';
}

/**
 * Определяет тип ошибки и возвращает понятное сообщение
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  // Сетевые ошибки
  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
    return 'Нет соединения с сервером. Проверьте подключение к интернету.';
  }

  if (lowerMessage.includes('ssl') || lowerMessage.includes('certificate')) {
    return 'Ошибка SSL соединения. Обратитесь к администратору.';
  }

  // Ошибки аутентификации
  if (lowerMessage.includes('invalid login credentials') || lowerMessage.includes('invalid credentials')) {
    return 'Неверный Email или пароль.';
  }

  if (lowerMessage.includes('session') || lowerMessage.includes('unauthorized')) {
    return 'Сессия истекла. Пожалуйста, войдите снова.';
  }

  // Ошибки базы данных
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
    return 'Запись с такими данными уже существует.';
  }

  if (lowerMessage.includes('foreign key') || lowerMessage.includes('constraint')) {
    return 'Невозможно выполнить операцию из-за связанных данных.';
  }

  if (lowerMessage.includes('not found')) {
    return 'Запрашиваемые данные не найдены.';
  }

  // Ошибки файлов
  if (lowerMessage.includes('file size') || lowerMessage.includes('too large')) {
    return 'Файл слишком большой. Максимальный размер: 10MB.';
  }

  if (lowerMessage.includes('file type') || lowerMessage.includes('invalid format')) {
    return 'Неподдерживаемый формат файла.';
  }

  // Ошибки валидации
  if (lowerMessage.includes('required') || lowerMessage.includes('обязательно')) {
    return 'Заполните все обязательные поля.';
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('неверный')) {
    return 'Введены неверные данные. Проверьте форму.';
  }

  // Общие ошибки
  if (lowerMessage.includes('permission') || lowerMessage.includes('доступ')) {
    return 'У вас нет прав для выполнения этого действия.';
  }

  if (lowerMessage.includes('timeout')) {
    return 'Превышено время ожидания. Попробуйте позже.';
  }

  // Возвращаем оригинальное сообщение, если не найдено специальное
  return message || 'Произошла ошибка. Попробуйте еще раз.';
}

/**
 * Хук для обработки ошибок с автоматическим показом уведомлений
 */
export function useErrorHandler() {
  const toast = useToast();

  const handleError = useCallback((error: unknown, customMessage?: string) => {
    const message = customMessage || getFriendlyErrorMessage(error);
    toast.error(message);
    
    // Логируем полную ошибку в консоль для разработки
    console.error('Error handled:', error);
    
    return message;
  }, [toast]);

  return { handleError, getFriendlyErrorMessage };
}

/**
 * Обертка для асинхронных функций с автоматической обработкой ошибок
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    } else {
      console.error('Unhandled error:', error);
    }
    return null;
  }
}

