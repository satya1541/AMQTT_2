import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMqtt } from '@/hooks/use-mqtt';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Insight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

const AiInsights: React.FC = () => {
  const { messages } = useMqtt();
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [topicAnalysis, setTopicAnalysis] = useState<string>('');
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Get current topics
  const getUniqueTopics = (): string[] => {
    const topics = new Set<string>();
    messages.forEach(msg => {
      if (!msg.isSys) {
        topics.add(msg.topic);
      }
    });
    return Array.from(topics);
  };
  
  // Filter out system messages and get the relevant set for analysis
  const getMessagesForAnalysis = () => {
    // Only use the last 50 non-system messages for analysis to avoid too much data
    return messages
      .filter(msg => !msg.isSys)
      .slice(-100);
  };
  
  // Run AI analysis to get insights
  const runAiAnalysis = async () => {
    const messagesToAnalyze = getMessagesForAnalysis();
    
    if (messagesToAnalyze.length === 0) {
      toast({
        title: "No messages to analyze",
        description: "Connect to a broker and receive some messages first.",
        variant: "warning"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get AI insights
      const insightsResponse = await apiRequest('/api/insights/analyze', {
        method: 'POST',
        body: JSON.stringify({ messages: messagesToAnalyze }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (insightsResponse && insightsResponse.insights) {
        setInsights(insightsResponse.insights);
      }
      
      // Get AI recommendations
      const recommendationsResponse = await apiRequest('/api/insights/recommendations', {
        method: 'POST',
        body: JSON.stringify({ messages: messagesToAnalyze }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (recommendationsResponse && recommendationsResponse.recommendations) {
        setRecommendations(recommendationsResponse.recommendations);
      }
      
      // Get topic pattern analysis
      const topics = getUniqueTopics();
      if (topics.length > 0) {
        const topicResponse = await apiRequest('/api/insights/topics', {
          method: 'POST',
          body: JSON.stringify({ topics }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (topicResponse && topicResponse.analysis) {
          setTopicAnalysis(topicResponse.analysis);
        }
      }
      
      setLastAnalyzedTime(new Date().toLocaleString());
      
      toast({
        title: "AI Analysis Complete",
        description: "Analysis of your MQTT data has been successfully completed.",
        variant: "success"
      });
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing your data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
      <h2 className="font-heading text-xl mb-4 text-blue-400 flex items-center">
        <i className="fas fa-brain mr-2"></i> AI Insights
      </h2>
      
      {lastAnalyzedTime && (
        <div className="text-xs text-gray-400 mb-3">
          Last analyzed: {lastAnalyzedTime}
        </div>
      )}
      
      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="w-full mb-4 bg-gray-900 p-1 rounded-md">
          <TabsTrigger value="insights" className="flex-1 data-[state=active]:bg-gray-700">
            <i className="fas fa-lightbulb mr-2"></i> Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex-1 data-[state=active]:bg-gray-700">
            <i className="fas fa-check-square mr-2"></i> Recommendations
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex-1 data-[state=active]:bg-gray-700">
            <i className="fas fa-project-diagram mr-2"></i> Topics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="bg-gray-900 border-gray-700">
            <ScrollArea className="h-[240px] p-4">
              {insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className={`p-3 rounded-md flex items-start ${
                      insight.type === 'success' ? 'bg-green-900/30 border-l-2 border-green-400' :
                      insight.type === 'warning' ? 'bg-yellow-900/30 border-l-2 border-yellow-400' :
                      'bg-blue-900/30 border-l-2 border-blue-400'
                    }`}>
                      <div className="mr-2 mt-0.5">{getInsightIcon(insight.type)}</div>
                      <div className="text-sm">{insight.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8 px-2">
                  <i className="fas fa-search mb-2 text-2xl"></i>
                  <p className="mb-2">No data has been analyzed yet.</p>
                  <p>Click the "Run AI Analysis" button below to analyze your MQTT messages.</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="bg-gray-900 border-gray-700">
            <ScrollArea className="h-[240px] p-4">
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 bg-indigo-900/20 rounded-md border-l-2 border-indigo-400">
                      <div className="flex items-start">
                        <i className="fas fa-thumbs-up text-indigo-400 mr-2 mt-1"></i>
                        <div className="text-sm">{recommendation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8 px-2">
                  <i className="fas fa-clipboard-check mb-2 text-2xl"></i>
                  <p className="mb-2">No recommendations available yet.</p>
                  <p>Run an analysis to get optimization suggestions for your MQTT setup.</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>
        
        <TabsContent value="topics" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="bg-gray-900 border-gray-700">
            <ScrollArea className="h-[240px] p-4">
              {topicAnalysis ? (
                <div className="p-4 bg-purple-900/20 rounded-md">
                  <h4 className="text-purple-400 mb-2 flex items-center">
                    <i className="fas fa-sitemap mr-2"></i> Topic Structure Analysis
                  </h4>
                  <p className="text-sm whitespace-pre-line">{topicAnalysis}</p>
                  
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Current Topics:</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {getUniqueTopics().map((topic, index) => (
                        <div key={index} className="text-xs bg-gray-800 p-2 rounded-md">
                          <code>{topic}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8 px-2">
                  <i className="fas fa-project-diagram mb-2 text-2xl"></i>
                  <p className="mb-2">No topic analysis available yet.</p>
                  <p>Run an analysis to get insights about your MQTT topic structure.</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-4">
        <Button
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white"
          onClick={runAiAnalysis}
          disabled={messages.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i> Analyzing Data...
            </>
          ) : (
            <>
              <i className="fas fa-brain mr-2"></i> Run AI Analysis
            </>
          )}
        </Button>
        
        <div className="mt-3 text-xs text-center text-gray-500">
          <p>Analysis will use up to 100 of your most recent non-system messages.</p>
        </div>
      </div>
    </div>
  );
};

export default AiInsights;
