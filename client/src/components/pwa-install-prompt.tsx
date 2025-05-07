import React, { useEffect, useState } from 'react';
import { promptInstall, isRunningAsPwa } from '@/lib/pwa-utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface PWAInstallPromptProps {
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className }) => {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isPwa, setIsPwa] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Function to show the install prompt
  const showInstallPrompt = promptInstall((success) => {
    if (success) {
      toast({
        title: "App Installed",
        description: "MQTT Explorer has been installed successfully!",
        variant: "success",
        id: Date.now().toString()
      });
    }
  });

  useEffect(() => {
    // Check if the app is already installed
    setIsPwa(isRunningAsPwa());
    
    // Listen for the beforeinstallprompt event to detect if we can install
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Don't render anything if it's already a PWA or can't be installed
  if (isPwa || !canInstall) return null;

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
            onClick={showInstallPrompt}
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