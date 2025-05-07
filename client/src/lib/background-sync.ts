import { MqttMessage } from '@/hooks/use-mqtt';
import { getMessages, storeMessage } from './indexeddb';

// Queue names
const PUBLISH_QUEUE = 'mqtt-publish-queue';
const MESSAGE_SYNC_QUEUE = 'mqtt-message-sync-queue';

/**
 * Register background sync
 * This function sets up background sync for the application
 */
export function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background sync is not supported in this browser');
    return;
  }

  // Wait for the service worker to be ready
  navigator.serviceWorker.ready
    .then((registration) => {
      // Register sync for publish queue (messages that need to be published when back online)
      registration.sync.register(PUBLISH_QUEUE)
        .then(() => console.log('Publish queue sync registered'))
        .catch(err => console.error('Error registering publish sync:', err));

      // Register sync for message queue (messages that need to be synced to server when back online)
      registration.sync.register(MESSAGE_SYNC_QUEUE)
        .then(() => console.log('Message sync registered'))
        .catch(err => console.error('Error registering message sync:', err));
    })
    .catch(err => console.error('Error registering background sync:', err));
}

/**
 * Queue a message to be published when the user is back online
 * @param topic MQTT topic
 * @param payload Message payload
 * @param options MQTT options (QoS, retain)
 */
export async function queueMessageForPublish(
  topic: string, 
  payload: string, 
  options: { qos?: 0 | 1 | 2, retain?: boolean } = {}
): Promise<void> {
  try {
    // Check if we're online
    if (navigator.onLine) {
      console.warn('Device is online, no need to queue message');
      return;
    }

    // Create a message object
    const message: MqttMessage = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic,
      payload,
      timestamp: Date.now(),
      qos: options.qos,
      retain: options.retain,
      pendingSync: true
    };

    // Store message to IndexedDB
    await storeMessage(message);

    // Trigger sync if possible
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(PUBLISH_QUEUE);
    }

    console.log('Message queued for publishing when online');
  } catch (error) {
    console.error('Error queueing message for publish:', error);
    throw error;
  }
}

/**
 * Process the publish queue when the user is back online
 * This is called by the service worker when the sync event is triggered
 */
export async function processPublishQueue(client: any): Promise<void> {
  try {
    // Get all messages that are pending sync
    const messages = await getMessages({ pendingSync: true });

    if (messages.length === 0) {
      console.log('No messages to process in publish queue');
      return;
    }

    console.log(`Processing ${messages.length} queued messages`);

    // Publish each message
    for (const message of messages) {
      if (client && typeof client.publish === 'function') {
        await client.publish(
          message.topic,
          message.payload,
          { 
            qos: message.qos || 0, 
            retain: message.retain || false 
          }
        );

        // Update message in IndexedDB to mark as synced
        message.pendingSync = false;
        await storeMessage(message);
      }
    }

    console.log('Queue processing completed');
  } catch (error) {
    console.error('Error processing publish queue:', error);
    throw error;
  }
}

/**
 * Mark a message for server synchronization when back online
 * This is used when we want to save something to the server when reconnected
 */
export async function markMessageForSync(message: MqttMessage): Promise<void> {
  try {
    // Mark the message for synchronization
    message.pendingServerSync = true;
    
    // Store it in IndexedDB
    await storeMessage(message);

    // Register sync if possible
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(MESSAGE_SYNC_QUEUE);
    }
  } catch (error) {
    console.error('Error marking message for sync:', error);
    throw error;
  }
}

/**
 * Process messages that need to be synced to the server
 * This is called by the service worker when the sync event is triggered
 */
export async function processMessageSyncQueue(): Promise<void> {
  try {
    // Get all messages that need server sync
    const messages = await getMessages({ pendingServerSync: true });

    if (messages.length === 0) {
      console.log('No messages to sync to server');
      return;
    }

    console.log(`Syncing ${messages.length} messages to server`);

    // This would normally send messages to your server API
    // For this demo, we'll just mark them as synced
    for (const message of messages) {
      // In a real app, you would send to server here
      // await fetch('/api/messages', {
      //   method: 'POST',
      //   body: JSON.stringify(message),
      //   headers: { 'Content-Type': 'application/json' }
      // });

      // Update message in IndexedDB
      message.pendingServerSync = false;
      await storeMessage(message);
    }

    console.log('Message sync completed');
  } catch (error) {
    console.error('Error processing message sync queue:', error);
    throw error;
  }
}

/**
 * Check if browser supports background sync
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}