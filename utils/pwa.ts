
/**
 * Регистрирует Service Worker для PWA
 */
export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
          
          // Проверка обновлений каждые час
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}

/**
 * Проверяет, установлено ли приложение как PWA
 */
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function isPWAInstalled(): boolean {
  const nav = window.navigator as NavigatorWithStandalone;
  return window.matchMedia('(display-mode: standalone)').matches ||
         nav.standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Интерфейс для события beforeinstallprompt
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface WindowWithDeferredPrompt extends Window {
  deferredPrompt?: BeforeInstallPromptEvent;
}

/**
 * Показывает подсказку для установки PWA
 */
export function showInstallPrompt(): void {
  // Это будет вызвано через beforeinstallprompt event
  // Сохраняем событие для использования позже
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    const win = window as WindowWithDeferredPrompt;
    win.deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

/**
 * Запрашивает установку PWA
 */
export async function installPWA(): Promise<boolean> {
  const win = window as WindowWithDeferredPrompt;
  const deferredPrompt = win.deferredPrompt;
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  win.deferredPrompt = undefined;
  
  return outcome === 'accepted';
}

