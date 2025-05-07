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
    // Enhanced threshold conditions
    thresholdMode?: 'simple' | 'sustained' | 'average';
    // If sustained mode, for how many consecutive checks
    sustainedCount?: number;
    // If average mode, calculate average over how many data points
    averageCount?: number;
    // Minimum time (milliseconds) between alerts for this rule
    cooldownPeriod?: number;
    // Lookback period for threshold analysis (milliseconds)
    analysisTimeWindow?: number;
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
  // Store metadata about rule triggering
  metadata?: {
    lastTriggered?: number;   // Timestamp when rule was last triggered
    triggerCount?: number;    // Number of times rule has been triggered
    consecutiveTriggersCount?: number; // For sustained mode tracking
    valuesHistory?: {value: number, timestamp: number}[]; // For average mode & analysis
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
  
  // Function to check if a numeric alert should be triggered based on threshold rules
  const shouldTriggerThresholdAlert = (rule: Rule, value: number): boolean => {
    // Get or initialize metadata
    if (!rule.metadata) {
      rule.metadata = {
        lastTriggered: 0,
        triggerCount: 0,
        consecutiveTriggersCount: 0,
        valuesHistory: []
      };
    }
    
    // Get current timestamp
    const now = Date.now();
    
    // Update value history for this rule
    rule.metadata.valuesHistory = [
      ...(rule.metadata.valuesHistory || []).filter(item => 
        // Keep only values within the analysis window if specified
        !rule.condition.analysisTimeWindow || 
        (now - item.timestamp <= rule.condition.analysisTimeWindow)
      ),
      { value, timestamp: now }
    ];
    
    // Set a max length to prevent memory issues (default 100 or averageCount if specified)
    const maxHistoryLength = Math.max(rule.condition.averageCount || 100, 100);
    if (rule.metadata.valuesHistory.length > maxHistoryLength) {
      rule.metadata.valuesHistory = rule.metadata.valuesHistory.slice(-maxHistoryLength);
    }
    
    // Apply cooldown period if specified
    if (rule.condition.cooldownPeriod && 
        rule.metadata.lastTriggered && 
        (now - rule.metadata.lastTriggered < rule.condition.cooldownPeriod)) {
      return false;
    }
    
    // Handle different threshold modes
    const thresholdMode = rule.condition.thresholdMode || 'simple';
    
    // Basic condition evaluates to true
    const basicConditionMet = evaluateCondition(rule.condition, value);
    
    if (thresholdMode === 'simple') {
      // Simple threshold: just use the basic condition
      if (basicConditionMet) {
        rule.metadata.consecutiveTriggersCount = (rule.metadata.consecutiveTriggersCount || 0) + 1;
      } else {
        rule.metadata.consecutiveTriggersCount = 0;
      }
      return basicConditionMet;
    } 
    else if (thresholdMode === 'sustained') {
      // Sustained threshold: condition must be true for X consecutive checks
      if (basicConditionMet) {
        rule.metadata.consecutiveTriggersCount = (rule.metadata.consecutiveTriggersCount || 0) + 1;
        // Check if we've hit the required sustained count
        return rule.metadata.consecutiveTriggersCount >= (rule.condition.sustainedCount || 3);
      } else {
        rule.metadata.consecutiveTriggersCount = 0;
        return false;
      }
    } 
    else if (thresholdMode === 'average') {
      // Average threshold: average of last X values must meet condition
      const history = rule.metadata.valuesHistory || [];
      const averageCount = rule.condition.averageCount || 5;
      
      // Need minimum number of data points
      if (history.length < averageCount) {
        return false;
      }
      
      // Calculate average from recent values
      const relevantValues = history.slice(-averageCount);
      const average = relevantValues.reduce((sum, item) => sum + item.value, 0) / relevantValues.length;
      
      // Check if average meets the condition
      const averageConditionMet = evaluateCondition({
        ...rule.condition,
        key: 'average' // Not used in this context
      }, average);
      
      if (averageConditionMet) {
        rule.metadata.consecutiveTriggersCount = (rule.metadata.consecutiveTriggersCount || 0) + 1;
      } else {
        rule.metadata.consecutiveTriggersCount = 0;
      }
      
      return averageConditionMet;
    }
    
    // Default fallback
    return basicConditionMet;
  };
  
  // Run analysis on a message
  const runAnalysis = (messagePayload: string) => {
    if (!messagePayload || rules.length === 0) return;
    
    try {
      // Parse the message
      const payload = JSON.parse(messagePayload);
      
      // Create updated rules array to handle rule metadata updates
      const updatedRules: Rule[] = [...rules];
      
      // Evaluate each rule
      updatedRules.forEach((rule, index) => {
        // Extract value for this rule's key
        const value = getValueByPath(payload, rule.condition.key);
        const numValue = typeof value === 'number' || !isNaN(Number(value)) ? Number(value) : null;
        
        // Check if rule should trigger based on threshold settings
        let shouldTrigger = false;
        
        if (numValue !== null && rule.condition.thresholdMode) {
          // For numeric values with threshold settings
          shouldTrigger = shouldTriggerThresholdAlert(rule, numValue);
        } else {
          // For simple condition evaluation (string and non-threshold numeric)
          shouldTrigger = evaluateCondition(rule.condition, value);
        }
        
        // Process rule actions if triggered
        if (shouldTrigger) {
          // Update rule metadata
          if (!rule.metadata) {
            rule.metadata = { triggerCount: 0 };
          }
          
          rule.metadata.lastTriggered = Date.now();
          rule.metadata.triggerCount = (rule.metadata.triggerCount || 0) + 1;
          
          // Execute alert action
          if (rule.actions.showAlert) {
            const alert: Alert = {
              id: Date.now().toString(),
              ruleName: rule.name,
              level: rule.actions.showAlert.level,
              message: rule.actions.showAlert.message,
              timestamp: Date.now()
            };
            
            // Add to alerts (avoid duplicates within short time period)
            setAlerts(prev => {
              const recentDuplicate = prev.some(a => 
                a.ruleName === alert.ruleName && 
                a.level === alert.level && 
                Date.now() - a.timestamp < 10000 // 10 seconds
              );
              
              if (!recentDuplicate) {
                // Show toast
                toast({
                  title: rule.name,
                  description: rule.actions.showAlert?.message || '',
                  variant: rule.actions.showAlert?.level === 'info' ? 'info' : 
                          rule.actions.showAlert?.level === 'warn' ? 'warning' : 'destructive'
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
          
          // Execute publish action
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
      
      // Update the rules with new metadata
      setRules(updatedRules);
      
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
