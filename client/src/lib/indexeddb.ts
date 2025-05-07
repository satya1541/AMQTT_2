/**
 * IndexedDB Utility Module
 * This module provides utilities for storing and retrieving data from IndexedDB
 */

import { MqttMessage } from '@/hooks/use-mqtt';

const DB_NAME = 'mqtt-explorer-db';
const DB_VERSION = 1;
const MESSAGES_STORE = 'mqtt-messages';
const ANALYTICS_STORE = 'analytics-events';
const PENDING_SYNC_STORE = 'pending-sync';

/**
 * Initialize the database
 * @returns Promise that resolves with the database
 */
export async function initializeDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Error opening database:', event);
      reject('Error opening database');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('Database opened successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create message store with id as key path
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const messageStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        messageStore.createIndex('topic', 'topic', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        messageStore.createIndex('pendingSync', 'pendingSync', { unique: false });
        console.log('Message store created');
      }
      
      // Create analytics store with id as key path
      if (!db.objectStoreNames.contains(ANALYTICS_STORE)) {
        const analyticsStore = db.createObjectStore(ANALYTICS_STORE, { keyPath: 'id' });
        analyticsStore.createIndex('eventType', 'eventType', { unique: false });
        analyticsStore.createIndex('timestamp', 'timestamp', { unique: false });
        analyticsStore.createIndex('synced', 'synced', { unique: false });
        console.log('Analytics store created');
      }
      
      // Create pending sync store with id as key path
      if (!db.objectStoreNames.contains(PENDING_SYNC_STORE)) {
        const pendingSyncStore = db.createObjectStore(PENDING_SYNC_STORE, { keyPath: 'id' });
        pendingSyncStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingSyncStore.createIndex('attempts', 'attempts', { unique: false });
        console.log('Pending sync store created');
      }
    };
  });
}

/**
 * Store a message in IndexedDB
 * @param message MQTT message to store
 * @returns Promise that resolves when the message is stored
 */
export async function storeMessage(message: MqttMessage): Promise<void> {
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.put(message);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error storing message:', event);
        reject('Error storing message');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
}

interface MessageFilters {
  topic?: string;
  pendingSync?: boolean;
  pendingServerSync?: boolean;
  startTimestamp?: number;
  endTimestamp?: number;
}

/**
 * Get messages from IndexedDB with optional filters
 * @param filters Optional filters for messages (topic, pendingSync, pendingServerSync, etc.)
 * @param limit Maximum number of messages to retrieve
 * @returns Promise that resolves with the messages
 */
export async function getMessages(
  filters: MessageFilters = {},
  limit: number = 1000
): Promise<MqttMessage[]> {
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MESSAGES_STORE, 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      // Use index if filtering by topic or pendingSync
      let request: IDBRequest;
      if (filters.pendingSync !== undefined) {
        const index = store.index('pendingSync');
        request = index.getAll(IDBKeyRange.only(filters.pendingSync), limit);
      } else if (filters.topic) {
        const index = store.index('topic');
        request = index.getAll(IDBKeyRange.only(filters.topic), limit);
      } else if (filters.startTimestamp && filters.endTimestamp) {
        const index = store.index('timestamp');
        request = index.getAll(IDBKeyRange.bound(filters.startTimestamp, filters.endTimestamp), limit);
      } else {
        request = store.getAll(null, limit);
      }
      
      request.onsuccess = () => {
        let messages = request.result;
        
        // Apply additional filters if needed
        if (filters.pendingServerSync !== undefined) {
          messages = messages.filter((msg: MqttMessage) => msg.pendingServerSync === filters.pendingServerSync);
        }
        
        resolve(messages);
      };
      
      request.onerror = (event) => {
        console.error('Error getting messages:', event);
        reject('Error getting messages');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

/**
 * Delete messages from IndexedDB by ID
 * @param messageIds Array of message IDs to delete
 * @returns Promise that resolves when the messages are deleted
 */
export async function deleteMessages(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) {
    return;
  }
  
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      let completedCount = 0;
      let errorCount = 0;
      
      for (const id of messageIds) {
        const request = store.delete(id);
        
        request.onsuccess = () => {
          completedCount++;
          if (completedCount + errorCount === messageIds.length) {
            if (errorCount > 0) {
              reject(`Failed to delete ${errorCount} messages`);
            } else {
              resolve();
            }
          }
        };
        
        request.onerror = (event) => {
          console.error(`Error deleting message ${id}:`, event);
          errorCount++;
          if (completedCount + errorCount === messageIds.length) {
            reject(`Failed to delete ${errorCount} messages`);
          }
        };
      }
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error deleting messages:', error);
    throw error;
  }
}

/**
 * Clear all messages from IndexedDB
 * @returns Promise that resolves when all messages are cleared
 */
export async function clearMessages(): Promise<void> {
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MESSAGES_STORE, 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error clearing messages:', event);
        reject('Error clearing messages');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error clearing messages:', error);
    throw error;
  }
}

/**
 * Mark analytics events as synced
 * @param eventIds Array of event IDs to mark as synced
 * @returns Promise that resolves when the events are marked as synced
 */
export async function markAnalyticsEventsSynced(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }
  
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ANALYTICS_STORE, 'readwrite');
      const store = transaction.objectStore(ANALYTICS_STORE);
      
      let completedCount = 0;
      let errorCount = 0;
      
      for (const id of eventIds) {
        // Get the event first
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const event = getRequest.result;
          if (event) {
            // Update the event
            event.synced = true;
            event.syncTimestamp = Date.now();
            
            // Put it back
            const putRequest = store.put(event);
            
            putRequest.onsuccess = () => {
              completedCount++;
              if (completedCount + errorCount === eventIds.length) {
                if (errorCount > 0) {
                  reject(`Failed to mark ${errorCount} events as synced`);
                } else {
                  resolve();
                }
              }
            };
            
            putRequest.onerror = (event) => {
              console.error(`Error updating event ${id}:`, event);
              errorCount++;
              if (completedCount + errorCount === eventIds.length) {
                reject(`Failed to mark ${errorCount} events as synced`);
              }
            };
          } else {
            // Event not found
            console.warn(`Event ${id} not found`);
            completedCount++;
            if (completedCount + errorCount === eventIds.length) {
              if (errorCount > 0) {
                reject(`Failed to mark ${errorCount} events as synced`);
              } else {
                resolve();
              }
            }
          }
        };
        
        getRequest.onerror = (event) => {
          console.error(`Error getting event ${id}:`, event);
          errorCount++;
          if (completedCount + errorCount === eventIds.length) {
            reject(`Failed to mark ${errorCount} events as synced`);
          }
        };
      }
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error marking events as synced:', error);
    throw error;
  }
}

/**
 * Get the count of stored messages
 * @returns Promise that resolves with the count of stored messages
 */
export async function getMessageCount(): Promise<number> {
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(MESSAGES_STORE, 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      
      const request = store.count();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting message count:', event);
        reject('Error getting message count');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error getting message count:', error);
    throw error;
  }
}

/**
 * Store utility function
 * Allows storing arbitrary data in IndexedDB
 * @param storeName Name of the store to use
 * @param data Data to store (must have an 'id' property)
 * @returns Promise that resolves when the data is stored
 */
export async function storeData<T extends { id: string }>(
  storeName: string,
  data: T
): Promise<void> {
  try {
    const db = await initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`Error storing data in ${storeName}:`, event);
        reject(`Error storing data in ${storeName}`);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error(`Error storing data in ${storeName}:`, error);
    throw error;
  }
}

// Initialize the database when the module is loaded
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});