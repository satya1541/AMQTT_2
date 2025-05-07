import { MqttMessage } from '@/hooks/use-mqtt';

// IndexedDB setup
const DB_NAME = 'mqtt-explorer';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';

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
      
      // Create messages store with indexes
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('topic', 'topic', { unique: false });
      }
    };
  });
}

export async function storeMessage(message: MqttMessage): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    
    store.add(message);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error storing message in IndexedDB:', error);
    throw error;
  }
}

interface MessageFilterOptions {
  startTime?: number;
  endTime?: number;
  topic?: string;
  payloadContains?: string;
  limit?: number;
  offset?: number;
}

export async function getMessages(options: MessageFilterOptions = {}): Promise<MqttMessage[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('timestamp');
    
    let cursorRequest: IDBRequest<IDBCursorWithValue | null>;
    
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
    
    return new Promise((resolve, reject) => {
      const messages: MqttMessage[] = [];
      let skipped = 0;
      const offset = options.offset || 0;
      const limit = options.limit || Number.MAX_SAFE_INTEGER;
      
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const message = cursor.value as MqttMessage;
          
          // Apply filters
          let match = true;
          
          if (options.topic && !message.topic.includes(options.topic)) {
            match = false;
          }
          
          if (options.payloadContains && !message.payload.includes(options.payloadContains)) {
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
      let csv = 'id,timestamp,topic,payload,qos,retain\n';
      
      // Add rows
      messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toISOString();
        const payload = msg.payload.replace(/"/g, '""'); // Escape quotes
        
        csv += `${msg.id},${timestamp},"${msg.topic}","${payload}",${msg.qos || ''},${msg.retain || ''}\n`;
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
