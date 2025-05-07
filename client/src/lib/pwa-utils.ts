import { Workbox, messageSW } from 'workbox-window';

let wb: Workbox | null = null;
let registration: ServiceWorkerRegistration | null = null;
let refreshing = false;

// Register service worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    wb = new Workbox('/sw.js');

    // Add event listeners
    wb.addEventListener('activated', (event) => {
      // If this is the first install, we don't need to do anything
      if (!event.isUpdate) return;

      // If we're refreshing already, don't take any action
      if (refreshing) return;

      // Refresh the page to use the new version
      refreshing = true;
      window.location.reload();
    });

    // Register the service worker
    wb.register()
      .then((reg) => {
        if (reg) {
          registration = reg;
          console.log('Service Worker registered successfully:', reg);
        }
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  } else {
    console.warn('Service Workers are not supported in this browser.');
  }
}

// Check for a new service worker version
export function checkForAppUpdate(callback: () => void) {
  if (!wb) return;

  if (registration && registration.installing) {
    registration.installing.addEventListener('statechange', (e) => {
      if ((e.target as ServiceWorker).state === 'installed' && navigator.serviceWorker.controller) {
        // New version is installed but waiting
        callback();
      }
    });
  }

  // Check for updates - this will trigger 'installing' to be set if an update is found
  wb.update().catch(err => console.error('Error checking for updates:', err));

  // Listen for future updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

// Store the deferred prompt globally so it survives across renders
let deferredInstallPrompt: any = null;

// Capture any install prompt events that occur
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the browser's default install prompt
  e.preventDefault();
  // Save the event for later use
  deferredInstallPrompt = e;
  console.log('Install prompt captured and saved');
});

// Function to check if install is available
export function isInstallAvailable(): boolean {
  return !!deferredInstallPrompt;
}

// Function to install PWA
export function promptInstall(callback: (outcome: boolean) => void) {
  // Function to trigger install prompt
  return () => {
    if (!deferredInstallPrompt) {
      console.log('No install prompt available');
      
      // If we're already in standalone mode, inform the user
      if (isRunningAsPwa()) {
        console.log('Already running as PWA');
        callback(true);
        return;
      }
      
      // If no prompt available and not a PWA, must use manual install
      callback(false);
      return;
    }

    console.log('Showing install prompt');
    
    // Show the prompt
    deferredInstallPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredInstallPrompt.userChoice
      .then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          callback(true);
        } else {
          console.log('User dismissed the install prompt');
          callback(false);
        }
      })
      .catch((error: Error) => {
        console.error('Install prompt error:', error);
        callback(false);
      })
      .finally(() => {
        // Clear the saved prompt, it can only be used once
        deferredInstallPrompt = null;
      });
  };
}

// Check if app is running as PWA
export function isRunningAsPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true || 
         document.referrer.includes('android-app://');
}

// Send message to service worker
export function sendMessageToSW(message: any): void {
  if (registration && registration.active) {
    messageSW(registration.active, message).catch(err => {
      console.error('Error sending message to Service Worker:', err);
    });
  }
}