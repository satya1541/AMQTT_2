import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCharts } from '@/hooks/use-charts';
import { motion } from 'framer-motion';
import Chart from 'chart.js/auto';

interface ExportOptions {
  format: 'png' | 'jpeg' | 'csv' | 'json';
  quality: number;
  width: number;
  height: number;
  withBackground: boolean;
  includeStats: boolean;
  selectedCharts: string[];
}

const ChartExportPanel: React.FC<{
  chartRefs: React.MutableRefObject<Map<string, HTMLCanvasElement | null>>;
}> = ({ chartRefs }) => {
  const { chartsData } = useCharts();
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    quality: 1,
    width: 1200,
    height: 800,
    withBackground: true,
    includeStats: true,
    selectedCharts: []
  });
  
  const handleExport = () => {
    // For image exports
    if (exportOptions.format === 'png' || exportOptions.format === 'jpeg') {
      exportAsImage();
    } 
    // For data exports
    else if (exportOptions.format === 'csv' || exportOptions.format === 'json') {
      exportAsData();
    }
  };
  
  const exportAsImage = () => {
    const chartsToExport = chartsData.filter(chart => 
      exportOptions.selectedCharts.length === 0 || 
      exportOptions.selectedCharts.includes(chart.id)
    );
    
    if (chartsToExport.length === 0) {
      alert('No charts selected for export');
      return;
    }
    
    // If only one chart is selected, export it directly
    if (chartsToExport.length === 1) {
      const chartId = chartsToExport[0].id;
      const canvas = chartRefs.current.get(chartId);
      
      if (canvas) {
        // Get the chart instance
        const chartInstance = Chart.getChart(canvas);
        
        if (chartInstance) {
          // Create an off-screen canvas for high-resolution export
          const offScreenCanvas = document.createElement('canvas');
          offScreenCanvas.width = exportOptions.width;
          offScreenCanvas.height = exportOptions.height;
          const ctx = offScreenCanvas.getContext('2d');
          
          if (ctx) {
            // Fill background if requested
            if (exportOptions.withBackground) {
              ctx.fillStyle = '#1f2937'; // Dark background
              ctx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
            }
            
            // Draw chart on the off-screen canvas
            const sourceCanvas = chartInstance.canvas;
            const aspectRatio = sourceCanvas.width / sourceCanvas.height;
            const targetHeight = exportOptions.width / aspectRatio;
            
            ctx.drawImage(
              sourceCanvas, 
              0, 0, sourceCanvas.width, sourceCanvas.height, 
              0, 0, exportOptions.width, targetHeight
            );
            
            // Add statistics if requested
            if (exportOptions.includeStats) {
              const chart = chartsToExport[0];
              
              ctx.font = '24px Arial';
              ctx.fillStyle = '#e2e8f0';
              ctx.textAlign = 'left';
              
              const statsY = targetHeight + 40;
              ctx.fillText(`Chart: ${chart.key}`, 20, statsY);
              ctx.fillText(`Min: ${chart.min?.toFixed(2) || 'N/A'}`, 20, statsY + 40);
              ctx.fillText(`Max: ${chart.max?.toFixed(2) || 'N/A'}`, 200, statsY + 40);
              ctx.fillText(`Avg: ${chart.avg?.toFixed(2) || 'N/A'}`, 380, statsY + 40);
              ctx.fillText(`Last: ${chart.last?.toFixed(2) || 'N/A'}`, 560, statsY + 40);
            }
            
            // Convert to image and trigger download
            const dataURL = offScreenCanvas.toDataURL(
              `image/${exportOptions.format}`, 
              exportOptions.quality
            );
            
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `chart-${chartsToExport[0].key}-${timestamp}.${exportOptions.format}`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    } 
    // If multiple charts are selected, combine them
    else if (chartsToExport.length > 1) {
      // Create an off-screen canvas
      const offScreenCanvas = document.createElement('canvas');
      const chartHeight = Math.floor(exportOptions.height / chartsToExport.length);
      offScreenCanvas.width = exportOptions.width;
      offScreenCanvas.height = exportOptions.height;
      const ctx = offScreenCanvas.getContext('2d');
      
      if (ctx) {
        // Fill background if requested
        if (exportOptions.withBackground) {
          ctx.fillStyle = '#1f2937'; // Dark background
          ctx.fillRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
        }
        
        // Draw each chart
        chartsToExport.forEach((chart, index) => {
          const canvas = chartRefs.current.get(chart.id);
          if (canvas) {
            const chartInstance = Chart.getChart(canvas);
            if (chartInstance) {
              const sourceCanvas = chartInstance.canvas;
              
              // Draw chart
              ctx.drawImage(
                sourceCanvas, 
                0, 0, sourceCanvas.width, sourceCanvas.height, 
                0, index * chartHeight, exportOptions.width, chartHeight - 20
              );
              
              // Add title and stats
              if (exportOptions.includeStats) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#e2e8f0';
                ctx.textAlign = 'left';
                
                const statsY = (index + 1) * chartHeight - 25;
                ctx.fillText(`${chart.key} | Min: ${chart.min?.toFixed(2) || 'N/A'} | Max: ${chart.max?.toFixed(2) || 'N/A'} | Avg: ${chart.avg?.toFixed(2) || 'N/A'} | Last: ${chart.last?.toFixed(2) || 'N/A'}`, 10, statsY);
              }
            }
          }
        });
        
        // Convert to image and trigger download
        const dataURL = offScreenCanvas.toDataURL(
          `image/${exportOptions.format}`, 
          exportOptions.quality
        );
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `charts-${chartsToExport.length}-${timestamp}.${exportOptions.format}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };
  
  const exportAsData = () => {
    const chartsToExport = chartsData.filter(chart => 
      exportOptions.selectedCharts.length === 0 || 
      exportOptions.selectedCharts.includes(chart.id)
    );
    
    if (chartsToExport.length === 0) {
      alert('No charts selected for export');
      return;
    }
    
    if (exportOptions.format === 'json') {
      // Export as JSON
      const jsonData = chartsToExport.map(chart => ({
        key: chart.key,
        type: chart.type,
        color: chart.color,
        data: chart.data,
        statistics: exportOptions.includeStats ? {
          min: chart.min,
          max: chart.max,
          avg: chart.avg,
          last: chart.last
        } : undefined
      }));
      
      const jsonString = JSON.stringify(jsonData, null, 2);
      downloadFile(jsonString, 'charts-data.json', 'application/json');
    } 
    else if (exportOptions.format === 'csv') {
      // Export as CSV
      let csv = 'chart,x,y\n';
      
      chartsToExport.forEach(chart => {
        chart.data.forEach(point => {
          csv += `${chart.key},${point.x},${point.y}\n`;
        });
      });
      
      // Add statistics if requested
      if (exportOptions.includeStats) {
        csv += '\n\nStatistics:\n';
        csv += 'chart,min,max,avg,last\n';
        
        chartsToExport.forEach(chart => {
          csv += `${chart.key},${chart.min || ''},${chart.max || ''},${chart.avg || ''},${chart.last || ''}\n`;
        });
      }
      
      downloadFile(csv, 'charts-data.csv', 'text/csv');
    }
  };
  
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gray-800/70 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600 text-gray-200"
        >
          <i className="fas fa-download mr-2"></i>
          Export Charts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] glass-card border-gray-700 bg-gray-900/95 shadow-xl text-gray-200">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Export Visualization Data</DialogTitle>
        </DialogHeader>
        
        <motion.div 
          className="mt-5 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-3">
            <Label className="block mb-2">Export Format</Label>
            <RadioGroup
              value={exportOptions.format}
              onValueChange={(value) => setExportOptions(prev => ({ 
                ...prev, 
                format: value as ExportOptions['format']
              }))}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="format-png" />
                <Label htmlFor="format-png">PNG</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jpeg" id="format-jpeg" />
                <Label htmlFor="format-jpeg">JPEG</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv">CSV</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json">JSON</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Show image options only for image formats */}
          {(exportOptions.format === 'png' || exportOptions.format === 'jpeg') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width (px)</Label>
                  <Select 
                    value={exportOptions.width.toString()} 
                    onValueChange={(value) => setExportOptions(prev => ({ 
                      ...prev, 
                      width: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger id="width" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="800">800</SelectItem>
                      <SelectItem value="1200">1200</SelectItem>
                      <SelectItem value="1600">1600</SelectItem>
                      <SelectItem value="1920">1920</SelectItem>
                      <SelectItem value="2400">2400</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="height">Height (px)</Label>
                  <Select 
                    value={exportOptions.height.toString()} 
                    onValueChange={(value) => setExportOptions(prev => ({ 
                      ...prev, 
                      height: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger id="height" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="600">600</SelectItem>
                      <SelectItem value="800">800</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                      <SelectItem value="1200">1200</SelectItem>
                      <SelectItem value="1600">1600</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="withBackground"
                  checked={exportOptions.withBackground}
                  onCheckedChange={(checked) => setExportOptions(prev => ({ 
                    ...prev, 
                    withBackground: checked === true
                  }))}
                />
                <Label htmlFor="withBackground">Include background color</Label>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeStats"
              checked={exportOptions.includeStats}
              onCheckedChange={(checked) => setExportOptions(prev => ({ 
                ...prev, 
                includeStats: checked === true
              }))}
            />
            <Label htmlFor="includeStats">Include statistics (min, max, avg, last)</Label>
          </div>
          
          {chartsData.length > 0 && (
            <div className="space-y-3">
              <Label className="block mb-2">Charts to Export</Label>
              <div className="max-h-[150px] overflow-y-auto p-2 space-y-2 rounded-md bg-gray-800/50">
                {chartsData.length > 1 && (
                  <div className="flex items-center space-x-2 p-2 border-b border-gray-700">
                    <Checkbox 
                      id="select-all"
                      checked={exportOptions.selectedCharts.length === chartsData.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setExportOptions(prev => ({ 
                            ...prev, 
                            selectedCharts: chartsData.map(chart => chart.id)
                          }));
                        } else {
                          setExportOptions(prev => ({ 
                            ...prev, 
                            selectedCharts: []
                          }));
                        }
                      }}
                    />
                    <Label htmlFor="select-all">Select All</Label>
                  </div>
                )}
                
                {chartsData.map(chart => (
                  <div key={chart.id} className="flex items-center space-x-2 p-2 hover:bg-gray-700/30 rounded-md">
                    <Checkbox 
                      id={`chart-${chart.id}`}
                      checked={exportOptions.selectedCharts.includes(chart.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setExportOptions(prev => ({ 
                            ...prev, 
                            selectedCharts: [...prev.selectedCharts, chart.id]
                          }));
                        } else {
                          setExportOptions(prev => ({ 
                            ...prev, 
                            selectedCharts: prev.selectedCharts.filter(id => id !== chart.id)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={`chart-${chart.id}`} className="flex-1 cursor-pointer">
                      {chart.key}
                    </Label>
                  </div>
                ))}
                
                {chartsData.length === 0 && (
                  <div className="text-center text-gray-400 p-4">
                    No charts available to export
                  </div>
                )}
              </div>
              <div className="text-gray-400 text-sm">
                {exportOptions.selectedCharts.length === 0 
                  ? 'If no charts are selected, all charts will be exported.' 
                  : `${exportOptions.selectedCharts.length} charts selected for export.`}
              </div>
            </div>
          )}
        </motion.div>
        
        <div className="mt-5 flex justify-end space-x-3">
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="bg-gray-800/70 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600 text-gray-200"
            >
              Cancel
            </Button>
          </DialogClose>
          
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-md"
            disabled={chartsData.length === 0}
          >
            <i className="fas fa-download mr-2"></i>
            Export {exportOptions.selectedCharts.length > 0 ? `(${exportOptions.selectedCharts.length})` : 'All'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartExportPanel;