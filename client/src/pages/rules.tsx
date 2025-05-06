import React from 'react';
import AiInsights from '@/components/ai-insights';
import RuleCreator from '@/components/rule-creator';
import RulesList from '@/components/rules-list';
import AlertsPanel from '@/components/alerts-panel';

const Rules: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* AI Insights Panel */}
      <div className="lg:col-span-1">
        <AiInsights />
      </div>
      
      {/* Rules Management */}
      <div className="lg:col-span-2 space-y-6">
        {/* Create Rule */}
        <RuleCreator />
        
        {/* Active Rules & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Rules */}
          <RulesList />
          
          {/* Active Alerts */}
          <AlertsPanel />
        </div>
      </div>
    </div>
  );
};

export default Rules;
