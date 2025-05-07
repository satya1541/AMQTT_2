import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMqtt } from '@/hooks/use-mqtt';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BellRing, Bell, BellOff } from 'lucide-react';

/**
 * Push Notification Manager Component
 * This component handles push notification permissions and subscriptions
 */
const PushNotificationManager: React.FC = () => {
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [topicPattern, setTopicPattern] = useState<string>('#');
  const [notificationLevel, setNotificationLevel] = useState<string>('all');
  
  const { toast } = useToast();
  const { client, connectionStatus, subscribe } = useMqtt();
  
  // Update state when permission changes
  useEffect(() => {
    checkPermissionState();
    checkSubscriptionStatus();
  }, []);
  
  // Check for permission state
  const checkPermissionState = () => {
    if (!('Notification' in window)) {
      setPermissionState('denied');
      return;
    }
    
    setPermissionState(Notification.permission);
    setNotificationsEnabled(Notification.permission === 'granted');
  };
  
  // Check if already subscribed to push
  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setSubscription(subscription);
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };
  
  // Request permission for notifications
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifications Not Supported',
        description: 'This browser does not support notifications.',
        variant: 'destructive',
        id: Date.now().toString()
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission === 'granted') {
        // Show success toast
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive notifications for important events.',
          variant: 'success',
          id: Date.now().toString()
        });
        
        setNotificationsEnabled(true);
        
        // Subscribe to push
        subscribeToPush();
      } else {
        // Show denied toast
        toast({
          title: 'Permission Denied',
          description: 'You need to allow notifications in your browser settings.',
          variant: 'destructive',
          id: Date.now().toString()
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
        id: Date.now().toString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast({
        title: 'Push Not Supported',
        description: 'This browser does not support push notifications.',
        variant: 'destructive',
        id: Date.now().toString()
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // In a real app, you would get this from your server
      // For this demo, we'll use a dummy key
      const applicationServerKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      );
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      
      // In a real app, you would send this to your server
      console.log('Push subscription:', JSON.stringify(subscription));
      
      setSubscription(subscription);
      setIsSubscribed(true);
      
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive push notifications.',
        variant: 'success',
        id: Date.now().toString()
      });
      
      // Subscribe to MQTT topic for notifications if connected
      if (client && connectionStatus === 'connected' && topicPattern) {
        subscribe(topicPattern);
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Error',
        description: 'Failed to subscribe to push notifications.',
        variant: 'destructive',
        id: Date.now().toString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Unsubscribe from push
  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    
    setLoading(true);
    
    try {
      await subscription.unsubscribe();
      
      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: 'Push Notifications Disabled',
        description: 'You will no longer receive push notifications.',
        variant: 'info',
        id: Date.now().toString()
      });
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsubscribe from push notifications.',
        variant: 'destructive',
        id: Date.now().toString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      await unsubscribeFromPush();
      setNotificationsEnabled(false);
    } else {
      if (permissionState === 'granted') {
        await subscribeToPush();
        setNotificationsEnabled(true);
      } else {
        await requestPermission();
      }
    }
  };
  
  // Helper function to convert base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };
  
  // Render the component
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          {notificationsEnabled ? (
            <BellRing className="mr-2 h-5 w-5 text-purple-500" />
          ) : (
            <BellOff className="mr-2 h-5 w-5 text-gray-500" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get notified about important MQTT messages even when the app is closed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-enabled">Enable Notifications</Label>
            <Switch
              id="notifications-enabled"
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
              disabled={loading || !('Notification' in window)}
            />
          </div>
          
          {notificationsEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="topic-pattern">Topic Pattern</Label>
                <Input
                  id="topic-pattern"
                  value={topicPattern}
                  onChange={(e) => setTopicPattern(e.target.value)}
                  placeholder="# (all topics)"
                  disabled={loading || !isSubscribed}
                />
                <p className="text-xs text-muted-foreground">
                  Use wildcards like # (multi-level) or + (single-level) to match multiple topics.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notification-level">Notification Level</Label>
                <select
                  id="notification-level"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={notificationLevel}
                  onChange={(e) => setNotificationLevel(e.target.value)}
                  disabled={loading || !isSubscribed}
                >
                  <option value="all">All Messages</option>
                  <option value="important">Important Only</option>
                  <option value="critical">Critical Only</option>
                </select>
              </div>
            </>
          )}
          
          {!('Notification' in window) && (
            <div className="text-sm text-destructive">
              Your browser does not support notifications.
            </div>
          )}
          
          {!('serviceWorker' in navigator) && (
            <div className="text-sm text-destructive">
              Your browser does not support service workers, which are required for push notifications.
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {permissionState === 'default' && (
          <Button
            variant="outline"
            onClick={requestPermission}
            disabled={loading || !('Notification' in window)}
          >
            <Bell className="mr-2 h-4 w-4" />
            Request Permission
          </Button>
        )}
        
        {permissionState === 'granted' && isSubscribed && (
          <Button
            variant="outline"
            onClick={unsubscribeFromPush}
            disabled={loading}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Unsubscribe
          </Button>
        )}
        
        {permissionState === 'granted' && !isSubscribed && (
          <Button
            variant="outline"
            onClick={subscribeToPush}
            disabled={loading}
          >
            <Bell className="mr-2 h-4 w-4" />
            Subscribe
          </Button>
        )}
        
        {permissionState === 'denied' && (
          <div className="text-sm text-destructive">
            Notifications are blocked. Please update your browser settings to enable notifications.
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default PushNotificationManager;