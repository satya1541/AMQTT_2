import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canAppBeInstalled, isAppInstalled } from '@/lib/pwa-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SiMqtt } from 'react-icons/si';

interface PWAInstallPromptProps {
  className?: string;
}

// Reference to deferred prompt event
let deferredPrompt: any = null;

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [installable, setInstallable] = useState<boolean>(false);
  
  useEffect(() => {
    const checkInstallable = async () => {
      // If already installed as PWA, don't show the prompt
      if (isAppInstalled()) {
        setInstallable(false);
        return;
      }
      
      // Check if app can be installed
      const canInstall = await canAppBeInstalled();
      setInstallable(canInstall);
      
      // Only show prompt if installable and not already dismissed
      const promptDismissed = localStorage.getItem('pwa-prompt-dismissed');
      setShowPrompt(canInstall && promptDismissed !== 'true');
    };
    
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Store the event for later use
      deferredPrompt = e;
      
      // Check if installable
      checkInstallable();
    };
    
    // Listen for appinstalled event
    const handleAppInstalled = () => {
      // Clear the deferredPrompt
      deferredPrompt = null;
      
      // Update state
      setInstallable(false);
      setShowPrompt(false);
      
      // Log to analytics
      console.log('App was installed');
    };
    
    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if installable on mount
    checkInstallable();
    
    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  // Handle install button click
  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      return;
    }
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      // Clear the deferredPrompt
      deferredPrompt = null;
      
      // Handle the choice
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Hide the prompt
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };
  
  // Handle dismiss button click
  const handleDismiss = () => {
    // Hide the prompt
    setShowPrompt(false);
    
    // Remember the dismissal in localStorage (for 7 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    localStorage.setItem('pwa-prompt-dismissed-expiry', expiryDate.toISOString());
  };
  
  // If not installable or prompt shouldn't be shown, don't render anything
  if (!installable || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div 
          className={`fixed bottom-4 right-4 p-4 bg-primary text-primary-foreground rounded-lg shadow-lg max-w-sm ${className}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <SiMqtt className="w-6 h-6 mr-2 text-primary-foreground" />
                <h3 className="text-lg font-medium">Install MQTT Explorer</h3>
              </div>
              <p className="text-sm text-primary-foreground/90 mb-3">
                Install as an app for faster access and offline functionality.
              </p>
              <div className="flex space-x-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  onClick={handleInstall}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Install App
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleDismiss}
                >
                  Not Now
                </Button>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="ml-2 -mr-1 -mt-1 h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;