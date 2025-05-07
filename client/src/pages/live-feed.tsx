import React from 'react';
import LiveDataFeed from '@/components/live-data-feed';
import { motion } from 'framer-motion';

const LiveFeed: React.FC = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold mb-6">Live Sensor Data Feed</h1>
        <p className="text-muted-foreground mb-6">
          View real-time messages from your connected MQTT broker. Messages are displayed as they arrive 
          and can be formatted for better readability.
        </p>
      </motion.div>
      
      <LiveDataFeed />
    </div>
  );
};

export default LiveFeed;