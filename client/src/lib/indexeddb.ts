import { MqttMessage } from '@/hooks/use-mqtt'; // Assuming MqttMessage type is defined here or imported

// IndexedDB setup
const DB_NAME = 'mqtt-explorer';
const DB_VERSION = 2; // Current version
const MESSAGES_STORE = 'messages';

// Helper function to delete the database if needed
export function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to delete database: ${DB_NAME}`);
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log(`Successfully deleted database: ${DB_NAME}`);
      resolve();
    };
    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest)?.error;
      console.error(`Failed to delete database ${DB_NAME}:`, error);
      reject(error || new Error('Unknown error deleting database'));
    };
    request.onblocked = (event) => {
      console.warn(`Database deletion blocked for ${DB_NAME}. Close other connections.`);
      reject(new Error('Database deletion blocked'));
    };
  });
}

// Function to open the database
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (!window.indexedDB) {
        return reject(new Error('Your browser does not support IndexedDB'));
      }

      console.log(`Opening database: ${DB_NAME}, Version: ${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Generic error handler for opening the database
      request.onerror = (event) => {
        const target = event.target as IDBOpenDBRequest;
        const error = target?.error;
        console.error(`Error opening IndexedDB (${DB_NAME} v${DB_VERSION}):`, error?.name, error?.message);
        reject(new Error(`Error opening IndexedDB: ${error?.message || 'Unknown error'}`));
      };

      // Success handler
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log(`Successfully opened database: ${DB_NAME}, Version: ${db.version}`);
        // Optional: Check if opened version matches expected version
        if (db.version !== DB_VERSION) {
             console.warn(`Database opened with version ${db.version}, but expected ${DB_VERSION}. This might indicate an issue.`);
        }
        resolve(db);
      };

      // Upgrade handler (only runs if DB_VERSION is higher than the existing DB version)
      request.onupgradeneeded = (event) => {
        console.log("onupgradeneeded event triggered");
        const db = (event.target as IDBOpenDBRequest).result;
        const upgradeTransaction = (event.target as IDBOpenDBRequest).transaction; // Get the special upgrade transaction
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DB_VERSION;

        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);

        if (!upgradeTransaction) {
            console.error("Upgrade transaction is missing in onupgradeneeded! Cannot apply schema changes.");
            // Reject or handle error appropriately
            return;
        }

        // Apply schema changes within the upgrade transaction
        try {
            // --- Version 1 Schema (if upgrading from 0) ---
            if (oldVersion < 1) {
              console.log("Applying V1 schema (create store)...");
              if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                const store = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('topic', 'topic', { unique: false });
                console.log(`Store "${MESSAGES_STORE}" created with indexes [timestamp, topic].`);
              } else {
                 console.log(`Store "${MESSAGES_STORE}" already exists.`);
              }
            }

            // --- Version 2 Schema (if upgrading from 0 or 1) ---
            if (oldVersion < 2) {
              console.log("Applying V2 schema (add index)...");
              if (db.objectStoreNames.contains(MESSAGES_STORE)) {
                // Use the UPGRADE transaction to get the store
                const store = upgradeTransaction.objectStore(MESSAGES_STORE);

                // Add new index if it doesn't exist
                if (!store.indexNames.contains('payloadLength')) {
                  console.log('Adding payloadLength index to messages store');
                  // Note: Indexing directly on 'payload.length' might have limitations.
                  // Consider storing length separately if complex queries are needed.
                  store.createIndex('payloadLength', 'payload.length', { unique: false });
                } else {
                  console.log('payloadLength index already exists.');
                }
              } else {
                 // This case should ideally not happen if V1 logic ran correctly
                 console.warn(`Store "${MESSAGES_STORE}" not found during V2 upgrade. Cannot add index.`);
              }
            }

            // --- Add blocks for future versions here ---
            // if (oldVersion < 3) {
            //   console.log("Applying V3 schema changes...");
            //   // ... schema changes for V3 using upgradeTransaction ...
            // }

            console.log("Schema upgrade steps completed successfully.");

        } catch (error) {
            console.error("Error during schema upgrade:", error);
            // Abort the transaction on error to prevent partial upgrades
            if (upgradeTransaction && typeof upgradeTransaction.abort === 'function') {
                console.log("Aborting upgrade transaction due to error.");
                try {
                    upgradeTransaction.abort();
                } catch (abortError) {
                    console.error("Error aborting transaction:", abortError);
                }
            }
            // Rejecting the main openDatabase promise might be appropriate here
            // reject(new Error("Schema upgrade failed")); // Or handle differently
        }
        // DO NOT resolve/reject the main promise here; wait for 'success' or 'error' on the request.
      }; // End onupgradeneeded

      // Blocked handler (another tab has the DB open with an older version)
      request.onblocked = (event) => {
          console.warn(`Database open blocked for ${DB_NAME} v${DB_VERSION}. Close other connections/tabs.`);
          // Notify user or reject promise
          reject(new Error(`Opening database ${DB_NAME} was blocked. Please close other tabs using this application.`));
      };

    } catch (error) {
      console.error('Error initiating openDatabase:', error);
      reject(new Error(`Failed to initiate database open: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}


// --- Data Operations ---

export async function storeMessage(message: MqttMessage): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    const request = store.add(message); // Use add or put as appropriate

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(); // Request succeeded
      request.onerror = () => {
          console.error("Error adding message to store:", request.error);
          reject(request.error); // Request failed
      };
      transaction.oncomplete = () => { /* console.log("Store transaction completed"); */ }; // Transaction completed
      transaction.onerror = () => {
          console.error("Store transaction error:", transaction.error);
          reject(transaction.error); // Transaction failed
      };
      transaction.onabort = () => {
          console.warn("Store transaction aborted:", transaction.error);
          reject(transaction.error || new Error("Transaction aborted"));
      };
    });
  } catch (error) {
    console.error('Error storing message in IndexedDB:', error);
    throw error; // Re-throw error for upstream handling
  } finally {
    // Avoid closing DB immediately if it's reused often by other operations
    // db?.close();
  }
}

interface MessageFilterOptions {
  startTime?: number;
  endTime?: number;
  topic?: string; // Assuming simple includes check for now
  payloadContains?: string;
  limit?: number;
  offset?: number;
  orderBy?: string; // e.g., 'timestamp'
  orderDirection?: 'asc' | 'desc';
}

export async function getMessages(options: MessageFilterOptions = {}): Promise<MqttMessage[]> {
   let db: IDBDatabase | null = null;
   try {
    db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    // Use timestamp index for ordering and range queries if specified
    const index = options.orderBy === 'timestamp' ? store.index('timestamp') : store; // Fallback to store if no index needed
    const direction = options.orderDirection === 'asc' ? 'next' : 'prev'; // 'prev' for descending (newest first)

    let range: IDBKeyRange | null = null;
    if (options.startTime !== undefined && options.endTime !== undefined) {
      range = IDBKeyRange.bound(options.startTime, options.endTime);
    } else if (options.startTime !== undefined) {
      range = IDBKeyRange.lowerBound(options.startTime);
    } else if (options.endTime !== undefined) {
      range = IDBKeyRange.upperBound(options.endTime);
    }

    // Use openCursor for filtering and pagination
    const cursorRequest = index.openCursor(range, direction);

    return new Promise((resolve, reject) => {
      const messages: MqttMessage[] = [];
      let skipped = 0;
      const offset = options.offset ?? 0;
      const limit = options.limit === 0 ? Number.MAX_SAFE_INTEGER : (options.limit ?? Number.MAX_SAFE_INTEGER);

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)?.result;

        if (cursor) {
          const message = cursor.value as MqttMessage;
          let match = true;

          // Apply post-retrieval filters (less efficient than index filtering)
          if (options.topic && !message.topic.includes(options.topic)) {
            match = false;
          }
          if (options.payloadContains && !(typeof message.payload === 'string' && message.payload.includes(options.payloadContains))) {
            match = false;
          }

          if (match) {
            if (skipped < offset) {
              skipped++;
            } else if (messages.length < limit) {
              messages.push(message);
            }
          }

          // Stop iterating if limit is reached
          if (messages.length >= limit) {
            resolve(messages);
          } else {
            cursor.continue(); // Move to the next item
          }
        } else {
          // Cursor finished
          resolve(messages);
        }
      };

      cursorRequest.onerror = (event) => {
          const error = (event.target as IDBRequest)?.error;
          console.error("Error opening cursor:", error);
          reject(error || new Error("Cursor error"));
      };
      transaction.onerror = () => reject(transaction.error); // Transaction failed
      transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
  } catch (error) {
    console.error('Error retrieving messages from IndexedDB:', error);
    throw error; // Re-throw error
  } finally {
     // db?.close();
  }
}

export async function clearMessages(): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    const request = store.clear(); // clear() returns a request

    return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve(); // Resolve when clear request is done
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => resolve(); // Also resolve on transaction complete
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
    // console.log("Messages store cleared."); // Log moved to caller if needed
  } catch (error) {
    console.error('Error clearing messages from IndexedDB:', error);
    throw error; // Re-throw so caller knows it failed
  } finally {
    // db?.close();
  }
}

export async function getMessageCount(options: MessageFilterOptions = {}): Promise<number> {
   // This implementation counts ALL messages, ignoring filters for performance.
   // Implementing filtered count requires iterating with openCursor, which is much slower.
  let db: IDBDatabase | null = null;
  try {
    db = await openDatabase();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);

    // Warn if filters are provided but ignored by this count function
    if (options.startTime || options.endTime || options.topic || options.payloadContains) {
        console.warn("getMessageCount currently ignores filters and returns total count for performance reasons.");
    }

    const countRequest = store.count(); // Counts all items in the store

    return new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
      transaction.onerror = () => reject(transaction.error); // Also handle transaction error
      transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
  } catch (error) {
    console.error('Error counting messages in IndexedDB:', error);
    throw error; // Re-throw error
  } finally {
    // db?.close();
  }
}

// Export function remains largely the same, but uses the updated getMessages
export async function exportMessages(format: 'json' | 'csv' = 'json'): Promise<string> {
  try {
    // Get ALL messages for export
    const messages = await getMessages({ limit: 0, orderDirection: 'asc' }); // Get all, oldest first for export

    if (format === 'json') {
      return JSON.stringify(messages, null, 2);
    } else if (format === 'csv') {
      let csv = 'id,timestamp_iso,topic,payload,qos,retain\n'; // Header
      messages.forEach(msg => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : '';
        // Basic CSV escaping for payload: double quotes inside payload
        const payload = typeof msg.payload === 'string' ? msg.payload.replace(/"/g, '""') : '';
        csv += `${msg.id},${timestamp},"${msg.topic}","${payload}",${msg.qos ?? ''},${msg.retain ?? ''}\n`;
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
