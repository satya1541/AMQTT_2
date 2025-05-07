/**
 * PWA Utility Functions
 * This module provides utilities for Progressive Web App functionality
 */

/**
 * Check if the device is mobile
 * @returns Boolean indicating if the device is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if the browser supports notifications
 * @returns Boolean indicating if notifications are supported
 */
export function supportsNotifications(): boolean {
  return 'Notification' in window;
}

/**
 * Check if the browser supports push
 * @returns Boolean indicating if push is supported
 */
export function supportsPush(): boolean {
  return 'PushManager' in window && 'serviceWorker' in navigator;
}

/**
 * Request notification permission
 * @returns Promise resolving to the notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Check if the browser is supported
 * @returns Boolean indicating if the browser is supported
 */
export function isBrowserSupported(): boolean {
  // Check for service worker support
  const swSupported = 'serviceWorker' in navigator;
  
  // Check for indexedDB support
  const idbSupported = 'indexedDB' in window;
  
  // Check for other required APIs
  const cacheSupported = 'caches' in window;
  const fetchSupported = 'fetch' in window;
  
  return swSupported && idbSupported && cacheSupported && fetchSupported;
}

/**
 * Check if the app is installed (in standalone mode)
 * @returns Boolean indicating if the app is installed
 */
export function isAppInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

/**
 * Check if the app can be installed (has a manifest and is not already installed)
 * @returns Promise resolving to a boolean indicating if the app can be installed
 */
export async function canAppBeInstalled(): Promise<boolean> {
  if (isAppInstalled()) {
    return false;
  }
  
  // Check if the browser supports PWA installation
  if (!('BeforeInstallPromptEvent' in window)) {
    return false;
  }
  
  // Check for manifest
  const links = document.querySelectorAll('link[rel="manifest"]');
  if (links.length === 0) {
    return false;
  }
  
  return true;
}

/**
 * Show a notification
 * @param title Notification title
 * @param options Notification options
 * @returns Promise resolving to the notification
 */
export async function showNotification(
  title: string, 
  options: NotificationOptions = {}
): Promise<Notification | null> {
  if (!supportsNotifications()) {
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }
  }
  
  try {
    return new Notification(title, {
      icon: '/mqtt-app-icon-192.png',
      badge: '/mqtt-badge-96.png',
      ...options
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Register the service worker
 * @returns Promise resolving to the ServiceWorkerRegistration
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Update the service worker
 * @returns Promise resolving to a boolean indicating if an update was available
 */
export async function updateServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.update();
    
    if (registration.waiting) {
      // New version available
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Service worker update failed:', error);
    return false;
  }
}

/**
 * Force the waiting service worker to become active
 * @returns Promise resolving when complete
 */
export async function activateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.waiting) {
      // Send message to service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.error('Service worker activation failed:', error);
  }
}

/**
 * Check if the app is online
 * @returns Boolean indicating if the app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Add online/offline event listeners
 * @param onOnline Callback for online event
 * @param onOffline Callback for offline event
 * @returns Function to remove the event listeners
 */
export function addConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Send a message to the service worker
 * @param message Message to send
 * @returns Promise resolving when the message is sent
 */
export async function sendMessageToServiceWorker(message: any): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.active) {
      registration.active.postMessage(message);
    }
  } catch (error) {
    console.error('Error sending message to service worker:', error);
  }
}

/**
 * Check for app updates
 * @param onUpdateFound Callback when an update is found
 * @returns Promise resolving to a boolean indicating if an update was available
 */
export async function checkForAppUpdate(onUpdateFound: () => void): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Set up update found listener
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              console.log('New version available!');
              onUpdateFound();
            } else {
              // First install
              console.log('App installed and ready for offline use');
            }
          }
        };
      }
    };
    
    // Check for updates
    await registration.update();
    
    return !!registration.waiting;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
}