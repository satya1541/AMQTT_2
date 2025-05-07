import { MqttMessage } from '@/hooks/use-mqtt';

// IndexedDB setup
const DB_NAME = 'mqtt-explorer';
const DB_VERSION = 2; // Increased to add new indexes
const MESSAGES_STORE = 'messages';
const ANALYTICS_STORE = 'analytics';
const PUBLISH_QUEUE_STORE = 'publish_queue';

// Extended MqttMessage interface with sync properties
export interface ExtendedMqttMessage extends MqttMessage {
  pendingSync?: boolean;
  pendingServerSync?: boolean;
  syncAttempts?: number;
  syncError?: string;
  lastSyncAttempt?: number;
}

// Analytics event interface
export interface AnalyticsEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced?: boolean;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject('Error opening IndexedDB: ' + (event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      if (oldVersion < 1) {
        // Create messages store with indexes if it doesn't exist
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('topic', 'topic', { unique: false });
        }
      }
      
      if (oldVersion < 2) {
        // Add new indexes for v2
        if (db.objectStoreNames.contains(MESSAGES_STORE)) {
          const store = request.transaction!.objectStore(MESSAGES_STORE);
          
          // Add new indexes if they don't exist
          if (!store.indexNames.contains('pendingSync')) {
            store.createIndex('pendingSync', 'pendingSync', { unique: false });
          }
          
          if (!store.indexNames.contains('pendingServerSync')) {
            store.createIndex('pendingServerSync', 'pendingServerSync', { unique: false });
          }
        }
        
        // Create analytics store
        if (!db.objectStoreNames.contains(ANALYTICS_STORE)) {
          const store = db.createObjectStore(ANALYTICS_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
        
        // Create publish queue store
        if (!db.objectStoreNames.contains(PUBLISH_QUEUE_STORE)) {
          const store = db.createObjectStore(PUBLISH_QUEUE_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('processed', 'processed', { unique: false });
        }
      }
    };
  });
}

export async function storeMessage(message: ExtendedMqttMessage): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    
    // Check if the message already exists (updating)
    const getRequest = store.get(message.id);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const existingMessage = getRequest.result;
        
        if (existingMessage) {
          // Update existing message
          store.put(message);
        } else {
          // Add new message
          store.add(message);
        }
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Error storing message in IndexedDB:', error);
    throw error;
  }
}

export interface MessageFilterOptions {
  startTime?: number;
  endTime?: number;
  topic?: string;
  payloadContains?: string;
  limit?: number;
  offset?: number;
  pendingSync?: boolean;
  pendingServerSync?: boolean;
}

export async function getMessages(options: MessageFilterOptions = {}): Promise<ExtendedMqttMessage[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    
    // Determine which index to use based on filter options
    let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
    
    if (options.pendingSync === true) {
      // Use pendingSync index if we're filtering for pending sync messages
      const index = store.index('pendingSync');
      cursorRequest = index.openCursor(IDBKeyRange.only(true));
    } else if (options.pendingServerSync === true) {
      // Use pendingServerSync index if we're filtering for pending server sync
      const index = store.index('pendingServerSync');
      cursorRequest = index.openCursor(IDBKeyRange.only(true));
    } else {
      // Use timestamp index for all other queries
      const index = store.index('timestamp');
      
      if (options.startTime && options.endTime) {
        const range = IDBKeyRange.bound(options.startTime, options.endTime);
        cursorRequest = index.openCursor(range);
      } else if (options.startTime) {
        const range = IDBKeyRange.lowerBound(options.startTime);
        cursorRequest = index.openCursor(range);
      } else if (options.endTime) {
        const range = IDBKeyRange.upperBound(options.endTime);
        cursorRequest = index.openCursor(range);
      } else {
        cursorRequest = index.openCursor();
      }
    }
    
    return new Promise((resolve, reject) => {
      const messages: ExtendedMqttMessage[] = [];
      let skipped = 0;
      const offset = options.offset || 0;
      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const message = cursor.value as ExtendedMqttMessage;
          
          // Apply filters
          let match = true;
          
          if (options.topic && !message.topic.includes(options.topic)) {
            match = false;
          }
          
          if (options.payloadContains && !message.payload.includes(options.payloadContains)) {
            match = false;
          }
          
          // Only apply these filters if we're not already using the index
          if (options.pendingSync === true && options.pendingSync !== message.pendingSync) {
            match = false;
          }
          
          if (options.pendingServerSync === true && options.pendingServerSync !== message.pendingServerSync) {
            match = false;
          }
          
          if (match) {
            if (skipped < offset) {
              skipped++;
            } else if (messages.length < limit) {
              messages.push(message);
            }
          }
          
          cursor.continue();
        } else {
          resolve(messages);
        }
      };
      
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  } catch (error) {
    console.error('Error retrieving messages from IndexedDB:', error);
    throw error;
  }
}

export async function clearMessages(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    
    store.clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error clearing messages from IndexedDB:', error);
    throw error;
  }
}

export async function getMessageCount(): Promise<number> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    
    const countRequest = store.count();
    
    return new Promise((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });
  } catch (error) {
    console.error('Error counting messages in IndexedDB:', error);
    throw error;
  }
}

export async function exportMessages(format: 'json' | 'csv' = 'json'): Promise<string> {
  try {
    const messages = await getMessages();
    
    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    } else if (format === 'csv') {
      // Create CSV header
      let csv = 'id,timestamp,topic,payload,qos,retain,pendingSync,pendingServerSync\n';
      
      // Add rows
      messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toISOString();
        const payload = msg.payload.replace(/"/g, '""'); // Escape quotes
        
        csv += `${msg.id},${timestamp},"${msg.topic}","${payload}",${msg.qos || ''},${msg.retain || ''},${msg.pendingSync || false},${msg.pendingServerSync || false}\n`;
      });
      
      return csv;
    } else {
      throw new Error('Unsupported export format');
    }
  } catch (error) {
    console.error('Error exporting messages:', error);
    throw error;
  }
}

// Analytics functions
export async function storeAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([ANALYTICS_STORE], 'readwrite');
    const store = transaction.objectStore(ANALYTICS_STORE);
    
    // Set default values
    if (event.synced === undefined) {
      event.synced = false;
    }
    
    store.add(event);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error storing analytics event:', error);
    throw error;
  }
}

export async function getUnsyncedAnalyticsEvents(): Promise<AnalyticsEvent[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([ANALYTICS_STORE], 'readonly');
    const store = transaction.objectStore(ANALYTICS_STORE);
    const index = store.index('synced');
    
    const request = index.getAll(IDBKeyRange.only(false));
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting unsynced analytics events:', error);
    throw error;
  }
}

export async function markAnalyticsEventsSynced(ids: string[]): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([ANALYTICS_STORE], 'readwrite');
    const store = transaction.objectStore(ANALYTICS_STORE);
    
    const promises = ids.map(id => {
      return new Promise<void>((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const event = request.result;
          if (event) {
            event.synced = true;
            store.put(event);
          }
          resolve();
        };
        
        request.onerror = () => reject(request.error);
      });
    });
    
    await Promise.all(promises);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error marking analytics events as synced:', error);
    throw error;
  }
}
