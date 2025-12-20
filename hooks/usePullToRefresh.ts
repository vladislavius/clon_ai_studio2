import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Расстояние для активации (по умолчанию 80px)
  enabled?: boolean; // Включен ли pull-to-refresh
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isPulling.current || window.scrollY > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      // Пользователь тянет вниз
      const maxDistance = threshold * 1.5; // Максимальное расстояние
      const clampedDistance = Math.min(distance, maxDistance);
      setPullDistance(clampedDistance);
      
      // Предотвращаем скролл страницы при pull-to-refresh
      if (distance > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling.current) return;

    isPulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull-to-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1), // 0-1
  };
}







