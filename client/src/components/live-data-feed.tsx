import React, { useRef, useEffect } from 'react';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col h-96">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl text-blue-400">Live Sensor Data Feed</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            size="icon"
            className="bg-gray-700 hover:bg-gray-600 text-white"
            onClick={togglePauseAutoScroll}
            title={pauseAutoScroll ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            <i className={`fas ${pauseAutoScroll ? 'fa-play' : 'fa-pause'}`}></i>
          </Button>
          <Button 
            variant="outline"
            size="icon"
            className="bg-gray-700 hover:bg-gray-600 text-white"
            onClick={toggleFormatJSON}
            title={formatJSON ? "View raw JSON" : "Pretty print JSON"}
          >
            <i className="fas fa-code"></i>
          </Button>
          <Button 
            variant="outline"
            size="icon"
            className="bg-gray-700 hover:bg-gray-600 text-white"
            onClick={handleClearFeed}
            title="Clear feed"
          >
            <i className="fas fa-trash-alt"></i>
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-grow bg-gray-900 rounded font-mono text-sm p-2">
        <div className="space-y-2">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`border-l-4 ${message.isSys ? 'border-purple-500' : 'border-green-500'} bg-gray-800 p-2 rounded`}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{formatTimestamp(message.timestamp)}</span>
                <span className={message.isSys ? 'text-purple-400' : 'text-green-400'}>{message.topic}</span>
              </div>
              <pre className="text-white overflow-x-auto">{formatPayload(message.payload)}</pre>
            </div>
          ))}
          
          {messages.length === 0 && (
            <div className="text-gray-500 p-4 text-center">
              No messages received yet. Connect to a broker to see messages here.
            </div>
          )}
          
          <div ref={messagesEndRef}></div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LiveDataFeed;
