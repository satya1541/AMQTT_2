import React from 'react';
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
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCharts } from '@/hooks/use-charts';
import { motion } from 'framer-motion';

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
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gray-800/70 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600 text-gray-200"
        >
          <i className="fas fa-sliders-h mr-2"></i>
          Chart Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] glass-card border-gray-700 bg-gray-900/95 shadow-xl text-gray-200">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Chart Configuration</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="mt-5">
          <TabsList className="grid grid-cols-4 bg-gray-800/50">
            <TabsTrigger value="appearance" className="data-[state=active]:bg-gray-700/70">Appearance</TabsTrigger>
            <TabsTrigger value="behavior" className="data-[state=active]:bg-gray-700/70">Behavior</TabsTrigger>
            <TabsTrigger value="axes" className="data-[state=active]:bg-gray-700/70">Axes & Scale</TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-gray-700/70">Analysis</TabsTrigger>
          </TabsList>
          
          {/* Appearance Tab */}
          <TabsContent value="appearance" className="p-4 rounded-md mt-2 bg-gray-800/30">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
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
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
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
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
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
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
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
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
                      {settings.pointRadius}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pointHoverRadius">Hover Point Size</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="pointHoverRadius"
                      value={[settings.pointHoverRadius]} 
                      min={0} 
                      max={15} 
                      step={0.5}
                      onValueChange={handleSliderChange('pointHoverRadius')}
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
                      {settings.pointHoverRadius}
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
            </motion.div>
          </TabsContent>
          
          {/* Behavior Tab */}
          <TabsContent value="behavior" className="p-4 rounded-md mt-2 bg-gray-800/30">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select 
                    value={settings.timeFormat} 
                    onValueChange={handleSelectChange('timeFormat')}
                  >
                    <SelectTrigger id="timeFormat" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
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
                    className="bg-gray-800 border-gray-700"
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
                    <SelectTrigger id="defaultType" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="radar">Radar</SelectItem>
                      <SelectItem value="pie">Pie</SelectItem>
                      <SelectItem value="doughnut">Doughnut</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Axes & Scale Tab */}
          <TabsContent value="axes" className="p-4 rounded-md mt-2 bg-gray-800/30">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yAxisMin">Y-Axis Minimum</Label>
                  <Input 
                    id="yAxisMin"
                    type="number" 
                    value={settings.yAxisMin === null ? '' : settings.yAxisMin}
                    placeholder="Auto"
                    className="bg-gray-800 border-gray-700"
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
                    className="bg-gray-800 border-gray-700"
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
                  <i className="fas fa-info-circle mr-2 mt-1"></i>
                  <span>Leave Y-Axis values empty for automatic scaling based on data. Manual values will override auto scaling.</span>
                </p>
              </div>
            </motion.div>
          </TabsContent>
          
          {/* Analysis Tab */}
          <TabsContent value="analysis" className="p-4 rounded-md mt-2 bg-gray-800/30">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-2 mb-4">
                <h3 className="text-lg font-medium text-indigo-400">Intelligent Data Analysis</h3>
                <p className="text-sm text-gray-400">Configure how data insights and predictions are generated</p>
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
                  <p className="text-xs text-gray-400">Shows predictive forecast for future data points</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="forecastPoints">Forecast Points</Label>
                  <Input 
                    id="forecastPoints"
                    type="number" 
                    min={1} 
                    max={20} 
                    value={settings.forecastPoints}
                    className="bg-gray-800 border-gray-700"
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
                  <p className="text-xs text-gray-400">Highlights data points that deviate from normal patterns</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="anomalyThresholdMode">Threshold Mode</Label>
                  <Select 
                    value={settings.anomalyThresholdMode} 
                    onValueChange={handleSelectChange('anomalyThresholdMode')}
                    disabled={!settings.anomalyDetection}
                  >
                    <SelectTrigger id="anomalyThresholdMode" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select threshold mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="auto">Auto (Based on Data Volatility)</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="anomalyThreshold">Threshold Value (σ)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="anomalyThreshold"
                      value={[settings.anomalyThreshold]} 
                      min={1} 
                      max={5} 
                      step={0.1}
                      disabled={!settings.anomalyDetection || settings.anomalyThresholdMode === 'auto'}
                      onValueChange={handleSliderChange('anomalyThreshold')}
                      className="flex-1" 
                    />
                    <div className="w-12 text-center font-mono bg-gray-800 rounded-md px-2 py-1 text-sm">
                      {settings.anomalyThreshold.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 px-3 py-3 rounded-md bg-purple-900/20 border border-purple-800/30 text-purple-300 text-sm">
                <p className="flex items-start">
                  <i className="fas fa-magic mr-2 mt-1"></i>
                  <span>Intelligent analysis features use machine learning techniques to identify patterns, predict future values, and detect anomalies in your data.</span>
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-5 flex justify-end">
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="bg-gray-800/70 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600 text-gray-200"
            >
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartSettingsPanel;