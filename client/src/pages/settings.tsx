import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTheme } from '@/hooks/use-theme';
import { useMqtt, ConnectionProfile } from '@/hooks/use-mqtt';
import { useToast } from '@/hooks/use-toast';
import { exportAllSettings, importAllSettings, clearAllSettings, getStorageUsage } from '@/lib/storage';
import { getMessageCount } from '@/lib/indexeddb';

const Settings: React.FC = () => {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { 
    connectionsProfiles, 
    messageTemplates, 
    deleteProfile, 
    deleteMessageTemplate,
    setQos,
    setRetain,
    setFormatJSON,
    formatJSON
  } = useMqtt();
  
  const [toastNotifications, setToastNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [defaultChartType, setDefaultChartType] = useState('line');
  const [maxDataPoints, setMaxDataPoints] = useState(40);
  const [storageUsage, setStorageUsage] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  
  // For export/import
  const [importing, setImporting] = useState(false);

  React.useEffect(() => {
    // Get storage usage
    const usage = getStorageUsage();
    const formattedUsage = formatBytes(usage);
    setStorageUsage(formattedUsage);
    
    // Get message count
    getMessageCount().then(count => {
      setMessageCount(count);
    });
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExportData = () => {
    try {
      const data = exportAllSettings();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mqtt-explorer-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "All settings have been exported to a JSON file.",
        variant: "success"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: `Error: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        importAllSettings(data, true);
        
        toast({
          title: "Import Successful",
          description: "Settings have been imported. You may need to refresh the page to see all changes.",
          variant: "success"
        });
        
        // Refresh the page after a delay to apply all settings
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: `Error: ${(error as Error).message}`,
          variant: "destructive"
        });
      } finally {
        setImporting(false);
      }
    };
    
    reader.readAsText(file);
  };

  const triggerImport = () => {
    document.getElementById('import-file')?.click();
  };

  const handleClearSettings = () => {
    try {
      clearAllSettings();
      toast({
        title: "Settings Cleared",
        description: "All settings have been cleared. The page will refresh.",
        variant: "info"
      });
      
      // Refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Clear settings error:', error);
      toast({
        title: "Operation Failed",
        description: `Error: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* General Settings */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-4">
        <h2 className="font-heading text-xl mb-4 text-blue-400">General Settings</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Appearance</h3>
            <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
              <div>
                <Label className="font-medium">Dark Mode</Label>
                <p className="text-sm text-gray-400">Toggle between dark and light theme</p>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={toggleTheme} 
              />
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Notifications</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                <div>
                  <Label className="font-medium">Toast Notifications</Label>
                  <p className="text-sm text-gray-400">Show popup notifications for events</p>
                </div>
                <Switch 
                  checked={toastNotifications} 
                  onCheckedChange={setToastNotifications} 
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                <div>
                  <Label className="font-medium">Sound Alerts</Label>
                  <p className="text-sm text-gray-400">Play sounds for important alerts</p>
                </div>
                <Switch 
                  checked={soundAlerts} 
                  onCheckedChange={setSoundAlerts} 
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Message Display</h3>
            <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
              <div>
                <Label className="font-medium">Format JSON</Label>
                <p className="text-sm text-gray-400">Pretty-print JSON messages in the feed</p>
              </div>
              <Switch 
                checked={formatJSON} 
                onCheckedChange={setFormatJSON} 
              />
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Chart Settings</h3>
            <div className="space-y-3 p-3 bg-gray-900 rounded">
              <div>
                <Label className="block text-gray-400 text-sm mb-1">Default Chart Type</Label>
                <Select 
                  value={defaultChartType} 
                  onValueChange={setDefaultChartType}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 focus:border-purple-500">
                    <SelectValue placeholder="Select chart type" />
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
              
              <div>
                <Label className="block text-gray-400 text-sm mb-1">
                  Maximum Data Points: <span id="max-datapoints-value">{maxDataPoints}</span>
                </Label>
                <Slider 
                  min={10} 
                  max={100} 
                  step={5}
                  value={[maxDataPoints]} 
                  onValueChange={(value) => setMaxDataPoints(value[0])} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Management */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-4">
        <h2 className="font-heading text-xl mb-4 text-blue-400">Data Management</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Export/Import Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-900 rounded">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                onClick={handleExportData}
              >
                <i className="fas fa-download mr-2"></i> Export All Data
              </Button>
              
              <input 
                type="file" 
                id="import-file" 
                accept=".json" 
                className="hidden" 
                onChange={handleImportData}
              />
              <Button 
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white"
                onClick={triggerImport}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Importing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload mr-2"></i> Import Data
                  </>
                )}
              </Button>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="mt-3 w-full"
                >
                  <i className="fas fa-trash-alt mr-2"></i> Clear All Settings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Settings</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will delete all your saved connection profiles, message templates, and preferences. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    onClick={handleClearSettings}
                  >
                    Clear All Settings
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Connection Profiles</h3>
            <div className="bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
              {connectionsProfiles.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {connectionsProfiles.map((profile) => (
                    <div key={profile.id} className="flex justify-between items-center py-2">
                      <span>{profile.name}</span>
                      <div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteProfile(profile.id)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 p-4 text-center">
                  No connection profiles saved yet.
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Message Templates</h3>
            <div className="bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
              {messageTemplates.length > 0 ? (
                <div className="divide-y divide-gray-700">
                  {messageTemplates.map((template) => (
                    <div key={template.id} className="flex justify-between items-center py-2">
                      <span>{template.name}</span>
                      <div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteMessageTemplate(template.id)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 p-4 text-center">
                  No message templates saved yet.
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Storage Usage</h3>
            <div className="p-3 bg-gray-900 rounded">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>IndexedDB Message Storage</span>
                  <span>{messageCount} messages</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>LocalStorage Settings</span>
                  <span>{storageUsage}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
