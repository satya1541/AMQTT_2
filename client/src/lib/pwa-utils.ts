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

// Function to install PWA
export function promptInstall(callback: (outcome: boolean) => void) {
  let deferredPrompt: any = null;

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the browser's default install prompt
    e.preventDefault();
    // Save the event for later use
    deferredPrompt = e;
  });

  // Function to trigger install prompt
  return () => {
    if (!deferredPrompt) {
      callback(false);
      return;
    }

    // Show the prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        callback(true);
      } else {
        console.log('User dismissed the install prompt');
        callback(false);
      }
      // Clear the saved prompt, it can only be used once
      deferredPrompt = null;
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