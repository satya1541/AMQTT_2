// PWA Service Worker Registration

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('PWA: ServiceWorker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('PWA: ServiceWorker registration failed:', error);
        });
    });
  }
}

export function checkForAppUpdate(callback: () => void) {
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    
    // Handle updates when the service worker controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      
      // Inform the user that the app is being updated
      callback();
    });
  }
}

export function promptInstall(callback: (outcome: boolean) => void) {
  let deferredPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
  });

  // Function to actually show the install prompt
  return () => {
    if (!deferredPrompt) {
      callback(false);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        callback(true);
      } else {
        console.log('PWA: User dismissed the install prompt');
        callback(false);
      }
      
      // Clear the saved prompt since it can't be used again
      deferredPrompt = null;
    });
  };
}

// Check if the app is running in standalone mode (installed as PWA)
export function isRunningAsPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (navigator as any).standalone === true;
}