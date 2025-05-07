import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isOnline, addConnectivityListeners } from '@/lib/pwa-utils';
import { motion } from 'framer-motion';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [offline, setOffline] = useState<boolean>(!isOnline());
  const [reconnecting, setReconnecting] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Set up online/offline detection
  useEffect(() => {
    // Initialize offline state
    setOffline(!navigator.onLine);
    
    // Set up event listeners for online/offline status
    const handleOnline = () => {
      setOffline(false);
      toast({
        title: "You're back online",
        description: "Connection restored. Syncing data...",
        variant: "success",
        id: `online-${Date.now()}`
      });
    };
    
    const handleOffline = () => {
      setOffline(true);
      toast({
        title: "You're offline",
        description: "Please check your connection. Some features may be limited.",
        variant: "warning",
        id: `offline-${Date.now()}`
      });
    };
    
    // Register event listeners
    const removeListeners = addConnectivityListeners(handleOnline, handleOffline);
    
    // Clean up event listeners on unmount
    return () => {
      removeListeners();
    };
  }, [toast]);
  
  // Attempt to reconnect
  const attemptReconnect = () => {
    setReconnecting(true);
    
    // Just a visual indication - the browser handles the actual reconnection
    setTimeout(() => {
      if (navigator.onLine) {
        setOffline(false);
        toast({
          title: "Connection restored",
          description: "You're back online!",
          variant: "success",
          id: `reconnect-success-${Date.now()}`
        });
      } else {
        toast({
          title: "Still offline",
          description: "Please check your internet connection and try again.",
          variant: "warning",
          id: `reconnect-failed-${Date.now()}`
        });
      }
      setReconnecting(false);
    }, 1500);
  };
  
  // If online, don't show anything
  if (!offline) {
    return null;
  }

  return (
    <motion.div 
      className={`fixed bottom-4 left-4 p-4 bg-destructive/90 text-destructive-foreground rounded-lg shadow-lg ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive-foreground/20">
          <WifiOff className="w-6 h-6 text-destructive-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-destructive-foreground">You're offline</h3>
          <p className="text-sm text-destructive-foreground/80">
            Your changes will be synced when you reconnect.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
          onClick={attemptReconnect}
          disabled={reconnecting}
        >
          {reconnecting ? (
            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          {reconnecting ? 'Checking...' : 'Reconnect'}
        </Button>
      </div>
    </motion.div>
  );
};

export default OfflineIndicator;