import React from 'react';
import { useMqtt } from '@/hooks/use-mqtt';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const SysTopicsPanel: React.FC = () => {
  const { sysTopics, enableSysTopics, setEnableSysTopics, connectionStatus } = useMqtt();

  // Format system topics for display
  const formatValue = (key: string, value: string | number): string => {
    if (key === 'uptime') {
      // Convert seconds to days, hours, minutes
      const seconds = Number(value);
      if (isNaN(seconds)) return String(value);
      
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      return `${days}d ${hours}h ${minutes}m`;
    }
    
    if (key.includes('bytes')) {
      // Format bytes to KB, MB
      const bytes = Number(value);
      if (isNaN(bytes)) return String(value);
      
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / 1048576).toFixed(2)} MB`;
    }
    
    return String(value);
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .replace(/\//g, ' / ') // Add spaces around slashes
      .replace(/1min/g, '1 min') // Add space in 1min
      .replace(/_/g, ' '); // Replace underscores with spaces
  };

  // Toggle $SYS topic subscription
  const handleToggleSysTopics = () => {
    // Warn if turning off while connected
    if (enableSysTopics && connectionStatus === 'connected') {
      if (window.confirm('Disabling $SYS topics requires reconnecting to take effect. Continue?')) {
        setEnableSysTopics(!enableSysTopics);
      }
    } else {
      setEnableSysTopics(!enableSysTopics);
    }
  };

  // Get last update time
  const getLastUpdateTime = () => {
    if (Object.keys(sysTopics).length === 0) return 'Never';
    return new Date().toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">$SYS Broker Status</h2>
      
      <div className="space-y-4">
        <ScrollArea className="bg-gray-900 rounded p-3 space-y-2 h-40">
          {Object.keys(sysTopics).length > 0 ? (
            Object.entries(sysTopics).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-400">{formatKey(key)}:</span>
                <span>{formatValue(key, value)}</span>
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center py-4">
              {enableSysTopics 
                ? connectionStatus === 'connected' 
                  ? 'Waiting for $SYS topic data...' 
                  : 'Connect to broker to see $SYS topics'
                : '$SYS topics are disabled. Enable below to see broker status.'}
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Last Update: {getLastUpdateTime()}</span>
          <div className="flex items-center space-x-2">
            <Switch 
              id="sys-auto-update" 
              checked={enableSysTopics}
              onCheckedChange={handleToggleSysTopics}
              disabled={connectionStatus === 'connecting'}
            />
            <Label htmlFor="sys-auto-update" className="cursor-pointer">Enable $SYS Topics</Label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SysTopicsPanel;
