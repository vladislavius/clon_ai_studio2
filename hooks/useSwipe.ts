import { useCallback, useRef } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeDownThreshold?: number; // Минимальное расстояние для swipe down (для закрытия модальных окон)
}

interface SwipeState {
  touchStartX: number;
  touchStartY: number;
  touchEndX: number;
  touchEndY: number;
}

const MIN_SWIPE_DISTANCE = 50; // Минимальное расстояние для распознавания swipe

export function useSwipe(handlers: SwipeHandlers) {
  const swipeState = useRef<SwipeState>({
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeState.current.touchStartX = touch.clientX;
    swipeState.current.touchStartY = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    swipeState.current.touchEndX = touch.clientX;
    swipeState.current.touchEndY = touch.clientY;

    const deltaX = swipeState.current.touchEndX - swipeState.current.touchStartX;
    const deltaY = swipeState.current.touchEndY - swipeState.current.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Определяем направление swipe
    if (absDeltaX > absDeltaY && absDeltaX > MIN_SWIPE_DISTANCE) {
      // Горизонтальный swipe
      if (deltaX > 0 && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (deltaX < 0 && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > MIN_SWIPE_DISTANCE) {
      // Вертикальный swipe
      if (deltaY > 0 && handlers.onSwipeDown) {
        const threshold = handlers.onSwipeDownThreshold || MIN_SWIPE_DISTANCE;
        if (absDeltaY > threshold) {
          handlers.onSwipeDown();
        }
      } else if (deltaY < 0 && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
    }
  }, [handlers]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}







