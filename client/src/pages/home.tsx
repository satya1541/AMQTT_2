import React from 'react';
import ConnectionForm from '@/components/connection-form';
import PublishPanel from '@/components/publish-panel';
import SubscriptionManager from '@/components/subscription-manager';
import SysTopicsPanel from '@/components/sys-topics-panel';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const Home: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Connection Control Panel */}
      <div className="lg:col-span-1 space-y-6">
        {/* Connection Form */}
        <ConnectionForm />
        
        {/* Publishing Panel */}
        <PublishPanel />
      </div>
      
      {/* Message Panels */}
      <div className="lg:col-span-2 space-y-6">
        {/* Navigation Panel */}
        <motion.div 
          className="p-6 border rounded-lg bg-card shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-4">Getting Started</h2>
          <p className="text-muted-foreground mb-4">
            Connect to your MQTT broker using the form on the left, then explore your data using the navigation options below.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Link href="/live-feed">
              <Button className="w-full h-24 text-lg justify-start gap-4" variant="outline">
                <i className="fas fa-stream text-2xl text-blue-400"></i>
                <div className="text-left">
                  <div className="font-bold">Live Feed</div>
                  <div className="text-sm text-muted-foreground">View real-time message data</div>
                </div>
              </Button>
            </Link>
            <Link href="/visualize">
              <Button className="w-full h-24 text-lg justify-start gap-4" variant="outline">
                <i className="fas fa-chart-line text-2xl text-purple-400"></i>
                <div className="text-left">
                  <div className="font-bold">Visualize</div>
                  <div className="text-sm text-muted-foreground">Chart data from messages</div>
                </div>
              </Button>
            </Link>
          </div>
        </motion.div>
        
        {/* Dynamic Subscriptions & $SYS Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dynamic Subscriptions */}
          <SubscriptionManager />
          
          {/* $SYS Topics */}
          <SysTopicsPanel />
        </div>
      </div>
    </div>
  );
};

export default Home;
