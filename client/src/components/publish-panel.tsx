import React, { useState } from 'react';
import { useMqtt } from '@/hooks/use-mqtt';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const PublishPanel: React.FC = () => {
  const { toast } = useToast();
  const { 
    connectionStatus, 
    connectionOptions, 
    startAutoPublishing, 
    stopAutoPublishing, 
    startManualPublishing, 
    stopManualPublishing, 
    publishOnce, 
    publishingStatus, 
    autoPublishInterval, 
    setAutoPublishInterval, 
    manualPublishInterval, 
    setManualPublishInterval, 
    manualMessage, 
    setManualMessage, 
    lastPublished,
    messageTemplates,
    saveMessageTemplate,
    deleteMessageTemplate
  } = useMqtt();

  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [showLoadTemplateDialog, setShowLoadTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleAutoPublishIntervalChange = (value: number[]) => {
    setAutoPublishInterval(value[0]);
  };

  const handleManualPublishIntervalChange = (value: number[]) => {
    setManualPublishInterval(value[0]);
  };

  const handleStartAutoPublishing = () => {
    startAutoPublishing(autoPublishInterval);
  };

  const handleStartManualPublishing = () => {
    try {
      // Check if valid JSON
      JSON.parse(manualMessage);
      startManualPublishing(manualMessage, manualPublishInterval);
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON before publishing",
        variant: "destructive"
      });
    }
  };

  const handlePublishOnce = () => {
    try {
      // Check if valid JSON
      JSON.parse(manualMessage);
      publishOnce(manualMessage);
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON before publishing",
        variant: "destructive"
      });
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template Name Required",
        description: "Please enter a name for this template",
        variant: "warning"
      });
      return;
    }

    try {
      // Validate JSON
      JSON.parse(manualMessage);
      
      saveMessageTemplate({
        name: templateName,
        content: manualMessage
      });
      
      setShowSaveTemplateDialog(false);
      setTemplateName('');
      
    } catch (e) {
      toast({
        title: "Invalid JSON",
        description: "Cannot save invalid JSON as a template",
        variant: "destructive"
      });
    }
  };

  const handleLoadTemplate = (content: string) => {
    setManualMessage(content);
    setShowLoadTemplateDialog(false);
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return 'Never';
    return timestamp.toLocaleTimeString();
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">Publish Messages</h2>
      
      <div className="space-y-4">
        {/* Auto Publishing */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="font-medium text-lg mb-2">Auto Publishing</h3>
          <div className="space-y-3">
            <div>
              <Label className="block text-gray-400 text-sm mb-1">
                Interval: <span id="auto-interval-value">{autoPublishInterval}</span> seconds
              </Label>
              <Slider 
                min={1} 
                max={60} 
                step={1}
                value={[autoPublishInterval]} 
                onValueChange={handleAutoPublishIntervalChange}
                disabled={publishingStatus === 'publishing-auto'}
              />
            </div>
            
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Status: 
                <span className={
                  publishingStatus === 'publishing-auto' ? 'text-green-500 ml-1' : 
                  connectionStatus === 'connected' ? 'text-yellow-500 ml-1' : 'text-red-500 ml-1'
                }>
                  {publishingStatus === 'publishing-auto' ? 'Active' : 
                   connectionStatus === 'connected' ? 'Ready' : 'Disconnected'}
                </span>
              </span>
              <span className="text-xs text-gray-500">Last Published: 
                <span className="text-gray-400 ml-1">{formatTimestamp(lastPublished)}</span>
              </span>
            </div>
            
            {publishingStatus !== 'publishing-auto' ? (
              <Button 
                type="button" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white"
                onClick={handleStartAutoPublishing}
                disabled={connectionStatus !== 'connected' || !connectionOptions?.baseTopic}
              >
                <i className="fas fa-random mr-2"></i> Start Auto Publishing
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="destructive"
                className="w-full"
                onClick={stopAutoPublishing}
              >
                <i className="fas fa-stop mr-2"></i> Stop Auto Publishing
              </Button>
            )}
          </div>
        </div>
        
        {/* Manual Publishing */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">Manual Publishing</h3>
            <div className="flex space-x-2">
              <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                    disabled={connectionStatus !== 'connected'}
                  >
                    <i className="fas fa-save"></i>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>Save Message Template</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="template-name" className="text-gray-300">Template Name</Label>
                    <Input 
                      id="template-name" 
                      value={templateName} 
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                      placeholder="Enter template name" 
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveTemplate}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showLoadTemplateDialog} onOpenChange={setShowLoadTemplateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                    disabled={connectionStatus !== 'connected' || messageTemplates.length === 0}
                  >
                    <i className="fas fa-folder-open"></i>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>Load Message Template</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {messageTemplates.map(template => (
                        <div key={template.id} className="flex justify-between items-center p-2 bg-gray-700 rounded hover:bg-gray-600">
                          <Button 
                            variant="ghost" 
                            className="text-left w-full"
                            onClick={() => handleLoadTemplate(template.content)}
                          >
                            {template.name}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => deleteMessageTemplate(template.id)}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </Button>
                        </div>
                      ))}
                      
                      {messageTemplates.length === 0 && (
                        <p className="text-gray-400">No saved templates found.</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowLoadTemplateDialog(false)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="space-y-3">
            <Textarea 
              id="manual-message" 
              rows={5} 
              placeholder="Enter JSON message..." 
              className="font-mono bg-gray-700 rounded w-full px-3 py-2 text-sm border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={manualMessage}
              onChange={(e) => setManualMessage(e.target.value)}
              disabled={publishingStatus === 'publishing-manual'}
            />
            
            <div>
              <Label className="block text-gray-400 text-sm mb-1">
                Interval (for repeated): <span id="manual-interval-value">{manualPublishInterval}</span> seconds
              </Label>
              <Slider 
                min={1} 
                max={60} 
                step={1}
                value={[manualPublishInterval]} 
                onValueChange={handleManualPublishIntervalChange}
                disabled={publishingStatus === 'publishing-manual'}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                type="button" 
                className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white"
                onClick={handlePublishOnce}
                disabled={connectionStatus !== 'connected' || !connectionOptions?.baseTopic || publishingStatus === 'publishing-manual'}
              >
                <i className="fas fa-paper-plane mr-2"></i> Publish Once
              </Button>
              
              {publishingStatus !== 'publishing-manual' ? (
                <Button 
                  type="button" 
                  className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white"
                  onClick={handleStartManualPublishing}
                  disabled={connectionStatus !== 'connected' || !connectionOptions?.baseTopic}
                >
                  <i className="fas fa-clock mr-2"></i> Start Interval
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={stopManualPublishing}
                >
                  <i className="fas fa-stop mr-2"></i> Stop Interval
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishPanel;
