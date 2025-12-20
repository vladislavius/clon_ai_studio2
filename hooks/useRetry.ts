/**
 * Хук для повторных попыток выполнения запросов (retry logic)
 * Используется для обработки сетевых ошибок и временных сбоев
 */

import { useCallback } from 'react';

// === ТИПЫ ===

export interface RetryOptions {
    /** Количество попыток (по умолчанию 3) */
    maxRetries?: number;
    /** Начальная задержка в мс (по умолчанию 1000) */
    initialDelay?: number;
    /** Множитель для экспоненциальной задержки (по умолчанию 2) */
    backoffMultiplier?: number;
    /** Максимальная задержка в мс (по умолчанию 10000) */
    maxDelay?: number;
    /** Функция для определения, нужно ли повторять попытку */
    shouldRetry?: (error: unknown, attemptNumber: number) => boolean;
    /** Callback при каждой попытке */
    onRetry?: (error: unknown, attemptNumber: number, delay: number) => void;
}

export interface UseRetryReturn {
    /** Функция для выполнения операции с повторными попытками */
    fetchWithRetry: <T>(fn: () => Promise<T>, options?: RetryOptions) => Promise<T>;
}

// === КОНСТАНТЫ ===

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
};

// === ХУК ===

/**
 * Хук для retry логики
 * @returns Объект с функцией fetchWithRetry
 */
export function useRetry(): UseRetryReturn {
    const fetchWithRetry = useCallback(async <T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> => {
        const {
            maxRetries = DEFAULT_OPTIONS.maxRetries,
            initialDelay = DEFAULT_OPTIONS.initialDelay,
            backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
            maxDelay = DEFAULT_OPTIONS.maxDelay,
            shouldRetry = defaultShouldRetry,
            onRetry,
        } = options;

        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Пытаемся выполнить функцию
                return await fn();
            } catch (error) {
                lastError = error;

                // Если это последняя попытка, выбрасываем ошибку
                if (attempt === maxRetries) {
                    throw error;
                }

                // Проверяем, нужно ли повторять попытку
                if (!shouldRetry(error, attempt + 1)) {
                    throw error;
                }

                // Вычисляем задержку с экспоненциальным backoff
                const delay = Math.min(
                    initialDelay * Math.pow(backoffMultiplier, attempt),
                    maxDelay
                );

                // Вызываем callback если есть
                if (onRetry) {
                    onRetry(error, attempt + 1, delay);
                }

                // Логируем попытку
                console.warn(
                    `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
                    error
                );

                // Ждем перед следующей попыткой
                await sleep(delay);
            }
        }

        // Этот код не должен выполниться, но TypeScript требует return
        throw lastError;
    }, []);

    return { fetchWithRetry };
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Функция по умолчанию для определения, нужно ли повторять попытку
 * @param error - Ошибка
 * @param attemptNumber - Номер попытки
 * @returns true если нужно повторить попытку
 */
function defaultShouldRetry(error: unknown, attemptNumber: number): boolean {
    // Повторяем только для сетевых ошибок
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Сетевые ошибки
        if (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('timeout') ||
            message.includes('connection') ||
            message.includes('ssl') ||
            message.includes('econnrefused') ||
            message.includes('enotfound')
        ) {
            return true;
        }

        // Ошибки Supabase, которые могут быть временными
        if (
            message.includes('too many connections') ||
            message.includes('connection timeout') ||
            message.includes('server error')
        ) {
            return true;
        }
    }

    // Не повторяем для других типов ошибок
    return false;
}

/**
 * Промис-обертка для setTimeout
 * @param ms - Время ожидания в миллисекундах
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === УТИЛИТАРНЫЕ ФУНКЦИИ (без хука) ===

/**
 * Standalone функция для retry без использования хука
 * Полезна для использования вне React компонентов
 * @param fn - Функция для выполнения
 * @param options - Опции retry
 * @returns Результат выполнения функции
 */
export async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = DEFAULT_OPTIONS.maxRetries,
        initialDelay = DEFAULT_OPTIONS.initialDelay,
        backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
        maxDelay = DEFAULT_OPTIONS.maxDelay,
        shouldRetry = defaultShouldRetry,
        onRetry,
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries) {
                throw error;
            }

            if (!shouldRetry(error, attempt + 1)) {
                throw error;
            }

            const delay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt),
                maxDelay
            );

            if (onRetry) {
                onRetry(error, attempt + 1, delay);
            }

            console.warn(
                `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
                error
            );

            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Проверяет, является ли ошибка сетевой
 * @param error - Ошибка для проверки
 * @returns true если ошибка сетевая
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('timeout') ||
            message.includes('connection') ||
            message.includes('ssl')
        );
    }
    return false;
}
