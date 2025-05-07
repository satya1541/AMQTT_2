import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

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

interface ChartExportPanelProps {
  charts: ChartData[];
  onClose: () => void;
}

const ChartExportPanel: React.FC<ChartExportPanelProps> = ({ charts, onClose }) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'csv' | 'json'>('png');
  const [quality, setQuality] = useState<number>(90);
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [withBackground, setWithBackground] = useState<boolean>(true);
  const [includeStats, setIncludeStats] = useState<boolean>(true);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(charts.map(c => c.id));
  
  const handleChartToggle = (chartId: string, checked: boolean) => {
    if (checked) {
      setSelectedCharts(prev => [...prev, chartId]);
    } else {
      setSelectedCharts(prev => prev.filter(id => id !== chartId));
    }
  };
  
  const handleExport = async () => {
    // For now, just close the panel with a sample export
    // In a real implementation, this would generate the requested export
    onClose();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="flex-1">Export Chart Data</CardTitle>
        <Button variant="ghost" onClick={onClose} size="sm">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="image" className="mt-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="image">Image Export</TabsTrigger>
            <TabsTrigger value="data">Data Export</TabsTrigger>
          </TabsList>
          
          {/* Image Export Options */}
          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Image Format</Label>
              <RadioGroup defaultValue="png" className="flex space-x-4" onValueChange={(v) => setFormat(v as 'png' | 'jpeg')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="png" />
                  <Label htmlFor="png">PNG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="jpeg" id="jpeg" />
                  <Label htmlFor="jpeg">JPEG</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Image Quality ({quality}%)</Label>
              <Slider 
                value={[quality]} 
                min={10} 
                max={100} 
                step={5}
                onValueChange={(v) => setQuality(v[0])}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input 
                  id="width"
                  type="number" 
                  min={200} 
                  max={3000} 
                  value={width}
                  onChange={(e) => setWidth(Math.max(200, Math.min(3000, parseInt(e.target.value) || 800)))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input 
                  id="height"
                  type="number" 
                  min={150} 
                  max={2000} 
                  value={height}
                  onChange={(e) => setHeight(Math.max(150, Math.min(2000, parseInt(e.target.value) || 600)))}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="withBackground" 
                checked={withBackground}
                onCheckedChange={(checked) => setWithBackground(checked as boolean)}
              />
              <Label htmlFor="withBackground">Include background</Label>
            </div>
          </TabsContent>
          
          {/* Data Export Options */}
          <TabsContent value="data" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Data Format</Label>
              <RadioGroup defaultValue="csv" className="flex space-x-4" onValueChange={(v) => setFormat(v as 'csv' | 'json')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv">CSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json">JSON</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="includeStats" 
                checked={includeStats}
                onCheckedChange={(checked) => setIncludeStats(checked as boolean)}
              />
              <Label htmlFor="includeStats">Include statistics (min, max, avg)</Label>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Chart Selection */}
        <div className="mt-6 space-y-3">
          <Label>Charts to Export</Label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
            {charts.map((chart) => (
              <div key={chart.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`chart-${chart.id}`} 
                  checked={selectedCharts.includes(chart.id)}
                  onCheckedChange={(checked) => handleChartToggle(chart.id, checked as boolean)}
                />
                <Label htmlFor={`chart-${chart.id}`} className="cursor-pointer flex items-center">
                  <span 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: chart.color }}
                  ></span>
                  {chart.key}
                </Label>
              </div>
            ))}
            {charts.length === 0 && (
              <div className="text-sm text-muted-foreground p-1">No charts available to export</div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleExport}
            disabled={selectedCharts.length === 0}
          >
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartExportPanel;