import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supportsNotifications, requestNotificationPermission, supportsPush } from '@/lib/pwa-utils';

/**
 * Push Notification Manager Component
 * This component handles push notification permissions and subscriptions
 */
const PushNotificationManager: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pushSupported, setPushSupported] = useState<boolean>(false);
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(false);
  const { toast } = useToast();

  // Check notification support and status on mount
  useEffect(() => {
    // Check if notifications are supported
    const notifSupported = supportsNotifications();
    setNotificationsSupported(notifSupported);
    
    // Check if push is supported
    const pushIsSupported = supportsPush();
    setPushSupported(pushIsSupported);
    
    // Get current notification permission
    if (notifSupported) {
      setPermission(Notification.permission);
    }
    
    // Check if user is already subscribed
    if (pushIsSupported) {
      checkSubscription();
    }
  }, []);

  // Convert a base64 string to Uint8Array for push subscription
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

  // Check if user is already subscribed
  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async () => {
    setLoading(true);
    
    try {
      // Request notification permission first
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "You need to grant notification permission to receive push notifications.",
          variant: "destructive",
          id: "push-permission-denied"
        });
        setLoading(false);
        return;
      }
      
      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      
      // In a real app, this key would come from your server
      // This is just a placeholder, and won't actually work for push notifications
      const applicationServerKey = urlBase64ToUint8Array(
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      );
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      
      // In a real app, you would send the subscription details to your server
      console.log('Push subscription:', JSON.stringify(subscription));
      
      setIsSubscribed(true);
      
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive push notifications from MQTT Explorer when important events occur.",
        variant: "success",
        id: "push-subscribed"
      });
    } catch (error) {
      console.error('Error subscribing to push:', error);
      
      toast({
        title: "Subscription Error",
        description: "There was an error subscribing to push notifications. Please try again.",
        variant: "destructive",
        id: "push-subscription-error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // In a real app, you would also notify your server
        
        setIsSubscribed(false);
        
        toast({
          title: "Notifications Disabled",
          description: "You've unsubscribed from push notifications.",
          variant: "info",
          id: "push-unsubscribed"
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      
      toast({
        title: "Unsubscribe Error",
        description: "There was an error unsubscribing from push notifications. Please try again.",
        variant: "destructive",
        id: "push-unsubscribe-error"
      });
    } finally {
      setLoading(false);
    }
  };

  // If notifications are not supported, don't render anything
  if (!notificationsSupported || !pushSupported) {
    return (
      <Card className="border-2 border-yellow-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <BellOff className="mr-2 h-5 w-5 text-yellow-500" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Try using a modern browser like Chrome, Edge, or Firefox to receive push notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Bell className="mr-2 h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive alerts for important events even when the app is closed.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Enable Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about message arrivals on important topics, connection status changes, and alerts.
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={(checked) => {
                if (checked) {
                  subscribeToPush();
                } else {
                  unsubscribeFromPush();
                }
              }}
              disabled={loading || permission === 'denied'}
            />
          </div>
          
          {permission === 'denied' && (
            <div className="text-sm p-3 bg-destructive/10 text-destructive rounded-md">
              <p className="font-medium">Permission Blocked</p>
              <p className="mt-1">
                You've blocked notifications for this site. Please update your browser settings to enable notifications.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      {permission !== 'granted' && permission !== 'denied' && (
        <CardFooter>
          <Button 
            onClick={subscribeToPush} 
            disabled={loading || isSubscribed}
            className="w-full"
          >
            <Bell className="mr-2 h-4 w-4" />
            {loading ? 'Requesting Permission...' : 'Enable Notifications'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default PushNotificationManager;