import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMqtt } from '@/hooks/use-mqtt';

interface Insight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

const AiInsights: React.FC = () => {
  const { messages } = useMqtt();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);
  
  // Automatically analyze the latest message when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (!latestMessage.isSys) {
        analyzeMessage(latestMessage.payload);
        setLastAnalyzedTime(new Date(latestMessage.timestamp).toLocaleString());
      }
    }
  }, [messages]);
  
  // Run analysis on the latest stored message
  const runAnalysis = () => {
    if (messages.length > 0) {
      // Find the latest non-$SYS message
      const nonSysMessages = messages.filter(msg => !msg.isSys);
      if (nonSysMessages.length > 0) {
        const latestMessage = nonSysMessages[nonSysMessages.length - 1];
        analyzeMessage(latestMessage.payload);
        setLastAnalyzedTime(new Date(latestMessage.timestamp).toLocaleString());
      }
    }
  };
  
  // Analyze message content for insights
  const analyzeMessage = (payload: string) => {
    try {
      // Try to parse JSON
      const data = JSON.parse(payload);
      const newInsights: Insight[] = [];
      
      // Count keys (complexity analysis)
      const keyCount = countKeysInObject(data);
      if (keyCount > 10) {
        newInsights.push({
          type: 'info',
          message: `Complex message with ${keyCount} data points detected.`
        });
      }
      
      // Check for status fields
      if (data.status) {
        if (data.status === 'error' || (data.metrics && data.metrics.status === 'error')) {
          newInsights.push({
            type: 'warning',
            message: 'Device is reporting an error status.'
          });
        } else if (data.status === 'warn' || (data.metrics && data.metrics.status === 'warning')) {
          newInsights.push({
            type: 'warning',
            message: 'Device is reporting a warning status.'
          });
        } else if (data.status === 'normal' || (data.metrics && data.metrics.status === 'normal')) {
          newInsights.push({
            type: 'success',
            message: 'Device is operating normally.'
          });
        }
      }
      
      // Temperature analysis
      if (data.temp || (data.metrics && data.metrics.temp)) {
        const temp = data.temp || data.metrics.temp;
        if (typeof temp === 'number') {
          if (temp > 30) {
            newInsights.push({
              type: 'warning',
              message: `High temperature (${temp}°C) detected.`
            });
          } else if (temp < 0) {
            newInsights.push({
              type: 'warning',
              message: `Low temperature (${temp}°C) detected.`
            });
          } else {
            newInsights.push({
              type: 'success',
              message: `Temperature (${temp}°C) is within normal range.`
            });
          }
        }
      }
      
      // Humidity analysis
      if (data.humid || (data.metrics && data.metrics.humid)) {
        const humid = data.humid || data.metrics.humid;
        if (typeof humid === 'number') {
          if (humid > 80) {
            newInsights.push({
              type: 'warning',
              message: `High humidity (${humid}%) detected.`
            });
          } else if (humid < 20) {
            newInsights.push({
              type: 'warning',
              message: `Low humidity (${humid}%) detected.`
            });
          } else {
            newInsights.push({
              type: 'success',
              message: `Humidity level (${humid}%) is optimal.`
            });
          }
        }
      }
      
      // Device ID detection
      if (data.device || data.deviceId || data.id) {
        const deviceId = data.device || data.deviceId || data.id;
        newInsights.push({
          type: 'info',
          message: `Data from device '${deviceId}'.`
        });
      }
      
      // Timestamp analysis
      if (data.timestamp) {
        const msgTime = new Date(
          typeof data.timestamp === 'number' && data.timestamp > 10000000000 
            ? data.timestamp // milliseconds
            : data.timestamp * 1000 // seconds to milliseconds
        );
        
        if (!isNaN(msgTime.getTime())) {
          const timeDiff = Math.abs(new Date().getTime() - msgTime.getTime()) / 1000;
          if (timeDiff > 3600) {
            newInsights.push({
              type: 'warning',
              message: `Message timestamp is ${Math.floor(timeDiff / 60)} minutes old.`
            });
          } else {
            newInsights.push({
              type: 'info',
              message: `Message timestamp is recent (${Math.floor(timeDiff)} seconds ago).`
            });
          }
        }
      }
      
      // If no specific insights were generated, add a generic one
      if (newInsights.length === 0) {
        newInsights.push({
          type: 'info',
          message: 'No specific patterns detected in the message data.'
        });
      }
      
      setInsights(newInsights);
      
    } catch (error) {
      // Not valid JSON
      setInsights([
        {
          type: 'warning',
          message: 'Message is not in JSON format, unable to analyze.'
        }
      ]);
    }
  };
  
  // Count total keys in a nested object
  const countKeysInObject = (obj: any, count = 0): number => {
    if (!obj || typeof obj !== 'object') return count;
    
    return Object.keys(obj).reduce((acc, key) => {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        return countKeysInObject(obj[key], acc + 1);
      }
      return acc + 1;
    }, count);
  };
  
  // Icon mapping for insight types
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <i className="fas fa-check-circle text-green-400 mr-2"></i>;
      case 'warning': return <i className="fas fa-exclamation-triangle text-yellow-400 mr-2"></i>;
      case 'info': return <i className="fas fa-info-circle text-blue-400 mr-2"></i>;
      default: return <i className="fas fa-circle text-gray-400 mr-2"></i>;
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 h-full">
      <h2 className="font-heading text-xl mb-4 text-blue-400">AI Insights</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-purple-400 font-medium mb-2 flex items-center">
            <i className="fas fa-brain mr-2"></i> Latest Analysis
          </h3>
          <div className="space-y-3 text-sm">
            {lastAnalyzedTime ? (
              <p>Analysis of message received at <span className="text-gray-400">{lastAnalyzedTime}</span></p>
            ) : (
              <p>No messages analyzed yet</p>
            )}
            
            <ScrollArea className="h-40">
              <div className="bg-gray-800 p-3 rounded space-y-2">
                {insights.length > 0 ? (
                  insights.map((insight, index) => (
                    <div key={index} className="flex items-start">
                      <div className="mr-2">{getInsightIcon(insight.type)}</div>
                      <div>{insight.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 text-center py-4">
                    <i className="fas fa-search mb-2 text-lg"></i>
                    <p>No data to analyze yet.</p>
                    <p>Connect to a broker and receive messages to generate insights.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <Button
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
          onClick={runAnalysis}
          disabled={messages.length === 0}
        >
          <i className="fas fa-sync-alt mr-2"></i> Run Analysis on Latest Data
        </Button>
      </div>
    </div>
  );
};

export default AiInsights;
