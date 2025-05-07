import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  className?: string;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-lg 
                     bg-opacity-90 backdrop-blur-sm bg-red-900 border border-red-600 shadow-lg
                     text-white z-50 flex items-center ${className}`}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
          <i className="fas fa-wifi-slash text-xl mr-3"></i>
          <div>
            <h3 className="font-bold">You're offline</h3>
            <p className="text-sm text-red-200">Some features may be limited until you reconnect</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;