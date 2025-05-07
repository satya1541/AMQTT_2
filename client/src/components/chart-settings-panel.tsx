import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCharts } from '@/hooks/use-charts';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ChartSettingsPanelProps {
  onClose: () => void;
}

const ChartSettingsPanel: React.FC<ChartSettingsPanelProps> = ({ onClose }) => {
  const { settings, updateSettings } = useCharts();
  
  const handleNumberChange = (key: keyof typeof settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      updateSettings({ [key]: null });
    } else {
      const numberValue = parseFloat(value);
      if (!isNaN(numberValue)) {
        updateSettings({ [key]: numberValue });
      }
    }
  };
  
  const handleSliderChange = (key: keyof typeof settings) => (value: number[]) => {
    updateSettings({ [key]: value[0] });
  };
  
  const handleSwitchChange = (key: keyof typeof settings) => (checked: boolean) => {
    updateSettings({ [key]: checked });
  };

  const handleSelectChange = (key: keyof typeof settings) => (value: string) => {
    updateSettings({ [key]: value });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center">
        <CardTitle className="flex-1">Chart Settings</CardTitle>
        <Button variant="ghost" onClick={onClose} size="sm">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance" className="mt-2">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="axes">Axes & Scale</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="borderWidth">Border Width</Label>
                <div className="flex items-center gap-4">
                  <Slider 
                    id="borderWidth"
                    value={[settings.borderWidth]} 
                    min={0} 
                    max={10} 
                    step={0.5}
                    onValueChange={handleSliderChange('borderWidth')}
                  />
                  <div className="w-12 text-center font-mono bg-secondary rounded-md px-2 py-1 text-sm">
                    {settings.borderWidth}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fillOpacity">Fill Opacity</Label>
                <div className="flex items-center gap-4">
                  <Slider 
                    id="fillOpacity"
                    value={[settings.fillOpacity]} 
                    min={0} 
                    max={1} 
                    step={0.05}
                    onValueChange={handleSliderChange('fillOpacity')}
                  />
                  <div className="w-12 text-center font-mono bg-secondary rounded-md px-2 py-1 text-sm">
                    {settings.fillOpacity.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tension">Line Tension</Label>
                <div className="flex items-center gap-4">
                  <Slider 
                    id="tension"
                    value={[settings.tension]} 
                    min={0} 
                    max={1} 
                    step={0.1}
                    onValueChange={handleSliderChange('tension')}
                  />
                  <div className="w-12 text-center font-mono bg-secondary rounded-md px-2 py-1 text-sm">
                    {settings.tension.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pointRadius">Point Size</Label>
                <div className="flex items-center gap-4">
                  <Slider 
                    id="pointRadius"
                    value={[settings.pointRadius]} 
                    min={0} 
                    max={10} 
                    step={0.5}
                    onValueChange={handleSliderChange('pointRadius')}
                  />
                  <div className="w-12 text-center font-mono bg-secondary rounded-md px-2 py-1 text-sm">
                    {settings.pointRadius}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="showLegend" className="mb-2 block">Show Legend</Label>
                <Switch 
                  id="showLegend"
                  checked={settings.showLegend}
                  onCheckedChange={handleSwitchChange('showLegend')}
                />
              </div>
            </div>
          </TabsContent>
          
          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select 
                  value={settings.timeFormat} 
                  onValueChange={handleSelectChange('timeFormat')}
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue placeholder="Select time format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relative">Relative (Points)</SelectItem>
                    <SelectItem value="absolute">Absolute (Timestamp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxDataPoints">Max Data Points</Label>
                <Input 
                  id="maxDataPoints"
                  type="number" 
                  min={10} 
                  max={1000} 
                  value={settings.maxDataPoints}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 10) {
                      updateSettings({ maxDataPoints: val });
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="animation" className="mb-2 block">Animation</Label>
                <Switch 
                  id="animation"
                  checked={settings.animation}
                  onCheckedChange={handleSwitchChange('animation')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultType">Default Chart Type</Label>
                <Select 
                  value={settings.defaultType} 
                  onValueChange={handleSelectChange('defaultType')}
                >
                  <SelectTrigger id="defaultType">
                    <SelectValue placeholder="Select chart type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="radar">Radar</SelectItem>
                    <SelectItem value="polarArea">Polar Area</SelectItem>
                    <SelectItem value="doughnut">Doughnut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          
          {/* Axes & Scale Tab */}
          <TabsContent value="axes" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yAxisMin">Y-Axis Minimum</Label>
                <Input 
                  id="yAxisMin"
                  type="number" 
                  value={settings.yAxisMin === null ? '' : settings.yAxisMin}
                  placeholder="Auto"
                  onChange={handleNumberChange('yAxisMin')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yAxisMax">Y-Axis Maximum</Label>
                <Input 
                  id="yAxisMax"
                  type="number" 
                  value={settings.yAxisMax === null ? '' : settings.yAxisMax}
                  placeholder="Auto"
                  onChange={handleNumberChange('yAxisMax')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="showGrid" className="mb-2 block">Show Grid</Label>
                <Switch 
                  id="showGrid"
                  checked={settings.showGrid}
                  onCheckedChange={handleSwitchChange('showGrid')}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="autoScale" className="mb-2 block">Auto Scale</Label>
                <Switch 
                  id="autoScale"
                  checked={settings.autoScale}
                  onCheckedChange={handleSwitchChange('autoScale')}
                />
              </div>
            </div>
            
            <div className="mt-6 px-2 py-3 rounded-md bg-blue-900/20 border border-blue-800/30 text-blue-300 text-sm">
              <p className="flex items-start">
                <span>Leave Y-Axis values empty for automatic scaling based on data. Manual values will override auto scaling.</span>
              </p>
            </div>
          </TabsContent>
          
          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 mt-4">
            <div className="space-y-2 mb-4">
              <h3 className="text-lg font-medium">Intelligent Data Analysis</h3>
              <p className="text-sm text-muted-foreground">Configure how data insights and predictions are generated</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enableForecast" className="mb-2 block">Enable Forecasting</Label>
                  <Switch 
                    id="enableForecast"
                    checked={settings.enableForecast}
                    onCheckedChange={handleSwitchChange('enableForecast')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Shows predictive forecast for future data points</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="forecastPoints">Forecast Points</Label>
                <Input 
                  id="forecastPoints"
                  type="number" 
                  min={1} 
                  max={20} 
                  value={settings.forecastPoints}
                  disabled={!settings.enableForecast}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1) {
                      updateSettings({ forecastPoints: val });
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="anomalyDetection" className="mb-2 block">Anomaly Detection</Label>
                  <Switch 
                    id="anomalyDetection"
                    checked={settings.anomalyDetection}
                    onCheckedChange={handleSwitchChange('anomalyDetection')}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Highlight data points that deviate from the pattern</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anomalyThreshold">Anomaly Threshold (σ)</Label>
                <div className="flex items-center gap-4">
                  <Slider 
                    id="anomalyThreshold"
                    value={[settings.anomalyThreshold]} 
                    min={1} 
                    max={3} 
                    step={0.1}
                    disabled={!settings.anomalyDetection}
                    onValueChange={handleSliderChange('anomalyThreshold')}
                  />
                  <div className="w-12 text-center font-mono bg-secondary rounded-md px-2 py-1 text-sm">
                    {settings.anomalyThreshold}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-5 flex justify-end">
          <Button 
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartSettingsPanel;