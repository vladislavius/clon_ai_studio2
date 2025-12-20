import { useState, useEffect } from 'react';
import { installPWA, isPWAInstalled } from '../utils/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface WindowWithDeferredPrompt extends Window {
  deferredPrompt?: BeforeInstallPromptEvent;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли приложение
    setIsInstalled(isPWAInstalled());

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const win = window as WindowWithDeferredPrompt;
      const promptEvent = e as BeforeInstallPromptEvent;
      win.deferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };

    // Слушаем событие appinstalled (приложение установлено)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      const win = window as WindowWithDeferredPrompt;
      win.deferredPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      const result = await installPWA();
      if (result) {
        setShowPrompt(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
      return result;
    } catch (error) {
      console.error('Install error:', error);
      return false;
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  return {
    showPrompt: showPrompt && !isInstalled,
    isInstalled,
    handleInstall,
    dismissPrompt,
  };
}







