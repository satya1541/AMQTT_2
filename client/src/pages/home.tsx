import React from 'react';
import ConnectionForm from '@/components/connection-form';
import PublishPanel from '@/components/publish-panel';
import LiveDataFeed from '@/components/live-data-feed';
import SubscriptionManager from '@/components/subscription-manager';
import SysTopicsPanel from '@/components/sys-topics-panel';

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
        {/* Live Data Feed */}
        <LiveDataFeed />
        
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
