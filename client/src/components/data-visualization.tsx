import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { useCharts } from '@/hooks/use-charts';
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
  const { settings: chartSettings, updateSettings } = useCharts();
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [chartType, setChartType] = useState<string>(chartSettings.defaultType);
  const [chartColor, setChartColor] = useState<string>(chartSettings.defaultColor);
  
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

  // Initialize or update charts when charts array changes
  useEffect(() => {
    charts.forEach(chartData => {
      const canvas = chartRefs.current.get(chartData.id);
      if (!canvas) return;
      
      // Destroy existing chart instance if it exists
      if (chartData.chart) {
        chartData.chart.destroy();
      }
      
      // Create new chart
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
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
          animation: {
            duration: chartSettings.animation ? 300 : 0
          }
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
    
    // Cleanup on unmount
    return () => {
      charts.forEach(chart => {
        if (chart.chart) {
          chart.chart.destroy();
        }
      });
    };
  }, [charts.length]);

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
      
      setCharts(prevCharts => {
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
            // Clear existing datasets
            while (chartData.chart.data.datasets.length > 1) {
              chartData.chart.data.datasets.pop();
            }
            
            // Update main data
            chartData.chart.data.datasets[0].data = truncatedData;
            
            // Add forecast dataset if available
            if (forecast.length > 0 && (chartData.type === 'line' || chartData.type === 'bar')) {
              // Add a dotted line showing the forecast
              chartData.chart.data.datasets.push({
                label: `${chartData.key} (Forecast)`,
                data: forecast,
                borderColor: '#ffffff80',
                borderDash: [5, 5],
                backgroundColor: 'transparent',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 2,
                pointBackgroundColor: chartData.color,
                fill: false
              });
            }
            
            chartData.chart.update();
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
    if (chartData.data.length < 5) return [];
    
    const insights: string[] = [];
    const trend = detectTrend(chartData.data);
    const volatility = calculateVolatility(chartData.data);
    
    // Time-weighted trend analysis (focus more on recent data)
    const recentData = chartData.data.slice(-5);
    const recentTrend = detectTrend(recentData);
    
    // Add trend insights with time context
    if (recentTrend && recentTrend !== trend) {
      insights.push(`Recent shift to ${recentTrend} trend detected.`);
    } else if (trend === 'rising') {
      insights.push(`Upward trend detected in ${chartData.key} values.`);
    } else if (trend === 'falling') {
      insights.push(`Downward trend detected in ${chartData.key} values.`);
    } else if (trend === 'stable') {
      insights.push(`${chartData.key} values appear stable.`);
    }
    
    // Volatility insights
    if (volatility === 'high') {
      insights.push(`High variability observed in the data.`);
    } else if (volatility === 'low' && chartData.data.length > 10) {
      insights.push(`The values show consistent, predictable patterns.`);
    }
    
    // Advanced anomaly detection
    const yValues = chartData.data.map(d => d.y);
    const mean = yValues.reduce((sum, val) => sum + val, 0) / yValues.length;
    const stdDev = Math.sqrt(yValues.map(val => Math.pow(val - mean, 2)).reduce((sum, val) => sum + val, 0) / yValues.length);
    
    // Adaptive threshold based on data characteristics
    const anomalyThreshold = calculateAnomalyThreshold(chartData.data);
    
    const lastValue = yValues[yValues.length - 1];
    if (Math.abs(lastValue - mean) > anomalyThreshold * stdDev) {
      insights.push(`Recent value may be an anomaly (outside ${anomalyThreshold.toFixed(1)}σ range).`);
    }
    
    // Generate forecasting insight if trend is not stable
    if (trend && trend !== 'stable' && chartData.data.length > 10) {
      const forecast = generateForecast(chartData.data);
      if (forecast.length > 0) {
        const lastValue = chartData.data[chartData.data.length - 1].y;
        const forecastEndValue = forecast[forecast.length - 1].y;
        const changePercent = ((forecastEndValue - lastValue) / lastValue) * 100;
        
        insights.push(`Forecast: ${trend === 'rising' ? 'Increase' : 'Decrease'} of approximately ${Math.abs(changePercent).toFixed(1)}% expected.`);
      }
    }
    
    return insights;
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Render no data message if needed
  if (dataKeys.length === 0) {
    return (
      <motion.div 
        className="glass-card neon-border rounded-lg shadow-xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4">Data Visualization</h2>
        <motion.div 
          className="p-8 text-center text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <motion.div 
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7, type: "spring" }}
          >
            <i className="fas fa-chart-line text-4xl text-purple-400"></i>
          </motion.div>
          <motion.h3 
            className="text-xl font-medium mb-3 text-blue-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            No Data Available
          </motion.h3>
          <motion.p 
            className="text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Connect to an MQTT broker and receive JSON messages with numeric values to visualize data.
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="glass-card neon-border rounded-lg shadow-xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 
          className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-3 md:mb-0"
          variants={itemVariants}
        >
          Data Visualization
        </motion.h2>
        
        <motion.div className="flex flex-wrap gap-3" variants={itemVariants}>
          <div className="flex items-center space-x-2 bg-gray-800/60 px-3 py-2 rounded-md shadow-inner">
            <Label className="text-sm text-gray-300">Chart Type:</Label>
            <Select value={chartType} onValueChange={handleChartTypeChange}>
              <SelectTrigger className="bg-gray-800/80 border-gray-700 focus:border-purple-500 w-32 shadow-inner">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="line" className="hover:bg-gray-700">Line</SelectItem>
                <SelectItem value="bar" className="hover:bg-gray-700">Bar</SelectItem>
                <SelectItem value="radar" className="hover:bg-gray-700">Radar</SelectItem>
                <SelectItem value="pie" className="hover:bg-gray-700">Pie</SelectItem>
                <SelectItem value="doughnut" className="hover:bg-gray-700">Doughnut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-800/60 px-3 py-2 rounded-md shadow-inner">
            <Label className="text-sm text-gray-300">Chart Color:</Label>
            <div className="relative">
              <Input 
                type="color" 
                value={chartColor} 
                onChange={(e) => handleColorChange(e.target.value)}
                className="bg-transparent h-8 w-10 rounded cursor-pointer p-0 border-none"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-current rounded-full" style={{ color: chartColor }}></div>
            </div>
          </div>
          
          <ChartSettingsPanel />
          
          <ChartExportPanel chartRefs={chartRefs} />
          
          <Button
            variant="destructive"
            size="sm"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30"
            onClick={handleClearAllCharts}
            disabled={charts.length === 0}
          >
            <i className="fas fa-trash-alt mr-1"></i> Clear All Charts
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Data Key Selection */}
      <motion.div 
        className="glass-card bg-gray-900/70 rounded-lg p-4 mb-5"
        variants={itemVariants}
      >
        <h3 className="font-medium text-lg mb-3 text-blue-300">Select Data to Chart</h3>
        <div className="flex flex-wrap gap-3">
          <AnimatePresence>
            {dataKeys.map((key) => (
              <motion.div 
                key={key.path}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                  key.selected 
                    ? 'bg-purple-900/30 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.4)]' 
                    : 'bg-gray-800/60 border-gray-700/50'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Checkbox 
                  id={`key-${key.path}`}
                  checked={key.selected}
                  onCheckedChange={(checked) => handleKeyToggle(key.path, checked === true)}
                  className={key.selected ? "text-purple-400" : ""}
                />
                <Label htmlFor={`key-${key.path}`} className="cursor-pointer">{key.path}</Label>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Charts Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {charts.map((chartData) => (
            <motion.div 
              key={chartData.id} 
              className="glass-card bg-gray-900/70 rounded-lg p-5 transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              layout
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">{chartData.key}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 w-8 p-0 rounded-full"
                  onClick={() => handleKeyToggle(chartData.key, false)}
                >
                  <i className="fas fa-times"></i>
                </Button>
              </div>
              
              {/* Chart Canvas */}
              <div className="bg-gray-800/60 rounded-lg h-60 mb-3 p-3 shadow-inner border border-gray-700/50">
                <canvas 
                  ref={(el) => {
                    chartRefs.current.set(chartData.id, el);
                  }}
                />
              </div>
              
              {/* Statistics */}
              <div className="grid grid-cols-4 gap-3 text-center text-sm mb-3">
                <div className="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30">
                  <div className="text-gray-400 mb-1">Min</div>
                  <div className="font-mono text-blue-300">{formatNumber(chartData.min)}</div>
                </div>
                <div className="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30">
                  <div className="text-gray-400 mb-1">Max</div>
                  <div className="font-mono text-purple-300">{formatNumber(chartData.max)}</div>
                </div>
                <div className="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30">
                  <div className="text-gray-400 mb-1">Avg</div>
                  <div className="font-mono text-teal-300">{formatNumber(chartData.avg)}</div>
                </div>
                <div className="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30">
                  <div className="text-gray-400 mb-1">Last</div>
                  <div className="font-mono text-amber-300">{formatNumber(chartData.last)}</div>
                </div>
              </div>
              
              {/* Data Insights */}
              {chartData.insights && chartData.insights.length > 0 && (
                <motion.div 
                  className="bg-gray-800/50 rounded-lg p-3 border border-indigo-500/20 mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-indigo-400 text-lg">
                      <i className="fas fa-lightbulb"></i>
                    </div>
                    <h5 className="text-indigo-300 font-medium">Data Insights</h5>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {chartData.trend && (
                      <div className="flex items-center gap-2">
                        <div className={`text-sm ${
                          chartData.trend === 'rising' ? 'text-green-400' : 
                          chartData.trend === 'falling' ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          <i className={`fas ${
                            chartData.trend === 'rising' ? 'fa-arrow-up' : 
                            chartData.trend === 'falling' ? 'fa-arrow-down' : 'fa-equals'
                          }`}></i>
                        </div>
                        <div className="text-gray-300">
                          Trend: <span className={
                            chartData.trend === 'rising' ? 'text-green-400' : 
                            chartData.trend === 'falling' ? 'text-red-400' : 'text-blue-400'
                          }>{chartData.trend}</span>
                        </div>
                      </div>
                    )}
                    
                    {chartData.volatility && (
                      <div className="flex items-center gap-2">
                        <div className={`text-sm ${
                          chartData.volatility === 'high' ? 'text-orange-400' : 
                          chartData.volatility === 'medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          <i className={`fas ${
                            chartData.volatility === 'high' ? 'fa-bolt' : 
                            chartData.volatility === 'medium' ? 'fa-chart-line' : 'fa-grip-lines'
                          }`}></i>
                        </div>
                        <div className="text-gray-300">
                          Volatility: <span className={
                            chartData.volatility === 'high' ? 'text-orange-400' : 
                            chartData.volatility === 'medium' ? 'text-yellow-400' : 'text-green-400'
                          }>{chartData.volatility}</span>
                        </div>
                      </div>
                    )}
                    
                    {chartData.anomalyThreshold && (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-purple-400">
                          <i className="fas fa-filter"></i>
                        </div>
                        <div className="text-gray-300">
                          Anomaly Threshold: <span className="text-purple-400">{chartData.anomalyThreshold.toFixed(1)}σ</span>
                        </div>
                      </div>
                    )}
                    
                    {chartData.forecast && chartData.forecast.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-blue-400">
                          <i className="fas fa-magic"></i>
                        </div>
                        <div className="text-gray-300">
                          Forecast: <span className="text-blue-400">Next {chartData.forecast.length} points</span>
                        </div>
                      </div>
                    )}
                    
                    <ul className="list-disc list-inside text-gray-300 text-xs space-y-1 mt-1">
                      {chartData.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {charts.length === 0 && (
          <motion.div 
            className="md:col-span-2 p-8 text-center text-gray-300 glass-card bg-gray-900/50 rounded-lg border border-gray-700/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <i className="fas fa-chart-bar text-2xl text-indigo-400"></i>
            </motion.div>
            <h3 className="text-lg font-medium mb-2 text-blue-300">No Charts Selected</h3>
            <p className="text-gray-400">Select data points from the checkboxes above to create charts.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DataVisualization;
