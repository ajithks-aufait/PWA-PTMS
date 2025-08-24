// PWA Service Worker Registration
export const registerServiceWorker = () => {
  // In a real PWA setup, this would use the virtual:pwa-register module
  // For now, we'll implement a basic service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((error) => {
        console.error('SW registration error', error);
      });
  }
};

// Check if app is installable
export const isInstallable = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Check if app is already installed
export const isInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Show install prompt
export const showInstallPrompt = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!isInstallable()) {
      reject(new Error('App is not installable'));
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as any;
      
      promptEvent.prompt();
      
      promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        resolve();
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Cleanup after a timeout
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      reject(new Error('Install prompt timeout'));
    }, 10000);
  });
};

// Network status monitoring
export const setupNetworkMonitoring = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
