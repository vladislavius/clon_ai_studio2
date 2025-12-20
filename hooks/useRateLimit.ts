import { useState, useCallback, useRef } from 'react';

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  locked: boolean;
  lockoutUntil: number | null;
}

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 минут
const DELAY_BASE = 1000; // 1 секунда базовая задержка
const MAX_DELAY = 10000; // Максимальная задержка 10 секунд

/**
 * Хук для ограничения частоты попыток (rate limiting)
 * Используется для защиты от брутфорс атак при аутентификации
 */
export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lastAttempt: 0,
    locked: false,
    lockoutUntil: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Проверяет, можно ли выполнить попытку
   * @throws Error если попытка заблокирована
   */
  const checkRateLimit = useCallback((): void => {
    const now = Date.now();
    const currentState = stateRef.current;

    // Проверяем, не истекла ли блокировка
    if (currentState.locked && currentState.lockoutUntil) {
      if (now < currentState.lockoutUntil) {
        const remainingMinutes = Math.ceil((currentState.lockoutUntil - now) / 60000);
        throw new Error(
          `Слишком много неудачных попыток. Аккаунт заблокирован на ${remainingMinutes} ${remainingMinutes === 1 ? 'минуту' : remainingMinutes < 5 ? 'минуты' : 'минут'}.`
        );
      }
      // Разблокируем, если время истекло
      setState({
        attempts: 0,
        lastAttempt: 0,
        locked: false,
        lockoutUntil: null,
      });
      return;
    }

    // Проверяем количество попыток
    if (currentState.attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = now + LOCKOUT_DURATION;
      setState(prev => ({
        ...prev,
        locked: true,
        lockoutUntil,
        lastAttempt: now,
      }));
      throw new Error(
        `Слишком много неудачных попыток. Аккаунт заблокирован на 15 минут.`
      );
    }
  }, []);

  /**
   * Записывает результат попытки (успешная или неудачная)
   * @param success - true если попытка успешна, false если неудачна
   */
  const recordAttempt = useCallback((success: boolean): void => {
    if (success) {
      // Сбрасываем счетчик при успешной попытке
      setState({
        attempts: 0,
        lastAttempt: 0,
        locked: false,
        lockoutUntil: null,
      });
    } else {
      // Увеличиваем счетчик при неудачной попытке
      setState(prev => {
        const newAttempts = prev.attempts + 1;
        const now = Date.now();
        const shouldLock = newAttempts >= MAX_ATTEMPTS;
        
        return {
          attempts: newAttempts,
          lastAttempt: now,
          locked: shouldLock,
          lockoutUntil: shouldLock ? now + LOCKOUT_DURATION : prev.lockoutUntil,
        };
      });
    }
  }, []);

  /**
   * Возвращает задержку перед следующей попыткой (экспоненциальная задержка)
   * @returns Задержка в миллисекундах
   */
  const getDelay = useCallback((): number => {
    const currentState = stateRef.current;
    const delay = Math.min(
      DELAY_BASE * Math.pow(2, currentState.attempts),
      MAX_DELAY
    );
    return delay;
  }, []);

  /**
   * Сбрасывает счетчик попыток (для ручного сброса)
   */
  const reset = useCallback((): void => {
    setState({
      attempts: 0,
      lastAttempt: 0,
      locked: false,
      lockoutUntil: null,
    });
  }, []);

  /**
   * Возвращает оставшееся время блокировки в миллисекундах
   * @returns Оставшееся время или 0 если не заблокировано
   */
  const getRemainingLockoutTime = useCallback((): number => {
    const currentState = stateRef.current;
    if (!currentState.locked || !currentState.lockoutUntil) {
      return 0;
    }
    const remaining = currentState.lockoutUntil - Date.now();
    return Math.max(0, remaining);
  }, []);

  return {
    checkRateLimit,
    recordAttempt,
    getDelay,
    reset,
    getRemainingLockoutTime,
    state,
  };
}

