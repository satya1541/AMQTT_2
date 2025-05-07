import React, { useEffect, useState } from 'react';
import { promptInstall, isRunningAsPwa, isInstallAvailable } from '@/lib/pwa-utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';

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
    
    // Check if install is available using our utility function
    setCanInstall(isInstallAvailable());
    
    // Show the prompt after a short delay if we're in a dev environment or install is available
    const isDev = import.meta.env.DEV;
    if ((isDev || isInstallAvailable()) && !isPwa) {
      // Show the prompt after the UI has loaded
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    }
    
    // Check periodically if installation becomes available
    const checkInstallInterval = setInterval(() => {
      const canInstallNow = isInstallAvailable();
      if (canInstallNow && !canInstall) {
        setCanInstall(true);
        setShowPrompt(true);
      }
    }, 3000);
    
    return () => {
      clearInterval(checkInstallInterval);
    };
  }, [canInstall]);

  // Handle the install button click
  const [showManualInstructions, setShowManualInstructions] = useState<boolean>(false);

  const handleInstallClick = () => {
    if (canInstall) {
      // Try automatic installation
      showInstallPrompt();
    } else {
      // Show manual installation instructions
      setShowManualInstructions(true);
    }
  };

  const closeManualInstructions = () => {
    setShowManualInstructions(false);
    setInstallAttempted(true);
    setShowPrompt(false);
  };

  // Don't render anything if it's already a PWA or prompt shouldn't be shown
  if (isPwa || !showPrompt || installAttempted) return null;

  return (
    <>
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

      {/* Manual installation dialog */}
      <Dialog open={showManualInstructions} onOpenChange={closeManualInstructions}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>How to Install MQTT Explorer</DialogTitle>
            <DialogDescription>
              Follow these steps to install the app on your device
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">For Chrome, Edge, or other Chromium browsers:</h3>
              <ol className="list-decimal ml-5 text-sm space-y-2">
                <li>Click the three dots menu (⋮) in the top right</li>
                <li>Select "Install MQTT Explorer..." or "Install app"</li>
                <li>Follow the installation prompts</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">For Safari on iOS:</h3>
              <ol className="list-decimal ml-5 text-sm space-y-2">
                <li>Tap the Share button (rectangle with arrow)</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">For Firefox:</h3>
              <ol className="list-decimal ml-5 text-sm space-y-2">
                <li>Currently, Firefox doesn't fully support PWA installation</li>
                <li>You can use "Add to Home Screen" option on mobile or bookmark the app</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={closeManualInstructions}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallPrompt;