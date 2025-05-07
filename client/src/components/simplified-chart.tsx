import React, { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartProps {
  id: string;
  title: string;
  data: { x: number; y: number }[];
  type: string;
  color: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
  options?: any;
}

const ChartComponent: React.FC<ChartProps> = ({
  id,
  title,
  data,
  type = 'line',
  color = '#8B5CF6',
  min,
  max,
  avg,
  last,
  options = {}
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [chart, setChart] = useState<Chart | null>(null);

  // Format number for display
  const formatNumber = (num: number | null, decimals = 2): string => {
    if (num === null) return 'N/A';
    return num.toFixed(decimals);
  };
  
  // Ensure values are not undefined
  const safeMin = min === undefined ? null : min;
  const safeMax = max === undefined ? null : max;
  const safeAvg = avg === undefined ? null : avg;
  const safeLast = last === undefined ? null : last;

  useEffect(() => {
    // Cleanup function to destroy chart on unmount
    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, []);

  // Create or update chart when data changes
  useEffect(() => {
    // Skip if no canvas element
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // If chart exists, destroy it before creating a new one
    if (chart) {
      chart.destroy();
    }

    // Set default options
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            display: false
          },
          grid: {
            display: false
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          }
        }
      },
      animation: false
    };

    // Create new chart
    try {
      const newChart = new Chart(ctx, {
        type: type as any,
        data: {
          labels: data.map((_, i) => i.toString()),
          datasets: [{
            label: title,
            data: data.map(d => d.y),
            borderColor: color,
            backgroundColor: `${color}30`, // 30 is hex for 18% opacity
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            tension: 0.4,
            fill: true
          }]
        },
        options: { ...defaultOptions, ...options }
      });
      setChart(newChart);
    } catch (err) {
      console.error('Error creating chart:', err);
    }
  }, [data, type, color, title]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <span 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: color }}
            ></span>
            {title}
          </div>
          <span className="text-sm font-normal">
            {safeLast !== null ? formatNumber(safeLast) : 'N/A'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        <div className="h-[240px] px-4 pt-2">
          <canvas ref={chartRef} height="240"></canvas>
        </div>
        
        {/* Stats */}
        <div className="px-4 py-2 flex flex-wrap text-xs text-muted-foreground gap-x-4 gap-y-1 border-t mt-2">
          <div>Min: {formatNumber(safeMin)}</div>
          <div>Max: {formatNumber(safeMax)}</div>
          <div>Avg: {formatNumber(safeAvg)}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartComponent;