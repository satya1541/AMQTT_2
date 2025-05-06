import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadSetting, saveSetting } from '@/lib/storage';
import { useMqtt } from '@/hooks/use-mqtt';
import { useToast } from '@/hooks/use-toast';

export interface Rule {
  id: string;
  name: string;
  condition: {
    key: string;
    operator: string;
    value: string;
  };
  actions: {
    showAlert: {
      level: 'info' | 'warn' | 'error';
      message: string;
    } | null;
    publishMessage: {
      topic: string;
      payload: string;
      qos: 0 | 1 | 2;
      retain: boolean;
    } | null;
  };
}

export interface Alert {
  id: string;
  ruleName: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

interface RulesContextType {
  rules: Rule[];
  alerts: Alert[];
  addRule: (rule: Rule) => void;
  deleteRule: (id: string) => void;
  clearAlert: (id: string) => void;
  clearAllAlerts: () => void;
  runAnalysis: (message: string) => void;
}

const RulesContext = createContext<RulesContextType | undefined>(undefined);

export const RulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { messages, publish } = useMqtt();
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [playSound, setPlaySound] = useState<boolean>(false);
  
  // Load saved rules from localStorage
  useEffect(() => {
    const savedRules = loadSetting<Rule[]>('rules', []);
    setRules(savedRules);
    
    const savedAlerts = loadSetting<Alert[]>('alerts', []);
    setAlerts(savedAlerts);
    
    const soundEnabled = loadSetting<boolean>('ruleSoundAlerts', false);
    setPlaySound(soundEnabled);
  }, []);
  
  // Save rules when they change
  useEffect(() => {
    saveSetting('rules', rules);
  }, [rules]);
  
  // Save alerts when they change
  useEffect(() => {
    saveSetting('alerts', alerts);
  }, [alerts]);
  
  // Evaluate rules against incoming messages
  useEffect(() => {
    if (messages.length > 0 && rules.length > 0) {
      // Get the latest non-$SYS message
      const nonSysMessages = messages.filter(msg => !msg.isSys);
      if (nonSysMessages.length > 0) {
        const latestMessage = nonSysMessages[nonSysMessages.length - 1];
        runAnalysis(latestMessage.payload);
      }
    }
  }, [messages, rules]);
  
  const addRule = (rule: Rule) => {
    setRules(prev => [...prev, rule]);
  };
  
  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
  };
  
  const clearAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };
  
  const clearAllAlerts = () => {
    setAlerts([]);
  };
  
  // Evaluate a rule against a value
  const evaluateCondition = (condition: Rule['condition'], value: any): boolean => {
    if (value === undefined || value === null) return false;
    
    const conditionValue = condition.value;
    
    // Try to convert to numbers if both are numeric
    let numValue: number | undefined;
    let numConditionValue: number | undefined;
    
    if (!isNaN(Number(value))) {
      numValue = Number(value);
    }
    
    if (!isNaN(Number(conditionValue))) {
      numConditionValue = Number(conditionValue);
    }
    
    // Use numeric comparison if both are numbers
    if (numValue !== undefined && numConditionValue !== undefined) {
      switch (condition.operator) {
        case '>': return numValue > numConditionValue;
        case '<': return numValue < numConditionValue;
        case '>=': return numValue >= numConditionValue;
        case '<=': return numValue <= numConditionValue;
        case '==': return numValue === numConditionValue;
        case '!=': return numValue !== numConditionValue;
        default: return false;
      }
    }
    
    // String comparison for non-numeric values
    const strValue = String(value);
    switch (condition.operator) {
      case '==': return strValue === conditionValue;
      case '!=': return strValue !== conditionValue;
      default: return false; // Other operators don't make sense for strings
    }
  };
  
  // Get value from object by dot notation path
  const getValueByPath = (obj: any, path: string): any => {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  };
  
  // Run analysis on a message
  const runAnalysis = (messagePayload: string) => {
    if (!messagePayload || rules.length === 0) return;
    
    try {
      // Parse the message
      const payload = JSON.parse(messagePayload);
      
      // Evaluate each rule
      rules.forEach(rule => {
        // Extract value for this rule's key
        const value = getValueByPath(payload, rule.condition.key);
        
        // Evaluate condition
        if (evaluateCondition(rule.condition, value)) {
          // Rule triggered, execute actions
          if (rule.actions.showAlert) {
            const alert: Alert = {
              id: Date.now().toString(),
              ruleName: rule.name,
              level: rule.actions.showAlert.level,
              message: rule.actions.showAlert.message,
              timestamp: Date.now()
            };
            
            // Add to alerts (avoid duplicates)
            setAlerts(prev => {
              const exists = prev.some(a => 
                a.ruleName === alert.ruleName && 
                a.level === alert.level && 
                a.message === alert.message
              );
              
              if (!exists) {
                // Show toast
                toast({
                  title: rule.name,
                  description: rule.actions.showAlert.message,
                  variant: rule.actions.showAlert.level === 'info' ? 'info' : 
                          rule.actions.showAlert.level === 'warn' ? 'warning' : 'destructive'
                });
                
                // Play sound if enabled
                if (playSound) {
                  // Could implement sound here
                  // const audio = new Audio('/path/to/sound.mp3');
                  // audio.play().catch(e => console.error('Error playing sound:', e));
                }
                
                return [...prev, alert];
              }
              
              return prev;
            });
          }
          
          if (rule.actions.publishMessage) {
            // Publish MQTT message
            publish(
              rule.actions.publishMessage.topic,
              rule.actions.publishMessage.payload,
              {
                qos: rule.actions.publishMessage.qos,
                retain: rule.actions.publishMessage.retain
              }
            );
          }
        }
      });
    } catch (error) {
      console.error('Error analyzing message:', error);
    }
  };
  
  const value: RulesContextType = {
    rules,
    alerts,
    addRule,
    deleteRule,
    clearAlert,
    clearAllAlerts,
    runAnalysis
  };
  
  return (
    <RulesContext.Provider value={value}>
      {children}
    </RulesContext.Provider>
  );
};

export const useRules = () => {
  const context = useContext(RulesContext);
  if (context === undefined) {
    throw new Error('useRules must be used within a RulesProvider');
  }
  return context;
};
