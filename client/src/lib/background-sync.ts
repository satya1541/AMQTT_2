/**
 * Background Sync Utilities
 * This module provides utilities for syncing data in the background
 */

import { MqttMessage } from '@/hooks/use-mqtt';
import { getMessages, storeMessage, markAnalyticsEventsSynced } from './indexeddb';
import { isOnline } from './pwa-utils';
import { showNotification } from './pwa-utils';

// Queue names
const MQTT_SYNC_QUEUE = 'mqtt-message-sync';
const ANALYTICS_SYNC_QUEUE = 'analytics-sync';

// Flag to track if sync is already registered
let syncRegistered = false;

/**
 * Initialize background sync
 * Registers the sync event handlers and sets up the sync
 */
export async function initializeBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('Background sync not supported');
    return;
  }
  
  if (syncRegistered) {
    return;
  }
  
  try {
    // Register with the service worker
    const registration = await navigator.serviceWorker.ready;
    
    // Register sync handlers for MQTT messages
    if ('sync' in registration) {
      await (registration as any).sync.register(MQTT_SYNC_QUEUE);
      
      // Register sync handlers for analytics
      await (registration as any).sync.register(ANALYTICS_SYNC_QUEUE);
    } else {
      console.log('Background sync not supported, falling back to periodic sync');
      // Fallback to periodic checks when online
      window.addEventListener('online', syncPendingMessages);
    }
    
    syncRegistered = true;
    console.log('Background sync registered');
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    // If online, try to sync immediately
    if (isOnline()) {
      syncPendingMessages();
    }
  } catch (error) {
    console.error('Error registering sync:', error);
  }
}

/**
 * Handle messages from the service worker
 * @param event The message event
 */
function handleServiceWorkerMessage(event: MessageEvent): void {
  const data = event.data;
  
  if (data.type === 'sync-complete') {
    console.log(`Sync complete for ${data.queue}:`, data.result);
    
    if (data.queue === MQTT_SYNC_QUEUE) {
      // Show notification
      showNotification(
        'MQTT Messages Synced',
        {
          body: `Successfully synced ${data.result.syncedCount} messages`,
          icon: '/mqtt-app-icon-192.png',
          badge: '/mqtt-badge-96.png'
        }
      );
    } else if (data.queue === ANALYTICS_SYNC_QUEUE) {
      console.log(`Analytics sync complete: ${data.result.syncedCount} events synced`);
    }
  } else if (data.type === 'sync-error') {
    console.error(`Sync error for ${data.queue}:`, data.error);
  }
}

/**
 * Queue a message for syncing
 * Stores the message in IndexedDB with pending sync flag
 * @param message The MQTT message to sync
 */
export async function queueMessageForSync(message: MqttMessage): Promise<void> {
  try {
    // Mark the message as pending sync
    const syncMessage: MqttMessage = {
      ...message,
      pendingSync: true,
      syncAttempts: 0
    };
    
    // Store in IndexedDB
    await storeMessage(syncMessage);
    
    // If online and sync is registered, try to sync immediately
    if (isOnline() && syncRegistered) {
      syncPendingMessages();
    }
  } catch (error) {
    console.error('Error queuing message for sync:', error);
  }
}

/**
 * Sync pending messages
 * Gets pending messages from IndexedDB and sends them to the server
 */
export async function syncPendingMessages(): Promise<void> {
  if (!isOnline()) {
    console.log('Cannot sync, offline');
    return;
  }
  
  try {
    // Get pending messages
    const pendingMessages = await getMessages({ pendingSync: true }, 100);
    
    if (pendingMessages.length === 0) {
      console.log('No pending messages to sync');
      return;
    }
    
    console.log(`Syncing ${pendingMessages.length} messages...`);
    
    // In a real app, we would send the messages to the server here
    // For now, we'll just simulate a successful server request
    
    // Simulate server request with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update messages as synced
    for (const message of pendingMessages) {
      // Create a new object with updated properties
      const updatedMessage = {
        ...message,
        pendingSync: false,
        // Add timestamp for when it was synced
        lastSyncAttempt: Date.now()
      };
      await storeMessage(updatedMessage);
    }
    
    console.log(`Successfully synced ${pendingMessages.length} messages`);
    
    // Show notification
    showNotification(
      'Messages Synced',
      {
        body: `Successfully synced ${pendingMessages.length} messages`,
        icon: '/mqtt-app-icon-192.png',
        badge: '/mqtt-badge-96.png'
      }
    );
  } catch (error) {
    console.error('Error syncing messages:', error);
  }
}

/**
 * Sync analytics events
 * Gets pending analytics events from IndexedDB and sends them to the server
 */
export async function syncAnalyticsEvents(): Promise<void> {
  if (!isOnline()) {
    console.log('Cannot sync analytics events, offline');
    return;
  }
  
  try {
    // For now, this is a stub function since we don't have a real server to sync with
    console.log('Syncing analytics events...');
    
    // Simulate server request with a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Successfully synced analytics events');
  } catch (error) {
    console.error('Error syncing analytics events:', error);
  }
}

// Initialize background sync when the module is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    initializeBackgroundSync().catch(err => {
      console.error('Failed to initialize background sync:', err);
    });
  });
}