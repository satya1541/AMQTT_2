import React, { useState } from 'react';
import { useMqtt } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

const SubscriptionManager: React.FC = () => {
  const { toast } = useToast();
  const { connectionStatus, subscriptions, subscribe, unsubscribe } = useMqtt();
  const [newTopic, setNewTopic] = useState('');
  const [newQos, setNewQos] = useState<string>('1');

  const handleSubscribe = () => {
    if (!newTopic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic to subscribe",
        variant: "warning"
      });
      return;
    }

    subscribe(newTopic, parseInt(newQos) as 0 | 1 | 2);
    setNewTopic('');
  };

  const handleUnsubscribe = (topic: string) => {
    unsubscribe(topic);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">Dynamic Subscriptions</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input 
            type="text" 
            placeholder="Topic to subscribe" 
            className="flex-grow bg-gray-700 border-gray-600 focus:border-purple-500"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            disabled={connectionStatus !== 'connected'}
          />
          <Select 
            defaultValue="1" 
            value={newQos} 
            onValueChange={setNewQos}
            disabled={connectionStatus !== 'connected'}
          >
            <SelectTrigger className="w-auto bg-gray-700 border-gray-600 focus:border-purple-500">
              <SelectValue placeholder="QoS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">QoS 0</SelectItem>
              <SelectItem value="1">QoS 1</SelectItem>
              <SelectItem value="2">QoS 2</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="default"
            className="bg-blue-600 hover:bg-blue-500 text-white"
            onClick={handleSubscribe}
            disabled={connectionStatus !== 'connected' || !newTopic.trim()}
          >
            <i className="fas fa-plus"></i>
          </Button>
        </div>
        
        <ScrollArea className="h-40 bg-gray-900 rounded border border-gray-700">
          <div className="divide-y divide-gray-700">
            {subscriptions.map((subscription) => (
              <div key={subscription.topic} className="flex justify-between items-center p-2 text-sm">
                <div>
                  <span className="font-medium">{subscription.topic}</span>
                  <span className="text-xs bg-blue-900 text-blue-300 rounded px-1 ml-2">QoS {subscription.qos}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => handleUnsubscribe(subscription.topic)}
                  disabled={connectionStatus !== 'connected'}
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            ))}
            
            {subscriptions.length === 0 && (
              <div className="text-gray-500 p-4 text-center">
                No active subscriptions. Add topics above to subscribe.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SubscriptionManager;
