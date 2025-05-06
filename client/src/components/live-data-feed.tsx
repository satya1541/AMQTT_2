import React, { useRef, useEffect } from 'react';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

const LiveDataFeed: React.FC = () => {
  const { 
    messages, 
    clearMessages, 
    formatJSON, 
    setFormatJSON, 
    pauseAutoScroll, 
    setPauseAutoScroll
  } = useMqtt();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Format JSON if needed
  const formatPayload = (payload: string): string => {
    if (!formatJSON) return payload;
    
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return payload;
    }
  };

  // Scroll to bottom when new messages arrive if not paused
  useEffect(() => {
    if (!pauseAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pauseAutoScroll]);

  const toggleFormatJSON = () => {
    setFormatJSON(!formatJSON);
  };

  const togglePauseAutoScroll = () => {
    setPauseAutoScroll(!pauseAutoScroll);
  };

  const handleClearFeed = () => {
    clearMessages();
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const buttonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  const messageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div 
      className="glass-card neon-border rounded-lg shadow-xl p-4 flex flex-col h-96"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex justify-between items-center mb-4">
        <motion.h2 
          className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Live Sensor Data Feed
        </motion.h2>
        <div className="flex space-x-2">
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              variant="outline"
              size="icon"
              className="bg-gray-800/60 hover:bg-gray-700/80 text-white rounded-full relative overflow-hidden"
              onClick={togglePauseAutoScroll}
              title={pauseAutoScroll ? "Resume auto-scroll" : "Pause auto-scroll"}
            >
              <motion.span 
                className="absolute inset-0 bg-current rounded-full opacity-10"
                animate={{ 
                  scale: pauseAutoScroll ? [1, 1.2, 1] : [1, 1.5, 1]
                }}
                transition={{ 
                  duration: pauseAutoScroll ? 2 : 1.2,
                  repeat: Infinity
                }}
              />
              <i className={`fas ${pauseAutoScroll ? 'fa-play text-green-400' : 'fa-pause text-amber-400'} relative z-10`}></i>
            </Button>
          </motion.div>
          
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              variant="outline"
              size="icon"
              className="bg-gray-800/60 hover:bg-gray-700/80 text-white rounded-full relative overflow-hidden"
              onClick={toggleFormatJSON}
              title={formatJSON ? "View raw JSON" : "Pretty print JSON"}
            >
              <motion.span 
                className="absolute inset-0 bg-blue-500/10"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              <i className="fas fa-code text-blue-400 relative z-10"></i>
            </Button>
          </motion.div>
          
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button 
              variant="outline"
              size="icon"
              className="bg-gray-800/60 hover:bg-gray-700/80 text-white rounded-full relative overflow-hidden"
              onClick={handleClearFeed}
              title="Clear feed"
            >
              <motion.span 
                className="absolute inset-0 bg-red-500/10"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
              <i className="fas fa-trash-alt text-red-400 relative z-10"></i>
            </Button>
          </motion.div>
        </div>
      </div>
      
      <ScrollArea className="flex-grow bg-gray-900/70 rounded-lg shadow-inner font-mono text-sm p-3 border border-gray-800/80">
        <AnimatePresence initial={false}>
          <div className="space-y-3">
            {messages.map((message) => (
              <motion.div 
                key={message.id} 
                className={`border-l-4 ${message.isSys ? 'border-purple-500' : 'border-green-500'} glass-card p-3 rounded-md shadow-sm transition-all duration-300 hover:shadow-md`}
                variants={messageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
              >
                <div className="flex justify-between text-xs mb-2">
                  <motion.span 
                    className="text-gray-400 bg-gray-800/50 px-2 py-1 rounded-md"
                    whileHover={{ scale: 1.05 }}
                  >
                    {formatTimestamp(message.timestamp)}
                  </motion.span>
                  <motion.span 
                    className={`${message.isSys ? 'text-purple-400 bg-purple-950/30' : 'text-green-400 bg-green-950/30'} px-2 py-1 rounded-md`}
                    whileHover={{ scale: 1.05 }}
                  >
                    {message.topic}
                  </motion.span>
                </div>
                <pre className="text-white bg-gray-800/60 p-2 rounded-md overflow-x-auto border border-gray-700/30">{formatPayload(message.payload)}</pre>
              </motion.div>
            ))}
            
            {messages.length === 0 && (
              <motion.div 
                className="text-gray-400 p-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotateZ: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <i className="fas fa-satellite-dish text-gray-500 text-2xl"></i>
                </motion.div>
                <p>No messages received yet. Connect to a broker to see messages here.</p>
              </motion.div>
            )}
            
            <div ref={messagesEndRef}></div>
          </div>
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
};

export default LiveDataFeed;
