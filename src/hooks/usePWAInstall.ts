/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global reference so beforeinstallprompt is captured even if it fires before component mount
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  try {
    registerSW({ immediate: true });
  } catch {}

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn());
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    try {
      localStorage.setItem('abyssal_app_mode', 'true');
    } catch {}
    promptListeners.forEach((fn) => fn());
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone;
  });

  const [isAppMode, setIsAppMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('app') === '1') {
        localStorage.setItem('abyssal_app_mode', 'true');
        return true;
      }
      return localStorage.getItem('abyssal_app_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
      try {
        setIsAppMode(localStorage.getItem('abyssal_app_mode') === 'true' || isStandalone);
      } catch {}
    };

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    promptListeners.add(syncState);
    window.addEventListener('storage', syncState);
    document.addEventListener('fullscreenchange', syncState);

    return () => {
      promptListeners.delete(syncState);
      window.removeEventListener('storage', syncState);
      document.removeEventListener('fullscreenchange', syncState);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        setIsInstalled(true);
        setIsAppMode(true);
        try {
          localStorage.setItem('abyssal_app_mode', 'true');
        } catch {}
        return true;
      }
    } catch {}
    return false;
  }, []);

  const activateAppMode = useCallback(async () => {
    try {
      localStorage.setItem('abyssal_app_mode', 'true');
    } catch {}
    setIsAppMode(true);
    promptListeners.forEach((fn) => fn());

    // Try entering hardware fullscreen if supported by current frame/browser
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}

    // Lock screen orientation or wakeLock if available
    try {
      if ('wakeLock' in navigator) {
        await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<void> } }).wakeLock.request('screen');
      }
    } catch {}
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isAppMode,
    isIOS,
    install,
    activateAppMode,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
