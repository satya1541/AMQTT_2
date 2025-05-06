import React from 'react';
import { Link } from 'wouter';
import { useTheme } from '@/hooks/use-theme';
import { useMqtt } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm bg-background/90 border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
        <motion.div 
          className="flex items-center space-x-3 mb-3 md:mb-0"
          variants={logoVariants}
          animate="animate"
        >
          <div className="h-8 w-8 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg data-flow-icon">
            <i className="fas fa-satellite-dish text-white text-xl"></i>
          </div>
          <h1 className="font-heading text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-glow">
            MQTT Explorer
          </h1>
        </motion.div>
        
        <div className="flex items-center space-x-4">
          <motion.div 
            className="glass-card px-4 py-1.5 rounded-full flex items-center text-sm shadow-md"
            variants={statusVariants}
            animate={connectionStatus}
          >
            <span className={getStatusClass()}></span>
            <span className="ml-2.5">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </motion.div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <i className="fas fa-moon text-yellow-300"></i>
            ) : (
              <i className="fas fa-sun text-yellow-500"></i>
            )}
          </Button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <nav className="container mx-auto px-4 flex overflow-x-auto">
        <Tabs defaultValue={currentPath === '/' ? '/' : currentPath} className="w-full">
          <TabsList className="w-full justify-start h-auto bg-transparent">
            {[
              { path: '/', icon: 'network-wired', label: 'Connection' },
              { path: '/visualize', icon: 'chart-line', label: 'Visualize' },
              { path: '/rules', icon: 'brain', label: 'AI & Rules' },
              { path: '/history', icon: 'history', label: 'History' },
              { path: '/settings', icon: 'cog', label: 'Settings' }
            ].map((item) => (
              <TabsTrigger 
                key={item.path} 
                value={item.path} 
                asChild 
                className="data-[state=active]:bg-gray-800/50 data-[state=active]:text-purple-400 data-[state=active]:border-b-2 data-[state=active]:border-purple-500 py-3 rounded-none transition-all duration-300 ease-in-out"
              >
                <Link href={item.path} className="flex items-center px-4">
                  <i className={`fas fa-${item.icon} mr-2 ${currentPath === item.path ? 'text-purple-400' : 'text-gray-400'}`}></i>
                  {item.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </nav>
    </header>
  );
};

export default AppHeader;
