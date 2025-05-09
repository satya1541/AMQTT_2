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

  // ... (variants and getStatusClass remain the same)
  const logoVariants = { /* ... */ };
  const statusVariants = { /* ... */ };
  const getStatusClass = () => { /* ... */ };
  const headerVariants = { /* ... */ };
  const itemVariants = { /* ... */ };

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
            // Logo icon container size - kept original, seems okay
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
            {/* Logo icon font size - kept original */}
            <i className="fas fa-satellite-dish text-white text-xl relative z-10"></i>
          </motion.div>
          <motion.h1
            // Header title: text-xl on smallest, text-2xl from sm breakpoint
            className="font-heading text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-glow"
            variants={itemVariants}
          >
            MQTT Explorer
          </motion.h1>
        </motion.div>

        <motion.div className="flex items-center space-x-3 sm:space-x-4" variants={itemVariants}> {/* Increased base space-x */}
          <motion.div
            // Status indicator: Increased base padding and text size
            className="glass-card px-4 py-2 rounded-full flex items-center text-sm shadow-md" // Base text-sm, increased padding
            variants={statusVariants}
            animate={connectionStatus}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className={getStatusClass()}></span>
            <span className="ml-2 sm:ml-2.5"> {/* Adjusted margin slightly for sm */}
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
              size="icon" // Size "icon" usually means fixed dimensions, check if this needs to be larger
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
              {/* Theme toggle icon size - consider text-lg or text-xl if needed */}
              {theme === 'dark' ? (
                <i className="fas fa-moon text-yellow-300 text-base sm:text-lg relative z-10"></i>
              ) : (
                <i className="fas fa-sun text-yellow-500 text-base sm:text-lg relative z-10"></i>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.nav
        // Nav container: Increased base padding
        className="container mx-auto px-3 xs:px-4 flex overflow-x-auto"
        variants={itemVariants}
      >
        {/* Nav items wrapper: Increased base spacing */}
        <div className="flex space-x-2 sm:space-x-3 w-full border-b border-purple-900/30">
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
              className="relative flex-shrink-0"
            >
              <Link
                href={item.path}
                // Nav item: Increased base padding
                className={`flex items-center px-3 py-3 sm:px-4 whitespace-nowrap relative group transition-all duration-300 ease-in-out ${
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
                  {/* Nav Icon: Significantly larger on mobile (text-lg), slightly larger on sm+ (text-xl) */}
                  <i className={`fas fa-${item.icon} text-lg sm:text-xl ${currentPath === item.path ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'} sm:mr-2`}></i>
                </motion.span>
                {/* Nav Label: Hidden on smallest screens, appears at 'sm', text-sm size */}
                <span className="hidden sm:inline text-sm">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
    </motion.header>
  );
};

export default AppHeader;
