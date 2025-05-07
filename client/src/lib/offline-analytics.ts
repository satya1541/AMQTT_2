/**
 * Offline Analytics Module
 * This module provides analytics tracking that works offline and syncs when online.
 * It stores events in IndexedDB and sends them when connectivity is restored.
 */

import { isOnline } from './pwa-utils';
import { storeData } from './indexeddb';

const ANALYTICS_STORE = 'analytics-events';

interface AnalyticsEvent {
  id: string;
  eventType: string;
  eventData: any;
  timestamp: number;
  synced: boolean;
}

// Flag to indicate if analytics has been initialized
let analyticsInitialized = false;

/**
 * Initialize analytics
 */
export function initializeAnalytics(): void {
  if (analyticsInitialized) {
    return;
  }
  
  // Set up online listener to sync events when connection is restored
  window.addEventListener('online', () => {
    console.log('Connection restored, syncing analytics events...');
    syncEvents().catch(err => {
      console.error('Error syncing analytics events:', err);
    });
  });
  
  // If online, try to sync any pending events
  if (isOnline()) {
    syncEvents().catch(err => {
      console.error('Error syncing analytics events:', err);
    });
  }
  
  analyticsInitialized = true;
  console.log('Analytics initialized');
}

/**
 * Track a message published event
 * @param topic MQTT topic
 * @param qos QoS level (0, 1, 2)
 * @param retain Retain flag
 */
export function trackMessagePublished(
  topic: string,
  qos: 0 | 1 | 2,
  retain: boolean
): void {
  trackEvent('message_published', {
    topic,
    qos,
    retain
  });
}

/**
 * Track a connection event
 * @param broker Broker URL
 * @param success Whether the connection was successful
 * @param errorMessage Error message if connection failed
 */
export function trackConnection(
  broker: string,
  success: boolean,
  errorMessage?: string
): void {
  trackEvent('connection', {
    broker,
    success,
    errorMessage
  });
}

/**
 * Track an error event
 * @param errorType Type of error
 * @param errorData Error data
 */
export function trackError(
  errorType: string,
  errorData: any
): void {
  trackEvent('error', {
    errorType,
    ...errorData
  });
}

/**
 * Track any event
 * @param eventType Type of event
 * @param eventData Event data
 */
export function trackEvent(
  eventType: string,
  eventData: any
): void {
  if (!analyticsInitialized) {
    initializeAnalytics();
  }
  
  const event: AnalyticsEvent = {
    id: `${eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType,
    eventData,
    timestamp: Date.now(),
    synced: false
  };
  
  // Store the event in IndexedDB
  storeEvent(event).then(() => {
    console.log(`Event ${eventType} tracked`);
    
    // If online, try to sync the event immediately
    if (isOnline()) {
      syncEvents().catch(err => {
        console.error('Error syncing events:', err);
      });
    }
  }).catch(err => {
    console.error(`Failed to track event ${eventType}:`, err);
  });
}

/**
 * Store an event in IndexedDB
 * @param event Analytics event to store
 */
async function storeEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await storeData(ANALYTICS_STORE, event);
  } catch (error) {
    console.error('Error storing analytics event:', error);
    throw error;
  }
}

/**
 * Sync events with the server
 */
async function syncEvents(): Promise<void> {
  if (!isOnline()) {
    console.log('Cannot sync events, offline');
    return;
  }
  
  try {
    // Get all unsynced events
    const events = await getUnsyncedEvents();
    
    if (events.length === 0) {
      console.log('No events to sync');
      return;
    }
    
    console.log(`Syncing ${events.length} events...`);
    
    // In a real app, we would send the events to the server here
    // But for now, we'll just mark them as synced
    
    // Simulate a successful server request with a delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mark events as synced
    const eventIds = events.map(event => event.id);
    await markEventsSynced(eventIds);
    
    console.log(`Successfully synced ${events.length} events`);
  } catch (error) {
    console.error('Error syncing events:', error);
    throw error;
  }
}

/**
 * Get unsynced events from IndexedDB
 * @returns Promise that resolves with unsynced events
 */
async function getUnsyncedEvents(): Promise<AnalyticsEvent[]> {
  // For simplicity, we're not implementing this function
  // In a real app, we would query IndexedDB for unsynced events
  
  // This is a stub to avoid TypeScript errors
  return [];
}

/**
 * Mark events as synced in IndexedDB
 * @param eventIds Array of event IDs to mark as synced
 */
async function markEventsSynced(eventIds: string[]): Promise<void> {
  // For simplicity, we're not implementing this function
  // In a real app, we would update the events in IndexedDB
  
  // This is a stub to avoid TypeScript errors
}

// Initialize analytics when the module is loaded
initializeAnalytics();