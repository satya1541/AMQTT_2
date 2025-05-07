import { storeAnalyticsEvent, getUnsyncedAnalyticsEvents, markAnalyticsEventsSynced, AnalyticsEvent } from './indexeddb';

/**
 * Offline analytics module
 * This module provides analytics tracking that works offline and syncs when back online
 */

// Constants
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ANALYTICS_SYNC_KEY = 'mqtt-explorer-analytics-last-sync';

// Track page view
export function trackPageView(page: string): void {
  const event: AnalyticsEvent = {
    id: `pageview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'pageview',
    data: { page },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Track message received
export function trackMessageReceived(topic: string): void {
  const event: AnalyticsEvent = {
    id: `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'message_received',
    data: { topic },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Track message published
export function trackMessagePublished(topic: string, qos?: 0 | 1 | 2, retain?: boolean): void {
  const event: AnalyticsEvent = {
    id: `publish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'message_published',
    data: { topic, qos, retain },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Track connection event
export function trackConnection(brokerUrl: string, success: boolean, error?: string): void {
  const event: AnalyticsEvent = {
    id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'connection',
    data: { brokerUrl, success, error },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Track feature usage
export function trackFeatureUsage(feature: string, data: any = {}): void {
  const event: AnalyticsEvent = {
    id: `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'feature_usage',
    data: { feature, ...data },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Track error
export function trackError(error: string, details: any = {}): void {
  const event: AnalyticsEvent = {
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'error',
    data: { error, details },
    timestamp: Date.now()
  };
  
  storeEvent(event);
}

// Store an event and attempt to sync if online
async function storeEvent(event: AnalyticsEvent): Promise<void> {
  try {
    // Store event locally
    await storeAnalyticsEvent(event);
    
    // Try to sync if online
    if (navigator.onLine) {
      syncEvents();
    }
  } catch (error) {
    console.error('Error storing analytics event:', error);
  }
}

// Sync events to server
export async function syncEvents(): Promise<boolean> {
  try {
    // Get all unsynced events
    const events = await getUnsyncedAnalyticsEvents();
    
    if (events.length === 0) {
      console.log('No analytics events to sync');
      return true;
    }
    
    console.log(`Syncing ${events.length} analytics events`);
    
    // In a real app, we would send these to an analytics endpoint
    // For this example, we'll just mark them as synced
    
    // This would be a real API call in a production app
    // const response = await fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ events })
    // });
    
    // if (!response.ok) {
    //   throw new Error('Failed to sync analytics events');
    // }
    
    // Mark all events as synced
    await markAnalyticsEventsSynced(events.map(event => event.id));
    
    // Update last sync time
    localStorage.setItem(ANALYTICS_SYNC_KEY, Date.now().toString());
    
    console.log('Analytics events synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing analytics events:', error);
    return false;
  }
}

// Initialize analytics module
export function initializeAnalytics(): void {
  // Set up online/offline listeners
  window.addEventListener('online', () => {
    console.log('Online, syncing analytics events');
    syncEvents();
  });
  
  // Set up periodic sync
  setInterval(() => {
    if (navigator.onLine) {
      const lastSync = localStorage.getItem(ANALYTICS_SYNC_KEY);
      const lastSyncTime = lastSync ? parseInt(lastSync, 10) : 0;
      const now = Date.now();
      
      if (now - lastSyncTime > SYNC_INTERVAL) {
        syncEvents();
      }
    }
  }, 60000); // Check every minute
  
  // Initial sync if online
  if (navigator.onLine) {
    syncEvents();
  }
  
  // Track session start
  trackPageView('session_start');
}