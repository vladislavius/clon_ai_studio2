import { useState, useEffect } from 'react';

/**
 * Хук для debounce значения
 * Задерживает обновление значения на указанное время
 * Полезно для оптимизации поиска и других частых обновлений
 * 
 * @param value - Значение для debounce
 * @param delay - Задержка в миллисекундах (по умолчанию 300ms)
 * @returns Debounced значение
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * // searchTerm обновляется при каждом вводе
 * // debouncedSearchTerm обновляется только через 300ms после последнего ввода
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Устанавливаем таймер для обновления значения
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Очищаем таймер при изменении value или delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}





