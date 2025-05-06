import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMqtt, MqttMessage } from '@/hooks/use-mqtt';
import { useCharts } from '@/hooks/use-charts';
import Chart from 'chart.js/auto';

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
}

const DataVisualization: React.FC = () => {
  const { messages } = useMqtt();
  const [dataKeys, setDataKeys] = useState<DataKey[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [chartType, setChartType] = useState<string>('line');
  const [chartColor, setChartColor] = useState<string>('#8B5CF6');
  const maxDataPoints = 40;
  
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
            backgroundColor: `${chartData.color}20`,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: chartData.type === 'line' || chartData.type === 'bar' ? {
            x: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: maxDataPoints - 1,
              ticks: {
                display: false
              },
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true
            }
          } : undefined,
          animation: {
            duration: 300
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
          
          // Keep only the last maxDataPoints
          const truncatedData = newData.slice(-maxDataPoints);
          
          // Recalculate statistics
          const values = truncatedData.map(d => d.y);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const last = values[values.length - 1];
          
          // Update chart instance if it exists
          if (chartData.chart) {
            chartData.chart.data.datasets[0].data = truncatedData;
            chartData.chart.update();
          }
          
          return {
            ...chartData,
            data: truncatedData,
            min,
            max,
            avg,
            last
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

  // Render no data message if needed
  if (dataKeys.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
        <h2 className="font-heading text-xl text-blue-400 mb-4">Data Visualization</h2>
        <div className="p-8 text-center text-gray-400">
          <i className="fas fa-chart-line text-4xl mb-4 text-gray-600"></i>
          <h3 className="text-xl font-medium mb-2">No Data Available</h3>
          <p>Connect to an MQTT broker and receive JSON messages with numeric values to visualize data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <h2 className="font-heading text-xl text-blue-400 mb-2 md:mb-0">Data Visualization</h2>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-gray-400">Chart Type:</Label>
            <Select value={chartType} onValueChange={handleChartTypeChange}>
              <SelectTrigger className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 w-32">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="radar">Radar</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
                <SelectItem value="doughnut">Doughnut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label className="text-sm text-gray-400">Chart Color:</Label>
            <Input 
              type="color" 
              value={chartColor} 
              onChange={(e) => handleColorChange(e.target.value)}
              className="bg-transparent h-8 w-10 rounded cursor-pointer p-0 border-none"
            />
          </div>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAllCharts}
            disabled={charts.length === 0}
          >
            <i className="fas fa-trash-alt mr-1"></i> Clear All Charts
          </Button>
        </div>
      </div>
      
      {/* Data Key Selection */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-lg mb-2">Select Data to Chart:</h3>
        <div className="flex flex-wrap gap-3">
          {dataKeys.map((key) => (
            <div key={key.path} className="flex items-center space-x-2 bg-gray-800 px-3 py-1.5 rounded-full">
              <Checkbox 
                id={`key-${key.path}`}
                checked={key.selected}
                onCheckedChange={(checked) => handleKeyToggle(key.path, checked === true)}
              />
              <Label htmlFor={`key-${key.path}`} className="cursor-pointer">{key.path}</Label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((chartData) => (
          <div key={chartData.id} className="bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{chartData.key}</h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                onClick={() => handleKeyToggle(chartData.key, false)}
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            {/* Chart Canvas */}
            <div className="bg-gray-800 rounded h-60 mb-2 p-2">
              <canvas 
                ref={(el) => {
                  chartRefs.current.set(chartData.id, el);
                }}
              />
            </div>
            
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="bg-gray-800 rounded p-1">
                <div className="text-gray-400">Min</div>
                <div className="font-mono">{formatNumber(chartData.min)}</div>
              </div>
              <div className="bg-gray-800 rounded p-1">
                <div className="text-gray-400">Max</div>
                <div className="font-mono">{formatNumber(chartData.max)}</div>
              </div>
              <div className="bg-gray-800 rounded p-1">
                <div className="text-gray-400">Avg</div>
                <div className="font-mono">{formatNumber(chartData.avg)}</div>
              </div>
              <div className="bg-gray-800 rounded p-1">
                <div className="text-gray-400">Last</div>
                <div className="font-mono">{formatNumber(chartData.last)}</div>
              </div>
            </div>
          </div>
        ))}
        
        {charts.length === 0 && (
          <div className="md:col-span-2 p-8 text-center text-gray-400 bg-gray-900 rounded-lg">
            <i className="fas fa-chart-bar text-3xl mb-2 text-gray-600"></i>
            <h3 className="text-lg font-medium mb-2">No Charts Selected</h3>
            <p>Select data points from the checkboxes above to create charts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;
