import React from 'react';
import { Link } from 'wouter';
import { useTheme } from '@/hooks/use-theme';
import { useMqtt } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface AppHeaderProps {
  currentPath: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ currentPath }) => {
  const { theme, toggleTheme } = useTheme();
  const { connectionStatus } = useMqtt();

  const logoVariants = {
    animate: {
      scale: [1, 1.03, 1],
      transition: { 
        duration: 3, 
        repeat: Infinity,
        ease: "easeInOut" 
      }
    }
  };
  
  const statusVariants = {
    connecting: {
      opacity: [0.5, 1, 0.5],
      transition: { 
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" 
      }
    },
    connected: {},
    disconnected: {}
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected': return 'status-indicator status-connected';
      case 'connecting': return 'status-indicator status-connecting';
      case 'disconnected': return 'status-indicator status-disconnected';
      default: return 'status-indicator';
    }
  };

  const headerVariants = {
    initial: {
      opacity: 0,
      y: -10
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 backdrop-blur-sm bg-background/90 border-b border-border shadow-md"
      initial="initial"
      animate="animate"
      variants={headerVariants}
    >
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
        <motion.div 
          className="flex items-center space-x-3 mb-3 md:mb-0"
          variants={logoVariants}
          animate="animate"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.div 
            className="h-9 w-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg data-flow-icon relative overflow-hidden"
            whileHover={{ rotate: [0, 5, -5, 0], transition: { duration: 0.6 } }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20"
              animate={{ 
                x: ['-100%', '100%'],
                transition: { repeat: Infinity, duration: 2, ease: "linear" }
              }}
            />
            <i className="fas fa-satellite-dish text-white text-xl relative z-10"></i>
          </motion.div>
          <motion.h1 
            className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-glow"
            variants={itemVariants}
          >
            MQTT Explorer
          </motion.h1>
        </motion.div>
        
        <motion.div className="flex items-center space-x-4" variants={itemVariants}>
          <motion.div 
            className="glass-card px-4 py-1.5 rounded-full flex items-center text-sm shadow-md"
            variants={statusVariants}
            animate={connectionStatus}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className={getStatusClass()}></span>
            <span className="ml-2.5">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </motion.div>
          
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
          >
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 relative overflow-hidden"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <motion.span
                className="absolute inset-0 bg-yellow-500/10"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              {theme === 'dark' ? (
                <i className="fas fa-moon text-yellow-300 relative z-10"></i>
              ) : (
                <i className="fas fa-sun text-yellow-500 relative z-10"></i>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Navigation */}
      <motion.nav 
        className="container mx-auto px-4 flex overflow-x-auto"
        variants={itemVariants}
      >
        <div className="flex space-x-2 w-full border-b border-purple-900/30">
          {[
            { path: '/', icon: 'network-wired', label: 'Connection' },
            { path: '/live-feed', icon: 'stream', label: 'Live Feed' },
            { path: '/visualize', icon: 'chart-line', label: 'Visualize' },
            { path: '/rules', icon: 'brain', label: 'AI & Rules' },
            { path: '/history', icon: 'history', label: 'History' },
            { path: '/settings', icon: 'cog', label: 'Settings' }
          ].map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.4 }}
              className="relative"
            >
              <Link 
                href={item.path} 
                className={`flex items-center px-4 py-3 relative group transition-all duration-300 ease-in-out ${
                  currentPath === item.path 
                    ? 'bg-gray-800/50 text-purple-400 border-b-2 border-purple-500' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <motion.span
                  whileHover={{ 
                    scale: 1.2,
                    transition: { duration: 0.2 } 
                  }}
                  className="inline-block"
                >
                  <i className={`fas fa-${item.icon} mr-2 ${currentPath === item.path ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'}`}></i>
                </motion.span>
                <span>{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
    </motion.header>
  );
};

export default AppHeader;
