import React from 'react';
import { useRules, Rule } from '@/hooks/use-rules';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const RulesList: React.FC = () => {
  const { rules, deleteRule } = useRules();
  const { toast } = useToast();
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const handleDeleteRule = (ruleId: string) => {
    deleteRule(ruleId);
    setRuleToDelete(null);
    toast({
      title: "Rule Deleted",
      description: "The rule has been deleted successfully",
      variant: "info"
    });
  };

  const formatCondition = (rule: Rule): React.ReactNode => {
    const baseCondition = `${rule.condition.key} ${rule.condition.operator} ${rule.condition.value}`;
    
    // If no threshold mode or simple mode, just return the basic condition
    if (!rule.condition.thresholdMode || rule.condition.thresholdMode === 'simple') {
      return baseCondition;
    }
    
    // For sustained or average modes, add more details
    let thresholdInfo = '';
    
    if (rule.condition.thresholdMode === 'sustained') {
      thresholdInfo = `sustained for ${rule.condition.sustainedCount || 3} consecutive checks`;
    } else if (rule.condition.thresholdMode === 'average') {
      thresholdInfo = `average over ${rule.condition.averageCount || 5} data points`;
    }
    
    return (
      <>
        {baseCondition}
        <span className="block text-xs text-purple-400 mt-1">
          {rule.condition.thresholdMode === 'sustained' ? '⏱️' : '📊'} {thresholdInfo}
          {rule.condition.cooldownPeriod ? `, cooldown: ${formatTime(rule.condition.cooldownPeriod)}` : ''}
        </span>
      </>
    );
  };
  
  // Helper function to format time in ms to a readable format
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  };

  const formatActions = (rule: Rule): React.ReactNode => {
    const actions: React.ReactNode[] = [];
    
    if (rule.actions.showAlert) {
      const color = rule.actions.showAlert.level === 'info' 
        ? 'text-blue-400' 
        : rule.actions.showAlert.level === 'warn' 
          ? 'text-yellow-400' 
          : 'text-red-400';
      
      actions.push(
        <span key="alert" className={color}>
          Show {rule.actions.showAlert.level === 'info' ? 'Info' : rule.actions.showAlert.level === 'warn' ? 'Warning' : 'Error'} Alert
        </span>
      );
    }
    
    if (rule.actions.publishMessage) {
      actions.push(
        <span key="publish" className="text-green-400">
          Publish to {rule.actions.publishMessage.topic}
        </span>
      );
    }
    
    return (
      <>
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>, </span>}
            {action}
          </React.Fragment>
        ))}
      </>
    );
  };

  if (rules.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl p-4">
        <h2 className="font-heading text-xl mb-4 text-blue-400">Active Rules</h2>
        <div className="bg-gray-900 rounded p-6 text-center text-gray-400">
          <i className="fas fa-clipboard-list text-3xl mb-2"></i>
          <p>No active rules yet. Create a rule to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">Active Rules</h2>
      
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-gray-900 rounded p-3">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{rule.name}</h3>
                <AlertDialog open={ruleToDelete === rule.id} onOpenChange={(open) => !open && setRuleToDelete(null)}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                      onClick={() => setRuleToDelete(rule.id)}
                    >
                      <i className="fas fa-trash-alt"></i>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Are you sure you want to delete the rule "{rule.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setRuleToDelete(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="mt-2 text-sm">
                <div className="text-gray-400">If: <span className="text-white">{formatCondition(rule)}</span></div>
                <div className="text-gray-400">Then: {formatActions(rule)}</div>
                
                {/* Show rule metadata if available */}
                {rule.metadata && rule.metadata.triggerCount !== undefined && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span className="inline-block mr-3">
                      <span className="text-blue-400">Triggered:</span> {rule.metadata.triggerCount} times
                    </span>
                    {rule.metadata.lastTriggered && rule.metadata.lastTriggered > 0 && (
                      <span>
                        <span className="text-blue-400">Last:</span> {new Date(rule.metadata.lastTriggered).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Need to import useState
import { useState } from 'react';

export default RulesList;
