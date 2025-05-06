import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import mqtt, { IClientOptions, MqttClient, ISubscriptionGrant } from 'mqtt';
import { useToast } from './use-toast';
import { storeMessage, getMessages } from '@/lib/indexeddb';
import { loadSetting, saveSetting } from '@/lib/storage';

// Types
export interface MqttMessage {
  id: string;
  topic: string;
  payload: string;
  timestamp: number;
  retain?: boolean;
  qos?: 0 | 1 | 2;
  isSys?: boolean;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  brokerUrl: string;
  baseTopic: string;
  username: string;
  password: string;
}

export interface SysTopicData {
  [key: string]: string | number;
}

export interface TopicSubscription {
  topic: string;
  qos: 0 | 1 | 2;
}

type ConnectionMode = 'connect-only' | 'connect-auto' | 'connect-manual';

interface MqttContextType {
  client: MqttClient | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  connect: (options: ConnectionOptions) => void;
  disconnect: () => void;
  publish: (topic: string, message: string, options?: { qos?: 0 | 1 | 2, retain?: boolean }) => void;
  subscribe: (topic: string, qos?: 0 | 1 | 2) => void;
  unsubscribe: (topic: string) => void;
  messages: MqttMessage[];
  clearMessages: () => void;
  connectionOptions: ConnectionOptions | null;
  setConnectionOptions: React.Dispatch<React.SetStateAction<ConnectionOptions | null>>;
  connectionsProfiles: ConnectionProfile[];
  saveProfile: (profile: ConnectionProfile) => void;
  deleteProfile: (id: string) => void;
  subscriptions: TopicSubscription[];
  sysTopics: SysTopicData;
  publishingStatus: 'idle' | 'publishing-auto' | 'publishing-manual';
  startAutoPublishing: (interval: number) => void;
  stopAutoPublishing: () => void;
  startManualPublishing: (message: string, interval: number) => void;
  stopManualPublishing: () => void;
  publishOnce: (message: string) => void;
  lastPublished: Date | null;
  messageTemplates: { id: string; name: string; content: string }[];
  saveMessageTemplate: (template: { name: string; content: string }) => void;
  deleteMessageTemplate: (id: string) => void;
  connectionMode: ConnectionMode;
  setConnectionMode: (mode: ConnectionMode) => void;
  autoPublishInterval: number;
  setAutoPublishInterval: (interval: number) => void;
  manualPublishInterval: number;
  setManualPublishInterval: (interval: number) => void;
  manualMessage: string;
  setManualMessage: (message: string) => void;
  enableSysTopics: boolean;
  setEnableSysTopics: (enabled: boolean) => void;
  qos: 0 | 1 | 2;
  setQos: (qos: 0 | 1 | 2) => void;
  retain: boolean;
  setRetain: (retain: boolean) => void;
  pauseAutoScroll: boolean;
  setPauseAutoScroll: (pause: boolean) => void;
  formatJSON: boolean;
  setFormatJSON: (format: boolean) => void;
}

interface ConnectionOptions {
  brokerUrl: string;
  baseTopic: string;
  username?: string;
  password?: string;
  clientId?: string;
  clean?: boolean;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  enableSysTopics?: boolean;
}

const MqttContext = createContext<MqttContextType | undefined>(undefined);

export const MQTTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connectionOptions, setConnectionOptions] = useState<ConnectionOptions | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [connectionsProfiles, setConnectionsProfiles] = useState<ConnectionProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<TopicSubscription[]>([]);
  const [sysTopics, setSysTopics] = useState<SysTopicData>({});
  const [publishingStatus, setPublishingStatus] = useState<'idle' | 'publishing-auto' | 'publishing-manual'>('idle');
  const [lastPublished, setLastPublished] = useState<Date | null>(null);
  const [messageTemplates, setMessageTemplates] = useState<{ id: string; name: string; content: string }[]>([]);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('connect-only');
  const [autoPublishInterval, setAutoPublishInterval] = useState<number>(10);
  const [manualPublishInterval, setManualPublishInterval] = useState<number>(5);
  const [manualMessage, setManualMessage] = useState<string>('{\n  "metrics": {\n    "temp": 22.5,\n    "humid": 45,\n    "status": "normal"\n  },\n  "device": "demo-sensor-01",\n  "timestamp": 1698765432\n}');
  const [enableSysTopics, setEnableSysTopics] = useState<boolean>(false);
  const [qos, setQos] = useState<0 | 1 | 2>(1);
  const [retain, setRetain] = useState<boolean>(false);
  const [pauseAutoScroll, setPauseAutoScroll] = useState<boolean>(false);
  const [formatJSON, setFormatJSON] = useState<boolean>(true);
  
  const autoPublishingRef = useRef<NodeJS.Timeout | null>(null);
  const manualPublishingRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load saved settings
  useEffect(() => {
    // Load connection profiles
    const profiles = loadSetting<ConnectionProfile[]>('connectionProfiles', []);
    setConnectionsProfiles(profiles);

    // Load message templates
    const templates = loadSetting<{ id: string; name: string; content: string }[]>('messageTemplates', []);
    setMessageTemplates(templates);

    // Load other settings
    setQos(loadSetting<0 | 1 | 2>('qos', 1));
    setRetain(loadSetting<boolean>('retain', false));
    setEnableSysTopics(loadSetting<boolean>('enableSysTopics', false));
    setFormatJSON(loadSetting<boolean>('formatJSON', true));
    setPauseAutoScroll(loadSetting<boolean>('pauseAutoScroll', false));
    setAutoPublishInterval(loadSetting<number>('autoPublishInterval', 10));
    setManualPublishInterval(loadSetting<number>('manualPublishInterval', 5));
    setConnectionMode(loadSetting<ConnectionMode>('connectionMode', 'connect-only'));
    
    // Load last manual message if exists
    const lastMessage = loadSetting<string>('lastManualMessage', '');
    if (lastMessage) {
      setManualMessage(lastMessage);
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    saveSetting('qos', qos);
  }, [qos]);

  useEffect(() => {
    saveSetting('retain', retain);
  }, [retain]);

  useEffect(() => {
    saveSetting('enableSysTopics', enableSysTopics);
  }, [enableSysTopics]);

  useEffect(() => {
    saveSetting('formatJSON', formatJSON);
  }, [formatJSON]);

  useEffect(() => {
    saveSetting('pauseAutoScroll', pauseAutoScroll);
  }, [pauseAutoScroll]);

  useEffect(() => {
    saveSetting('autoPublishInterval', autoPublishInterval);
  }, [autoPublishInterval]);

  useEffect(() => {
    saveSetting('manualPublishInterval', manualPublishInterval);
  }, [manualPublishInterval]);

  useEffect(() => {
    saveSetting('connectionMode', connectionMode);
  }, [connectionMode]);

  useEffect(() => {
    saveSetting('lastManualMessage', manualMessage);
  }, [manualMessage]);

  // Scroll to bottom of messages when new ones arrive (if not paused)
  useEffect(() => {
    if (!pauseAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pauseAutoScroll]);

  // Connect to MQTT broker
  const connect = useCallback((options: ConnectionOptions) => {
    if (client) {
      client.end();
    }

    setConnectionStatus('connecting');
    toast({
      title: "Connecting",
      description: `Connecting to ${options.brokerUrl}...`,
      variant: "connecting",
    });

    try {
      const clientId = options.clientId || `mqtt-explorer-${Math.random().toString(16).substr(2, 8)}`;
      const mqttOptions: IClientOptions = {
        clientId,
        username: options.username,
        password: options.password,
        clean: options.clean !== undefined ? options.clean : true,
        reconnectPeriod: 5000, // Auto reconnect after 5 seconds
      };

      const mqttClient = mqtt.connect(options.brokerUrl, mqttOptions);

      mqttClient.on('connect', () => {
        setConnectionStatus('connected');
        setConnectionOptions(options);
        toast({
          title: "Connected",
          description: `Successfully connected to ${options.brokerUrl}`,
          variant: "success",
        });

        // Subscribe to base topic
        if (options.baseTopic) {
          mqttClient.subscribe(options.baseTopic, { qos: options.qos || 1 });
          setSubscriptions(prev => [...prev.filter(sub => sub.topic !== options.baseTopic), { topic: options.baseTopic, qos: options.qos || 1 }]);
        }

        // Subscribe to $SYS topics if enabled
        if (options.enableSysTopics) {
          const sysTopics = [
            '$SYS/broker/version',
            '$SYS/broker/uptime',
            '$SYS/broker/clients/connected',
            '$SYS/broker/clients/total',
            '$SYS/broker/messages/received',
            '$SYS/broker/messages/sent',
            '$SYS/broker/bytes/received',
            '$SYS/broker/bytes/sent',
            '$SYS/broker/load/messages/received/1min',
            '$SYS/broker/load/messages/sent/1min',
            '$SYS/broker/load/bytes/received/1min',
            '$SYS/broker/load/bytes/sent/1min'
          ];
          
          sysTopics.forEach(topic => {
            mqttClient.subscribe(topic, { qos: 0 });
          });
        }

        // Start auto publishing if in auto mode
        if (connectionMode === 'connect-auto') {
          startAutoPublishing(autoPublishInterval);
        } else if (connectionMode === 'connect-manual') {
          startManualPublishing(manualMessage, manualPublishInterval);
        }
      });

      mqttClient.on('message', (topic, payload, packet) => {
        const isSys = topic.startsWith('$SYS/');
        const message: MqttMessage = {
          id: Math.random().toString(36).substring(2, 15),
          topic,
          payload: payload.toString(),
          timestamp: Date.now(),
          retain: packet.retain,
          qos: packet.qos as 0 | 1 | 2,
          isSys
        };

        // Update messages list
        setMessages(prev => {
          const updatedMessages = [...prev, message];
          // Keep only the last 100 messages in state for performance
          return updatedMessages.slice(-100);
        });

        // Store non-$SYS messages in IndexedDB
        if (!isSys) {
          storeMessage(message);
        } else {
          // Update $SYS topics state
          if (enableSysTopics) {
            const sysTopic = topic.replace('$SYS/broker/', '');
            setSysTopics(prev => ({
              ...prev,
              [sysTopic]: payload.toString()
            }));
          }
        }
      });

      mqttClient.on('error', (err) => {
        console.error('MQTT client error:', err);
        toast({
          title: "Connection Error",
          description: `Error: ${err.message}`,
          variant: "destructive",
        });
      });

      mqttClient.on('close', () => {
        setConnectionStatus('disconnected');
        stopAutoPublishing();
        stopManualPublishing();
        toast({
          title: "Disconnected",
          description: "Connection closed",
          variant: "warning",
        });
      });

      mqttClient.on('reconnect', () => {
        setConnectionStatus('connecting');
        toast({
          title: "Reconnecting",
          description: "Attempting to reconnect...",
          variant: "connecting",
        });
      });

      setClient(mqttClient);
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Failed",
        description: `Failed to connect: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  }, [client, connectionMode, autoPublishInterval, manualPublishInterval, manualMessage, enableSysTopics, toast]);

  // Disconnect from MQTT broker
  const disconnect = useCallback(() => {
    if (client) {
      stopAutoPublishing();
      stopManualPublishing();
      client.end();
      setClient(null);
      setConnectionStatus('disconnected');
      setSubscriptions([]);
      setSysTopics({});
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from broker",
        variant: "info",
      });
    }
  }, [client, toast]);

  // Publish message
  const publish = useCallback((topic: string, message: string, options?: { qos?: 0 | 1 | 2, retain?: boolean }) => {
    if (client && connectionStatus === 'connected') {
      try {
        client.publish(
          topic, 
          message, 
          { 
            qos: options?.qos !== undefined ? options.qos : qos, 
            retain: options?.retain !== undefined ? options.retain : retain 
          }, 
          (err) => {
            if (err) {
              console.error('Publish error:', err);
              toast({
                title: "Publish Error",
                description: `Failed to publish: ${err.message}`,
                variant: "destructive",
              });
            } else {
              setLastPublished(new Date());
            }
          }
        );
      } catch (error) {
        console.error('Publish failed:', error);
        toast({
          title: "Publish Failed",
          description: `Error: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Cannot Publish",
        description: "Not connected to a broker",
        variant: "warning",
      });
    }
  }, [client, connectionStatus, qos, retain, toast]);

  // Subscribe to topic
  const subscribe = useCallback((topic: string, qosLevel: 0 | 1 | 2 = 1) => {
    if (client && connectionStatus === 'connected') {
      client.subscribe(topic, { qos: qosLevel }, (err, granted) => {
        if (err) {
          console.error('Subscribe error:', err);
          toast({
            title: "Subscribe Error",
            description: `Failed to subscribe to ${topic}: ${err.message}`,
            variant: "destructive",
          });
        } else if (granted) {
          // Update subscriptions list
          setSubscriptions(prev => {
            const exists = prev.some(sub => sub.topic === topic);
            if (exists) {
              return prev.map(sub => sub.topic === topic ? { ...sub, qos: qosLevel } : sub);
            } else {
              return [...prev, { topic, qos: qosLevel }];
            }
          });
          
          toast({
            title: "Subscribed",
            description: `Successfully subscribed to ${topic}`,
            variant: "success",
          });
        }
      });
    } else {
      toast({
        title: "Cannot Subscribe",
        description: "Not connected to a broker",
        variant: "warning",
      });
    }
  }, [client, connectionStatus, toast]);

  // Unsubscribe from topic
  const unsubscribe = useCallback((topic: string) => {
    if (client && connectionStatus === 'connected') {
      client.unsubscribe(topic, (err) => {
        if (err) {
          console.error('Unsubscribe error:', err);
          toast({
            title: "Unsubscribe Error",
            description: `Failed to unsubscribe from ${topic}: ${err.message}`,
            variant: "destructive",
          });
        } else {
          // Remove from subscriptions list
          setSubscriptions(prev => prev.filter(sub => sub.topic !== topic));
          
          toast({
            title: "Unsubscribed",
            description: `Successfully unsubscribed from ${topic}`,
            variant: "info",
          });
        }
      });
    }
  }, [client, connectionStatus, toast]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    toast({
      title: "Messages Cleared",
      description: "Live message feed has been cleared",
      variant: "info",
    });
  }, [toast]);

  // Save connection profile
  const saveProfile = useCallback((profile: ConnectionProfile) => {
    setConnectionsProfiles(prev => {
      const existingProfileIndex = prev.findIndex(p => p.id === profile.id);
      let newProfiles;
      
      if (existingProfileIndex >= 0) {
        // Update existing profile
        newProfiles = [...prev];
        newProfiles[existingProfileIndex] = profile;
      } else {
        // Add new profile
        newProfiles = [...prev, profile];
      }
      
      saveSetting('connectionProfiles', newProfiles);
      return newProfiles;
    });
    
    toast({
      title: "Profile Saved",
      description: `Profile "${profile.name}" has been saved`,
      variant: "success",
    });
  }, [toast]);

  // Delete connection profile
  const deleteProfile = useCallback((id: string) => {
    setConnectionsProfiles(prev => {
      const newProfiles = prev.filter(p => p.id !== id);
      saveSetting('connectionProfiles', newProfiles);
      return newProfiles;
    });
    
    toast({
      title: "Profile Deleted",
      description: "Connection profile has been deleted",
      variant: "info",
    });
  }, [toast]);

  // Start auto publishing random data
  const startAutoPublishing = useCallback((interval: number) => {
    stopAutoPublishing();
    stopManualPublishing();
    
    if (client && connectionStatus === 'connected' && connectionOptions?.baseTopic) {
      const generateRandomData = () => {
        const temp = (20 + Math.random() * 10).toFixed(1);
        const humid = Math.floor(30 + Math.random() * 50);
        const press = (1000 + Math.random() * 30).toFixed(1);
        const lux = Math.floor(Math.random() * 1000);
        const voltage = (3 + Math.random()).toFixed(2);
        const statuses = ['normal', 'warning', 'error'];
        const status = statuses[Math.floor(Math.random() * 3)];
        
        return JSON.stringify({
          metrics: {
            temp: parseFloat(temp),
            humid: humid,
            press: parseFloat(press),
            lux: lux,
            voltage: parseFloat(voltage),
            status: status
          },
          device: `sensor-${Math.floor(Math.random() * 5) + 1}`,
          timestamp: Date.now()
        }, null, 2);
      };
      
      // Publish immediately
      const randomData = generateRandomData();
      publish(connectionOptions.baseTopic, randomData);
      
      // Start interval
      autoPublishingRef.current = setInterval(() => {
        const randomData = generateRandomData();
        publish(connectionOptions.baseTopic, randomData);
      }, interval * 1000);
      
      setPublishingStatus('publishing-auto');
      
      toast({
        title: "Auto Publishing Started",
        description: `Publishing random data every ${interval} seconds`,
        variant: "success",
      });
    }
  }, [client, connectionStatus, connectionOptions, publish, toast]);

  // Stop auto publishing
  const stopAutoPublishing = useCallback(() => {
    if (autoPublishingRef.current) {
      clearInterval(autoPublishingRef.current);
      autoPublishingRef.current = null;
      setPublishingStatus('idle');
      
      toast({
        title: "Auto Publishing Stopped",
        variant: "info",
      });
    }
  }, [toast]);

  // Start manual publishing
  const startManualPublishing = useCallback((message: string, interval: number) => {
    stopAutoPublishing();
    stopManualPublishing();
    
    if (client && connectionStatus === 'connected' && connectionOptions?.baseTopic) {
      // Publish immediately
      try {
        // Validate JSON
        JSON.parse(message);
        publish(connectionOptions.baseTopic, message);
        
        // Start interval
        manualPublishingRef.current = setInterval(() => {
          publish(connectionOptions.baseTopic, message);
        }, interval * 1000);
        
        setPublishingStatus('publishing-manual');
        
        toast({
          title: "Manual Publishing Started",
          description: `Publishing message every ${interval} seconds`,
          variant: "success",
        });
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "The message is not valid JSON",
          variant: "destructive",
        });
      }
    }
  }, [client, connectionStatus, connectionOptions, publish, stopAutoPublishing, toast]);

  // Stop manual publishing
  const stopManualPublishing = useCallback(() => {
    if (manualPublishingRef.current) {
      clearInterval(manualPublishingRef.current);
      manualPublishingRef.current = null;
      setPublishingStatus('idle');
      
      toast({
        title: "Manual Publishing Stopped",
        variant: "info",
      });
    }
  }, [toast]);

  // Publish once
  const publishOnce = useCallback((message: string) => {
    if (client && connectionStatus === 'connected' && connectionOptions?.baseTopic) {
      try {
        // Validate JSON
        JSON.parse(message);
        publish(connectionOptions.baseTopic, message);
        
        toast({
          title: "Message Published",
          description: "Successfully published to " + connectionOptions.baseTopic,
          variant: "success",
        });
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "The message is not valid JSON",
          variant: "destructive",
        });
      }
    }
  }, [client, connectionStatus, connectionOptions, publish, toast]);

  // Save message template
  const saveMessageTemplate = useCallback((template: { name: string; content: string }) => {
    setMessageTemplates(prev => {
      const newTemplates = [...prev, { id: Date.now().toString(), ...template }];
      saveSetting('messageTemplates', newTemplates);
      return newTemplates;
    });
    
    toast({
      title: "Template Saved",
      description: `Template "${template.name}" has been saved`,
      variant: "success",
    });
  }, [toast]);

  // Delete message template
  const deleteMessageTemplate = useCallback((id: string) => {
    setMessageTemplates(prev => {
      const newTemplates = prev.filter(t => t.id !== id);
      saveSetting('messageTemplates', newTemplates);
      return newTemplates;
    });
    
    toast({
      title: "Template Deleted",
      description: "Message template has been deleted",
      variant: "info",
    });
  }, [toast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.end();
      }
      if (autoPublishingRef.current) {
        clearInterval(autoPublishingRef.current);
      }
      if (manualPublishingRef.current) {
        clearInterval(manualPublishingRef.current);
      }
    };
  }, [client]);

  const value: MqttContextType = {
    client,
    connectionStatus,
    connect,
    disconnect,
    publish,
    subscribe,
    unsubscribe,
    messages,
    clearMessages,
    connectionOptions,
    setConnectionOptions,
    connectionsProfiles,
    saveProfile,
    deleteProfile,
    subscriptions,
    sysTopics,
    publishingStatus,
    startAutoPublishing,
    stopAutoPublishing,
    startManualPublishing,
    stopManualPublishing,
    publishOnce,
    lastPublished,
    messageTemplates,
    saveMessageTemplate,
    deleteMessageTemplate,
    connectionMode,
    setConnectionMode,
    autoPublishInterval,
    setAutoPublishInterval,
    manualPublishInterval, 
    setManualPublishInterval,
    manualMessage,
    setManualMessage,
    enableSysTopics,
    setEnableSysTopics,
    qos,
    setQos,
    retain,
    setRetain,
    pauseAutoScroll,
    setPauseAutoScroll,
    formatJSON,
    setFormatJSON
  };

  return (
    <MqttContext.Provider value={value}>
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = () => {
  const context = useContext(MqttContext);
  if (context === undefined) {
    throw new Error('useMqtt must be used within a MQTTProvider');
  }
  return context;
};
