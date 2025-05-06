import React from 'react';
import { useRules, Alert } from '@/hooks/use-rules';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const AlertsPanel: React.FC = () => {
  const { alerts, clearAlert, clearAllAlerts } = useRules();

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getAlertStyles = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-900/50 border-l-4 border-blue-500';
      case 'warn':
        return 'bg-yellow-900/50 border-l-4 border-yellow-500';
      case 'error':
        return 'bg-red-900/50 border-l-4 border-red-500';
      default:
        return 'bg-gray-900/50 border-l-4 border-gray-500';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-2"></i>;
      case 'warn':
        return <i className="fas fa-exclamation-triangle text-yellow-500 mt-0.5 mr-2"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle text-red-500 mt-0.5 mr-2"></i>;
      default:
        return <i className="fas fa-bell text-gray-500 mt-0.5 mr-2"></i>;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl text-blue-400">Active Alerts</h2>
        <Button
          variant="outline"
          size="sm"
          className="bg-gray-700 hover:bg-gray-600 text-white"
          onClick={clearAllAlerts}
          disabled={alerts.length === 0}
        >
          <i className="fas fa-trash-alt mr-1"></i> Clear All
        </Button>
      </div>
      
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`${getAlertStyles(alert.level)} rounded p-3 flex items-start`}
              >
                {getAlertIcon(alert.level)}
                <div>
                  <h4 className="font-medium">{alert.ruleName}</h4>
                  <p className="text-sm">{alert.message}</p>
                  <div className="text-xs text-gray-400 mt-1">{formatTimestamp(alert.timestamp)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-gray-400 hover:text-white h-8 w-8 p-0"
                  onClick={() => clearAlert(alert.id)}
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            ))
          ) : (
            <div className="bg-gray-900 rounded p-6 text-center text-gray-400">
              <i className="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
              <p className="mb-1">SYSTEM NOMINAL</p>
              <p className="text-sm">No active alerts at this time</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AlertsPanel;
