import { MqttMessage } from '@/hooks/use-mqtt';

// IndexedDB setup
const DB_NAME = 'mqtt-explorer';
const DB_VERSION = 2; // Increment version number to handle schema changes
const MESSAGES_STORE = 'messages';

// Helper function to delete the database if needed in case of corruption or version conflicts
export function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log('Successfully deleted database');
      resolve();
    };
    
    request.onerror = (event) => {
      console.error('Failed to delete database:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
    
    request.onblocked = () => {
      console.warn('Database deletion blocked - close all other tabs and try again');
      reject(new Error('Database deletion blocked'));
    };
  });
}

// Try to open database with better error handling for version conflicts
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        reject(new Error('Your browser does not support IndexedDB'));
        return;
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Handle database opening errors
      request.onerror = (event) => {
        const target = event.target as IDBOpenDBRequest;
        const error = target?.error;
        console.error('Error opening IndexedDB:', error);
        
        // Handle version error by deleting and recreating the database
        if (error && error.name === 'VersionError') {
          console.warn('Version error detected, attempting to delete and recreate database');
          
          deleteDatabase()
            .then(() => {
              // Try opening again after deletion
              const retryRequest = indexedDB.open(DB_NAME, DB_VERSION);
              
              retryRequest.onsuccess = (e) => {
                console.log('Successfully reopened database after deletion');
                resolve((e.target as IDBOpenDBRequest).result);
              };
              
              retryRequest.onerror = (e) => {
                console.error('Failed to reopen database after deletion:', (e.target as IDBOpenDBRequest).error);
                reject('Error reopening IndexedDB: ' + (e.target as IDBOpenDBRequest).error);
              };
              
              retryRequest.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result;
                console.log('Creating new object stores after database deletion');
                
                if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                  const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                  store.createIndex('timestamp', 'timestamp', { unique: false });
                  store.createIndex('topic', 'topic', { unique: false });
                  store.createIndex('payloadLength', 'payload.length', { unique: false });
                }
              };
            })
            .catch((deleteError) => {
              console.error('Failed to resolve version conflict:', deleteError);
              reject('Could not fix database version conflict: ' + deleteError);
            });
        } else {
          reject('Error opening IndexedDB: ' + error);
        }
      };

      // Handle successful database opening
      request.onsuccess = (event) => {
        console.log('Successfully opened database');
        resolve((event.target as IDBOpenDBRequest).result);
      };

      // Handle database version upgrade
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;
        
        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Handle upgrade based on old version
        if (oldVersion < 1) {
          // Initial database setup (for new installations)
          if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
            const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('topic', 'topic', { unique: false });
          }
        }
        
        if (oldVersion < 2) {
          // Changes for version 2 - add or modify existing schema
          console.log('Upgrading to database version 2');
          
          // Get existing object store if it exists
          if (db.objectStoreNames.contains(MESSAGES_STORE)) {
            try {
              const store = db.transaction([MESSAGES_STORE], 'readwrite').objectStore(MESSAGES_STORE);
              
              // Add new indexes if they don't exist
              if (!store.indexNames.contains('payloadLength')) {
                console.log('Adding payloadLength index to messages store');
                store.createIndex('payloadLength', 'payload.length', { unique: false });
              }
            } catch (error) {
              console.error('Error upgrading database schema:', error);
            }
          }
        }
      };
    } catch (error) {
      console.error('Error in openDatabase:', error);
      reject(`Failed to open database: ${error}`);
    }
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