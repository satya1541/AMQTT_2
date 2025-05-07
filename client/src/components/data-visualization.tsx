import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { useCharts } from '@/hooks/use-charts';
import { useMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import ChartSettingsPanel from './chart-settings-panel';
import ChartExportPanel from './chart-export-panel';
import SimplifiedChart from './simplified-chart';

interface DataKey {
  path: string;
  selected: boolean;
}

interface ChartData {
  id: string;
  key: string;
  type: string;
  color: string;
  data: { x: number; y: number }[];
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
  trend?: 'rising' | 'falling' | 'stable' | null;
  volatility?: 'high' | 'medium' | 'low' | null;
  insights?: string[];
}

const DataVisualization: React.FC = () => {
  const { messages } = useMqtt();
  const { settings: chartSettings } = useCharts();
  const isMobile = useMobile();
  
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [chartType, setChartType] = useState<string>(chartSettings.defaultType);
  const [chartColor, setChartColor] = useState<string>(chartSettings.defaultColor);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);

  // Extract numeric data keys from incoming messages
  useEffect(() => {
    if (messages.length === 0) return;
    
    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    
    try {
      // Parse the message payload if it's JSON
      let payload: any;
      try {
        payload = JSON.parse(latestMessage.payload);
      } catch (e) {
        // Not JSON, skip
        return;
      }
      
      // Find all numeric keys in the payload
      const newKeys = findNumericKeys(payload);
      
      // Update data keys, preserving selection state
      setDataKeys(prevKeys => {
        const existingKeyPaths = new Set(prevKeys.map(k => k.path));
        const updatedKeys = [...prevKeys];
        
        // Add new keys that don't exist
        newKeys.forEach(newKey => {
          if (!existingKeyPaths.has(newKey)) {
            updatedKeys.push({ path: newKey, selected: false });
          }
        });
        
        return updatedKeys;
      });
      
      // Update chart data for selected keys
      updateChartData(latestMessage);
      
    } catch (e) {
      console.error('Error processing message for chart keys:', e);
    }
  }, [messages]);

  // Create or update charts when selected keys change
  useEffect(() => {
    // Update charts based on selected keys
    const selectedKeys = dataKeys.filter(k => k.selected).map(k => k.path);
    
    // Remove charts for unselected keys
    setCharts(prevCharts => {
      const updatedCharts = prevCharts.filter(chart => selectedKeys.includes(chart.key));
      
      // Add new charts for newly selected keys
      selectedKeys.forEach(key => {
        if (!prevCharts.find(chart => chart.key === key)) {
          updatedCharts.push({
            id: `chart-${key}-${Date.now()}`,
            key: key,
            type: chartType,
            color: chartColor,
            data: [],
            min: null,
            max: null,
            avg: null,
            last: null
          });
        }
      });
      
      return updatedCharts;
    });
  }, [dataKeys, chartType, chartColor]);

  // Handle toggling data keys
  const handleKeyToggle = (path: string, checked: boolean) => {
    setDataKeys(prevKeys => 
      prevKeys.map(key => 
        key.path === path 
          ? { ...key, selected: checked } 
          : key
      )
    );
  };

  // Handle changing chart type for all charts
  const handleChartTypeChange = (type: string) => {
    setChartType(type);
    setCharts(prevCharts => 
      prevCharts.map(chart => ({ ...chart, type }))
    );
  };

  // Handle changing chart color
  const handleColorChange = (color: string) => {
    setChartColor(color);
    setCharts(prevCharts => 
      prevCharts.map(chart => ({ ...chart, color }))
    );
  };

  // Clear all charts
  const handleClearAllCharts = () => {
    setCharts([]);
    setDataKeys(prevKeys => 
      prevKeys.map(key => ({ ...key, selected: false }))
    );
  };

  // Update chart data with new message
  const updateChartData = (message: MqttMessage) => {
    try {
      let payload: any;
      try {
        payload = JSON.parse(message.payload);
      } catch (e) {
        return;
      }
      
      // Update each chart if it's showing a key that's in this message
      setCharts(prevCharts => {
        if (!prevCharts.length) return prevCharts;
        
        return prevCharts.map(chartData => {
          // Extract value for this chart's key
          const value = getValueByPath(payload, chartData.key);
          if (typeof value !== 'number') return chartData;
          
          // Add new data point
          const newData = [...chartData.data, { x: chartData.data.length, y: value }];
          
          // Keep only the last maxDataPoints from settings
          const truncatedData = newData.slice(-chartSettings.maxDataPoints);
          
          // Recalculate statistics
          const values = truncatedData.map(d => d.y);
          if (!values.length) return chartData;
          
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const last = values[values.length - 1];
          
          // Detect trends
          const trend = detectTrend(truncatedData);
          const volatility = calculateVolatility(truncatedData);
          const insights = generateInsights({
            ...chartData,
            data: truncatedData,
            min,
            max,
            avg,
            last,
            trend,
            volatility
          });
          
          return {
            ...chartData,
            data: truncatedData,
            min,
            max,
            avg,
            last,
            trend,
            volatility,
            insights
          };
        });
      });
    } catch (e) {
      console.error('Error updating chart data:', e);
    }
  };

  // Recursively find all numeric keys in an object
  const findNumericKeys = (obj: any, prefix = ''): string[] => {
    let keys: string[] = [];
    
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'number') {
          keys.push(path);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys = [...keys, ...findNumericKeys(value, path)];
        }
      });
    }
    
    return keys;
  };

  // Get value from object by dot notation path
  const getValueByPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    
    return current;
  };
  
  // Detect trends in data series
  const detectTrend = (data: { x: number; y: number }[]): 'rising' | 'falling' | 'stable' | null => {
    if (data.length < 5) return null; // Need at least 5 points for meaningful trend
    
    // Use the last 10 points for trend detection
    const recentData = data.slice(-10);
    
    // Simple linear regression
    const xValues = recentData.map(d => d.x);
    const yValues = recentData.map(d => d.y);
    
    const xMean = xValues.reduce((sum, val) => sum + val, 0) / xValues.length;
    const yMean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < xValues.length; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    
    // Determine trend direction based on slope
    const threshold = 0.05;
    if (Math.abs(slope) < threshold) return 'stable';
    return slope > 0 ? 'rising' : 'falling';
  };
  
  // Calculate data volatility
  const calculateVolatility = (data: { x: number; y: number }[]): 'high' | 'medium' | 'low' | null => {
    if (data.length < 5) return null;
    
    const yValues = data.map(d => d.y);
    
    // Calculate standard deviation
    const mean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    const squaredDiffs = yValues.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calculate coefficient of variation (CV)
    const cv = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    
    // Determine volatility level
    if (cv < 0.05) return 'low';
    if (cv < 0.15) return 'medium';
    return 'high';
  };
  
  // Generate insights based on data patterns
  const generateInsights = (chartData: ChartData): string[] => {
    if (!chartData.data.length || chartData.data.length < 5) return [];
    
    const insights: string[] = [];
    const trend = chartData.trend;
    const volatility = chartData.volatility;
    
    // Time-weighted trend analysis (focus more on recent data)
    const recentData = chartData.data.slice(-5);
    const recentTrend = detectTrend(recentData);
    
    // Add trend insights with time context
    if (trend) {
      if (trend === 'rising') {
        insights.push(`Upward trend detected.`);
      } else if (trend === 'falling') {
        insights.push(`Downward trend detected.`);
      } else if (trend === 'stable') {
        insights.push(`Stable trend with minimal variation.`);
      }
    }
    
    // Add volatility insights
    if (volatility) {
      if (volatility === 'high') {
        insights.push(`High volatility indicates unstable readings.`);
      } else if (volatility === 'low') {
        insights.push(`Low volatility indicates consistent readings.`);
      }
    }
    
    // Compare recent trend vs overall trend
    if (trend && recentTrend && trend !== recentTrend) {
      insights.push(`Recent change in trend direction.`);
    }
    
    // Check for boundary conditions
    if (chartData.min !== null && chartData.max !== null) {
      const range = chartData.max - chartData.min;
      const threshold = range * 0.1; // 10% of range
      
      if (chartData.last !== null) {
        if (Math.abs(chartData.last - chartData.max) < threshold) {
          insights.push(`Current value approaching upper range.`);
        } else if (Math.abs(chartData.last - chartData.min) < threshold) {
          insights.push(`Current value approaching lower range.`);
        }
      }
    }
    
    // Return the top 3 most important insights to avoid overwhelming
    return insights.slice(0, 3);
  };

  const getTrendIcon = (trend: string | null | undefined) => {
    if (!trend) return null;
    
    switch (trend) {
      case 'rising': return <span className="text-green-500">↗</span>;
      case 'falling': return <span className="text-red-500">↘</span>;
      case 'stable': return <span className="text-blue-500">→</span>;
      default: return null;
    }
  };

  // Render no charts message if no data keys found
  if (dataKeys.length === 0) {
    return (
      <div className="grid place-items-center mt-8 h-[300px] text-center">
        <div className="max-w-md space-y-3">
          <div className="text-5xl opacity-50 mx-auto">📊</div>
          <h3 className="text-xl font-medium">No Data to Visualize</h3>
          <p className="text-muted-foreground">
            Connect to your MQTT broker and subscribe to topics containing numeric data to see visualizations. 
            JSON messages with numeric fields will be automatically detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center">
            <span className="mr-2">Chart Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Data keys selection */}
            <div className="space-y-3">
              <h3 className="font-medium">Available Data Points</h3>
              <div className="h-[150px] overflow-y-auto bg-secondary/20 rounded-md p-2 border space-y-2">
                {dataKeys.map((key, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`key-${index}`}
                      checked={key.selected}
                      onCheckedChange={(checked) => handleKeyToggle(key.path, checked as boolean)}
                    />
                    <Label 
                      htmlFor={`key-${index}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {key.path}
                    </Label>
                  </div>
                ))}
                {dataKeys.length === 0 && (
                  <div className="text-sm text-muted-foreground p-2">
                    No numeric data points detected yet.
                  </div>
                )}
              </div>
            </div>
            
            {/* Chart type & color selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select value={chartType} onValueChange={handleChartTypeChange}>
                  <SelectTrigger id="chart-type" className="w-full">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="radar">Radar Chart</SelectItem>
                    <SelectItem value="polarArea">Polar Area</SelectItem>
                    <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="chart-color">Chart Color</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 rounded-md transition-all ${chartColor === color ? 'ring-2 ring-offset-2 ring-ring' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                      aria-label={`Set chart color to ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-2">
              <h3 className="font-medium">Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <span className="mr-2">Chart Settings</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowExport(!showExport)}
                >
                  <span className="mr-2">Export Options</span>
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleClearAllCharts}
                  disabled={charts.length === 0}
                >
                  <span className="mr-2">Clear All Charts</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Show settings panel if open */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ChartSettingsPanel onClose={() => setShowSettings(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Show export panel if open */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ChartExportPanel 
              charts={charts} 
              onClose={() => setShowExport(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Charts grid */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
        {charts.map((chartData) => (
          <div key={chartData.id}>
            <SimplifiedChart 
              id={chartData.id}
              title={chartData.key}
              data={chartData.data}
              type={chartData.type}
              color={chartData.color}
              min={chartData.min}
              max={chartData.max}
              avg={chartData.avg}
              last={chartData.last}
            />
            
            {/* Insights section */}
            {chartData.insights && chartData.insights.length > 0 && (
              <div className="px-4 py-2 bg-accent/20 text-xs border mt-1 rounded-md">
                <div className="font-medium mb-1">Insights:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {chartData.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        
        {/* No charts selected state */}
        {dataKeys.length > 0 && charts.length === 0 && (
          <div className="col-span-1 lg:col-span-2 bg-card p-8 rounded-lg border text-center">
            <div className="max-w-md mx-auto space-y-3">
              <h3 className="text-lg font-medium">No Charts Selected</h3>
              <p className="text-muted-foreground">
                Select data points from the list above to create charts and visualize your MQTT data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;