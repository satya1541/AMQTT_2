// Local storage utility functions

/**
 * Save a value to localStorage
 * @param key Storage key
 * @param value Value to store
 */
export function saveSetting<T>(key: string, value: T): void {
  try {
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error saving setting ${key}:`, error);
  }
}

/**
 * Load a value from localStorage
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist
 * @returns The stored value or defaultValue
 */
export function loadSetting<T>(key: string, defaultValue: T): T {
  try {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return defaultValue;
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Error loading setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Remove a value from localStorage
 * @param key Storage key to remove
 */
export function removeSetting(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing setting ${key}:`, error);
  }
}

/**
 * Get all user data for export
 * @returns Object containing all user data
 */
export function exportAllSettings(): Record<string, any> {
  try {
    const exportData: Record<string, any> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            exportData[key] = JSON.parse(value);
          }
        } catch (e) {
          // If it's not valid JSON, just store as string
          exportData[key] = localStorage.getItem(key);
        }
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('Error exporting settings:', error);
    throw error;
  }
}

/**
 * Import all settings from a data object
 * @param data Object containing data to import
 * @param overwrite Whether to overwrite existing data
 */
export function importAllSettings(data: Record<string, any>, overwrite: boolean = true): void {
  try {
    Object.entries(data).forEach(([key, value]) => {
      if (overwrite || localStorage.getItem(key) === null) {
        saveSetting(key, value);
      }
    });
  } catch (error) {
    console.error('Error importing settings:', error);
    throw error;
  }
}

/**
 * Clear all settings from localStorage
 */
export function clearAllSettings(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing settings:', error);
    throw error;
  }
}

/**
 * Get approximate storage usage in bytes
 * @returns Number of bytes used in localStorage
 */
export function getStorageUsage(): number {
  try {
    let totalBytes = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // 2 bytes per character for UTF-16
        totalBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
      }
    }
    
    return totalBytes;
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return 0;
  }
}
