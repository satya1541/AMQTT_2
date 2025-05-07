import React, { useEffect, useState } from 'react';
import { promptInstall, isRunningAsPwa, isInstallAvailable } from '@/lib/pwa-utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface PWAInstallPromptProps {
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className }) => {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [installAttempted, setInstallAttempted] = useState<boolean>(false);
  const [isPwa, setIsPwa] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Function to show the install prompt
  const showInstallPrompt = promptInstall((success) => {
    if (success) {
      toast({
        title: "App Installed",
        description: "MQTT Explorer has been installed successfully!",
        variant: "success"
      });
      setShowPrompt(false);
    } else {
      // Installation was rejected or failed
      toast({
        title: "Installation Failed",
        description: "The browser couldn't install the app, or the installation was canceled.",
        variant: "warning"
      });
      setInstallAttempted(true);
    }
  });

  useEffect(() => {
    // Check if the app is already installed
    setIsPwa(isRunningAsPwa());
    
    // Listen for the beforeinstallprompt event to detect if we can install
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
      
      // Show the prompt after the UI has loaded
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // In development environments, we might want to show the prompt anyway
    // after a short delay (for testing purposes)
    const isDev = import.meta.env.DEV;
    if (isDev && !isPwa) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle the install button click
  const handleInstallClick = () => {
    if (canInstall) {
      showInstallPrompt();
    } else {
      // Manual installation instructions if install API isn't available
      toast({
        title: "Installation Info",
        description: "To install this app, use your browser's 'Add to Home Screen' or 'Install' option from the menu.",
        variant: "info",
        id: Date.now().toString()
      });
      setInstallAttempted(true);
      setShowPrompt(false);
    }
  };

  // Don't render anything if it's already a PWA or prompt shouldn't be shown
  if (isPwa || !showPrompt || installAttempted) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={`p-4 rounded-lg bg-opacity-90 backdrop-blur-sm bg-gray-800 border border-purple-600/50 shadow-lg ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          <div className="text-white flex-1">
            <h3 className="text-lg font-bold mb-1">Install MQTT Explorer</h3>
            <p className="text-sm text-gray-300">Use offline and get a better experience!</p>
          </div>
          <Button 
            onClick={handleInstallClick}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600"
          >
            <i className="fas fa-download mr-2"></i> Install
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;