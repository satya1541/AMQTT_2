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
      {/* Top section of the header - Adjusted py to py-3 for a slightly less tall top section */}
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
            className="font-heading text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-glow"
            variants={itemVariants}
          >
            MQTT Explorer
          </motion.h1>
        </motion.div>

        {/* Status and Theme Toggle - Adjusted space-x for potentially smaller buttons */}
        <motion.div className="flex items-center space-x-2 sm:space-x-3" variants={itemVariants}>
          <motion.div
            // Status indicator - made it a bit more compact to match image style
            className="glass-card px-3 py-1.5 rounded-full flex items-center text-xs sm:text-sm shadow-md"
            variants={statusVariants}
            animate={connectionStatus}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className={getStatusClass()}></span>
            <span className="ml-2"> {/* Removed sm:ml-2.5 for consistency */}
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
              size="icon" // This size should be appropriate for an icon button
              className="rounded-full bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 relative overflow-hidden w-9 h-9 sm:w-10 sm:h-10" // Explicit size
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <motion.span
                className="absolute inset-0 bg-yellow-500/10"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              {/* Icon size for theme toggle */}
              <i className={`fas ${theme === 'dark' ? 'fa-moon text-yellow-300' : 'fa-sun text-yellow-500'} text-base sm:text-lg relative z-10`}></i>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Navigation - Icons Only */}
      <motion.nav
        // Container for nav items, px-2 for tighter fit if needed on very small screens
        className="container mx-auto px-2 sm:px-4 flex overflow-x-auto"
        variants={itemVariants}
      >
        {/* Centering the icons if they don't fill the width, space-x for gaps */}
        <div className="flex justify-center sm:justify-start space-x-1 xs:space-x-2 w-full border-b border-purple-900/30">
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
              className="relative flex-shrink-0" // Prevents icons from shrinking
            >
              <Link
                href={item.path}
                // Adjusted padding for icon-only bar: py-3 for height, px-3 or px-4 for width
                // The image's active item has a darker background, so bg-gray-800/50 is good.
                className={`flex items-center justify-center px-3 sm:px-4 py-3 relative group transition-all duration-300 ease-in-out ${
                  currentPath === item.path
                    ? 'bg-gray-800/70 text-purple-400 border-b-2 border-purple-500' // Active: darker bg, purple text, purple border
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30' // Inactive: hover state
                }`}
                title={item.label} // Add title for accessibility since label is hidden
              >
                {/* Icon size: text-xl or text-2xl. Let's try text-xl. */}
                <i className={`fas fa-${item.icon} text-lg sm:text-xl ${currentPath === item.path ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-200'}`}></i>
                {/* Label is now permanently hidden visually, but good for screen readers if it were present */}
                {/* <span className="hidden">{item.label}</span> */}
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
    </motion.header>
  );
};

export default AppHeader;
