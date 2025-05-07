import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { useCharts } from '@/hooks/use-charts';
import { useMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from 'chart.js/auto';
import ChartSettingsPanel from './chart-settings-panel';
import ChartExportPanel from './chart-export-panel';

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
  chart: Chart | null;
  trend?: 'rising' | 'falling' | 'stable' | null;
  volatility?: 'high' | 'medium' | 'low' | null;
  insights?: string[];
  forecast?: { x: number; y: number }[];
  anomalyThreshold?: number;
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
  
  const chartRefs = useRef<Map<string, HTMLCanvasElement | null>>(new Map());

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
            last: null,
            chart: null
          });
        }
      });
      
      return updatedCharts;
    });
  }, [dataKeys, chartType, chartColor]);

  // Handle rendering charts
  useEffect(() => {
    // Create charts only when we have data to show
    charts.forEach(chartData => {
      const canvasElement = chartRefs.current.get(chartData.id);
      if (!canvasElement) return;

      // Clear existing chart
      if (chartData.chart) {
        chartData.chart.destroy();
      }

      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;

      // Create new chart
      const newChart = new Chart(ctx, {
        type: chartData.type as any,
        data: {
          datasets: [{
            label: chartData.key,
            data: chartData.data,
            borderColor: chartData.color,
            backgroundColor: `${chartData.color}${Math.round(chartSettings.fillOpacity * 255).toString(16).padStart(2, '0')}`,
            tension: chartSettings.tension,
            borderWidth: chartSettings.borderWidth,
            pointRadius: chartSettings.pointRadius,
            pointHoverRadius: chartSettings.pointHoverRadius,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: chartSettings.showLegend
            }
          },
          scales: chartData.type === 'line' || chartData.type === 'bar' ? {
            x: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: chartSettings.maxDataPoints - 1,
              ticks: {
                display: false
              },
              grid: {
                display: chartSettings.showGrid
              }
            },
            y: {
              beginAtZero: true,
              min: chartSettings.autoScale ? undefined : chartSettings.yAxisMin,
              max: chartSettings.autoScale ? undefined : chartSettings.yAxisMax,
              grid: {
                display: chartSettings.showGrid
              }
            }
          } : undefined,
          animation: chartSettings.animation ? {} : false
        }
      });

      // Update chart reference in state
      setCharts(prevCharts => 
        prevCharts.map(c => 
          c.id === chartData.id 
            ? { ...c, chart: newChart } 
            : c
        )
      );
    });

    // Cleanup on unmount or when charts change
    return () => {
      charts.forEach(chart => {
        if (chart.chart) {
          chart.chart.destroy();
        }
      });
    };
  }, [charts, chartSettings]);

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
          
          // Detect patterns and generate insights
          const trend = detectTrend(truncatedData);
          const volatility = calculateVolatility(truncatedData);
          const anomalyThreshold = calculateAnomalyThreshold(truncatedData);
          const forecast = trend && trend !== 'stable' && truncatedData.length > 10 
            ? generateForecast(truncatedData) 
            : [];
            
          const insights = generateInsights({
            ...chartData,
            data: truncatedData,
            min,
            max,
            avg,
            last,
            trend,
            volatility,
            forecast,
            anomalyThreshold
          });
          
          // Update chart instance if it exists
          if (chartData.chart) {
            // Clear existing datasets first
            if (chartData.chart.data.datasets.length > 1) {
              chartData.chart.data.datasets.splice(1);
            }
            
            // Update main dataset data
            chartData.chart.data.datasets[0].data = truncatedData;
            
            // Add forecast dataset if available
            if (forecast.length > 0 && (chartData.type === 'line' || chartData.type === 'bar')) {
              chartData.chart.data.datasets.push({
                label: `${chartData.key} (Forecast)`,
                data: forecast,
                borderColor: '#ffffff80',
                borderDash: [5, 5],
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 2,
                tension: 0.3,
                fill: false
              });
            }
            
            chartData.chart.update('none');
          }
          
          return {
            ...chartData,
            data: truncatedData,
            min,
            max,
            avg,
            last,
            trend,
            volatility,
            insights,
            forecast,
            anomalyThreshold
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

  // Format number for display
  const formatNumber = (num: number | null, decimals = 2): string => {
    if (num === null) return 'N/A';
    return num.toFixed(decimals);
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
  
  // Generate predictive forecast based on recent data trend
  const generateForecast = (data: { x: number; y: number }[], steps: number = 5): { x: number; y: number }[] => {
    if (data.length < 10) return []; // Need sufficient data for forecasting
    
    // Use recent data for forecasting
    const recentData = data.slice(-15);
    
    // Simple linear regression for forecast
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
    const intercept = yMean - (slope * xMean);
    
    // Generate forecast points
    const forecast: { x: number; y: number }[] = [];
    const lastX = data[data.length - 1].x;
    
    for (let i = 1; i <= steps; i++) {
      const x = lastX + i;
      const y = (slope * x) + intercept;
      forecast.push({ x, y });
    }
    
    return forecast;
  };
  
  // Calculate anomaly detection threshold based on data volatility
  const calculateAnomalyThreshold = (data: { x: number; y: number }[]): number => {
    if (data.length < 5) return 2.0; // Default 2 standard deviations
    
    const volatility = calculateVolatility(data);
    
    // Adjust threshold based on volatility
    if (volatility === 'high') return 3.0; // More permissive for high volatility data
    if (volatility === 'low') return 1.5;  // More strict for low volatility data
    return 2.0; // Default for medium volatility
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

  // Add canvas ref to the refs map
  const setCanvasRef = (id: string, canvas: HTMLCanvasElement | null) => {
    chartRefs.current.set(id, canvas);
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
          <Card key={chartData.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center">
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: chartData.color }}
                  ></span>
                  {chartData.key}
                  {chartData.trend && (
                    <span className="ml-2">{getTrendIcon(chartData.trend)}</span>
                  )}
                </div>
                <span className="text-sm font-normal">
                  {chartData.last !== null ? formatNumber(chartData.last) : 'N/A'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              <div className="h-[240px] px-4 pt-2">
                <canvas 
                  ref={(canvas) => setCanvasRef(chartData.id, canvas)} 
                  height="240"
                ></canvas>
              </div>
              
              {/* Stats and insights */}
              <div className="px-4 py-2 flex flex-wrap text-xs text-muted-foreground gap-x-4 gap-y-1 border-t mt-2">
                <div>Min: {formatNumber(chartData.min)}</div>
                <div>Max: {formatNumber(chartData.max)}</div>
                <div>Avg: {formatNumber(chartData.avg)}</div>
                
                {chartData.volatility && (
                  <div>
                    Volatility: 
                    <span className={`ml-1 ${
                      chartData.volatility === 'high' ? 'text-red-400' :
                      chartData.volatility === 'low' ? 'text-green-400' :
                      'text-yellow-400'
                    }`}>
                      {chartData.volatility}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Insights section */}
              {chartData.insights && chartData.insights.length > 0 && (
                <div className="px-4 py-2 bg-accent/20 text-xs border-t">
                  <div className="font-medium mb-1">Insights:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {chartData.insights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
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