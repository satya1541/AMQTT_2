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

  // ... (variants and getStatusClass remain the same) ...
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
      {/* ====== TOP PART (Logo, Title, Status, Theme Toggle) ====== */}
      {/* Assuming this part is mostly okay, but let me know if it also needs tweaks */}
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
        <motion.div
          className="flex items-center space-x-3 mb-3 md:mb-0"
          variants={logoVariants} /* ... */
        >
          <motion.div
            className="h-9 w-9 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg data-flow-icon relative overflow-hidden"
            /* ... */
          >
            <motion.div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20" /* ... */ />
            <i className="fas fa-satellite-dish text-white text-xl relative z-10"></i>
          </motion.div>
          <motion.h1
            className="font-heading text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-glow"
            variants={itemVariants}
          >
            MQTT Explorer
          </motion.h1>
        </motion.div>

        <motion.div className="flex items-center space-x-3 xs:space-x-4" variants={itemVariants}>
          <motion.div
            className="glass-card px-3 py-1.5 xs:px-4 rounded-full flex items-center text-xs sm:text-sm shadow-md"
            /* ... */
          >
            <span className={getStatusClass()}></span>
            <span className="ml-2 xs:ml-2.5">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </motion.div>
          <motion.div /* ... Theme Toggle Button ... */ >
            <Button /* ... */ >
              {/* ... */}
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* ====== NAVIGATION BAR - REVISED FOCUS AREA ====== */}
      <motion.nav
        // REVISED: Increased overall padding for the nav container slightly if needed,
        // but individual item padding is more impactful.
        // px-2 was quite small, px-3 or px-4 might be better for the container.
        className="container mx-auto px-3 sm:px-4 flex overflow-x-auto"
        variants={itemVariants}
      >
        {/* REVISED: More generous spacing between nav items across breakpoints */}
        <div className="flex space-x-2 xs:space-x-3 sm:space-x-4 w-full border-b border-purple-900/30">
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
              className="relative flex-shrink-0" // Keeps items from collapsing too much
            >
              <Link
                href={item.path}
                // REVISED: Increased padding for better touch targets and visual balance.
                // py-3 is a decent vertical padding. px-3 for icon-only, px-4 when label appears.
                className={`flex items-center px-3 py-3 sm:px-4 whitespace-nowrap relative group transition-all duration-300 ease-in-out ${
                  currentPath === item.path
                    ? 'bg-gray-800/50 text-purple-400 border-b-2 border-purple-500' // Active state
                    : 'text-gray-400 hover:text-gray-200' // Default state
                }`}
              >
                <motion.span
                  whileHover={{
                    scale: 1.2, // This hover effect might make small icons feel more interactive
                    transition: { duration: 0.2 }
                  }}
                  className="inline-block"
                >
                  {/* REVISED: Icon sizes. text-lg (18px) for smallest, text-xl (20px) when labels appear. */}
                  {/* Ensure Font Awesome is loaded and icons are rendering. */}
                  <i className={`fas fa-${item.icon} text-lg sm:text-xl ${currentPath === item.path ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-300'} sm:mr-2`}></i>
                </motion.span>
                {/* REVISED: Label hidden on xs, shown from sm. Text size sm (14px) then base (16px). */}
                <span className="hidden sm:inline text-sm md:text-base">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.nav>
    </motion.header>
  );
};

export default AppHeader;
