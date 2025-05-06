import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadSetting, saveSetting } from '@/lib/storage';
import Chart from 'chart.js/auto';

interface ChartSettings {
  defaultType: string;
  defaultColor: string;
  maxDataPoints: number;
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
}

interface ChartsContextType {
  settings: ChartSettings;
  updateSettings: (settings: Partial<ChartSettings>) => void;
  addDataPoint: (key: string, value: number) => void;
  selectedKeys: string[];
  toggleKey: (key: string) => void;
  chartsData: ChartData[];
  clearChart: (key: string) => void;
  clearAllCharts: () => void;
}

const initialSettings: ChartSettings = {
  defaultType: 'line',
  defaultColor: '#8B5CF6',
  maxDataPoints: 40
};

const ChartsContext = createContext<ChartsContextType | undefined>(undefined);

export const ChartsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ChartSettings>(initialSettings);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [chartsData, setChartsData] = useState<ChartData[]>([]);
  
  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = loadSetting<ChartSettings>('chartSettings', initialSettings);
    setSettings(savedSettings);
    
    const savedSelectedKeys = loadSetting<string[]>('chartSelectedKeys', []);
    setSelectedKeys(savedSelectedKeys);
  }, []);
  
  // Save settings when they change
  useEffect(() => {
    saveSetting('chartSettings', settings);
  }, [settings]);
  
  // Save selected keys when they change
  useEffect(() => {
    saveSetting('chartSelectedKeys', selectedKeys);
  }, [selectedKeys]);
  
  const updateSettings = (newSettings: Partial<ChartSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const toggleKey = (key: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        // Remove key
        return prev.filter(k => k !== key);
      } else {
        // Add key
        return [...prev, key];
      }
    });
    
    // If removing, clear chart data
    if (selectedKeys.includes(key)) {
      clearChart(key);
    } else {
      // If adding, create new chart data
      setChartsData(prev => {
        if (!prev.some(chart => chart.key === key)) {
          return [...prev, {
            id: `chart-${key}-${Date.now()}`,
            key,
            type: settings.defaultType,
            color: settings.defaultColor,
            data: [],
            min: null,
            max: null,
            avg: null,
            last: null
          }];
        }
        return prev;
      });
    }
  };
  
  const addDataPoint = (key: string, value: number) => {
    if (!selectedKeys.includes(key)) return;
    
    setChartsData(prev => {
      const existingChartIndex = prev.findIndex(chart => chart.key === key);
      
      if (existingChartIndex >= 0) {
        // Update existing chart
        const chart = { ...prev[existingChartIndex] };
        
        // Add new data point
        const newData = [...chart.data, { x: chart.data.length, y: value }];
        
        // Keep only the last maxDataPoints
        const truncatedData = newData.slice(-settings.maxDataPoints);
        
        // Recalculate statistics
        const values = truncatedData.map(d => d.y);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const last = values[values.length - 1];
        
        // Create updated chart
        const updatedChart = {
          ...chart,
          data: truncatedData,
          min,
          max,
          avg,
          last
        };
        
        // Return updated charts array
        const newCharts = [...prev];
        newCharts[existingChartIndex] = updatedChart;
        return newCharts;
      } else {
        // Create new chart
        return [...prev, {
          id: `chart-${key}-${Date.now()}`,
          key,
          type: settings.defaultType,
          color: settings.defaultColor,
          data: [{ x: 0, y: value }],
          min: value,
          max: value,
          avg: value,
          last: value
        }];
      }
    });
  };
  
  const clearChart = (key: string) => {
    setChartsData(prev => prev.filter(chart => chart.key !== key));
    setSelectedKeys(prev => prev.filter(k => k !== key));
  };
  
  const clearAllCharts = () => {
    setChartsData([]);
    setSelectedKeys([]);
  };
  
  const value: ChartsContextType = {
    settings,
    updateSettings,
    addDataPoint,
    selectedKeys,
    toggleKey,
    chartsData,
    clearChart,
    clearAllCharts
  };
  
  return (
    <ChartsContext.Provider value={value}>
      {children}
    </ChartsContext.Provider>
  );
};

export const useCharts = () => {
  const context = useContext(ChartsContext);
  if (context === undefined) {
    throw new Error('useCharts must be used within a ChartsProvider');
  }
  return context;
};
