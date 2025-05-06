import React, { useState } from 'react';
import { useRules } from '@/hooks/use-rules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMqtt } from '@/hooks/use-mqtt';

interface RuleFormData {
  name: string;
  dataKey: string;
  operator: string;
  value: string;
  showAlert: boolean;
  alertLevel: 'info' | 'warn' | 'error';
  alertMessage: string;
  publishMessage: boolean;
  publishTopic: string;
  publishPayload: string;
  publishQos: 0 | 1 | 2;
  publishRetain: boolean;
}

const initialFormData: RuleFormData = {
  name: '',
  dataKey: 'metrics.temp',
  operator: '>',
  value: '25',
  showAlert: true,
  alertLevel: 'warn',
  alertMessage: 'Temperature is too high!',
  publishMessage: false,
  publishTopic: 'alerts/temperature',
  publishPayload: '{"alert": "Temperature exceeded threshold", "value": 25}',
  publishQos: 1,
  publishRetain: false
};

const RuleCreator: React.FC = () => {
  const { toast } = useToast();
  const { addRule } = useRules();
  const { messages } = useMqtt();
  const [formData, setFormData] = useState<RuleFormData>(initialFormData);
  
  // Extract keys from the latest message for the data key dropdown
  const [availableKeys, setAvailableKeys] = useState<string[]>(['metrics.temp', 'metrics.humid', 'metrics.status']);
  
  React.useEffect(() => {
    if (messages.length > 0) {
      // Get the latest non-$SYS message
      const nonSysMessages = messages.filter(msg => !msg.isSys);
      if (nonSysMessages.length > 0) {
        const latestMessage = nonSysMessages[nonSysMessages.length - 1];
        try {
          const data = JSON.parse(latestMessage.payload);
          const keys = extractPaths(data);
          if (keys.length > 0) {
            setAvailableKeys(keys);
          }
        } catch (error) {
          // Not JSON or other error, ignore
        }
      }
    }
  }, [messages]);
  
  // Extract all paths from a nested object
  const extractPaths = (obj: any, prefix = ''): string[] => {
    let result: string[] = [];
    
    if (!obj || typeof obj !== 'object') return result;
    
    Object.keys(obj).forEach(key => {
      const newPath = prefix ? `${prefix}.${key}` : key;
      result.push(newPath);
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        result = [...result, ...extractPaths(obj[key], newPath)];
      }
    });
    
    return result;
  };
  
  const handleChange = (field: keyof RuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.dataKey.trim()) {
      toast({
        title: "Validation Error",
        description: "Data key is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Comparison value is required",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.showAlert && !formData.alertMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Alert message is required when Show Alert is enabled",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.publishMessage) {
      if (!formData.publishTopic.trim()) {
        toast({
          title: "Validation Error",
          description: "Publish topic is required when Publish Message is enabled",
          variant: "destructive"
        });
        return;
      }
      
      if (!formData.publishPayload.trim()) {
        toast({
          title: "Validation Error",
          description: "Publish payload is required when Publish Message is enabled",
          variant: "destructive"
        });
        return;
      }
      
      // Validate JSON for payload
      try {
        JSON.parse(formData.publishPayload);
      } catch (e) {
        toast({
          title: "Validation Error",
          description: "Publish payload must be valid JSON",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Create rule object
    const rule = {
      id: Date.now().toString(),
      name: formData.name,
      condition: {
        key: formData.dataKey,
        operator: formData.operator,
        value: formData.value
      },
      actions: {
        showAlert: formData.showAlert ? {
          level: formData.alertLevel,
          message: formData.alertMessage
        } : null,
        publishMessage: formData.publishMessage ? {
          topic: formData.publishTopic,
          payload: formData.publishPayload,
          qos: formData.publishQos,
          retain: formData.publishRetain
        } : null
      }
    };
    
    // Add rule
    addRule(rule);
    
    // Reset form
    setFormData(initialFormData);
    
    // Show success toast
    toast({
      title: "Rule Created",
      description: `Rule "${formData.name}" has been created successfully`,
      variant: "success"
    });
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <h2 className="font-heading text-xl mb-4 text-blue-400">Create Rule</h2>
      
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label className="block text-gray-400 text-sm mb-1">Rule Name</Label>
            <Input 
              type="text" 
              placeholder="e.g., High Temperature Alert" 
              className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          
          {/* Condition */}
          <div className="md:col-span-2 bg-gray-900 p-3 rounded-lg">
            <h3 className="font-medium mb-3">If this condition:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="block text-gray-400 text-sm mb-1">Data Key</Label>
                <Select 
                  value={formData.dataKey} 
                  onValueChange={(value) => handleChange('dataKey', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 focus:border-purple-500">
                    <SelectValue placeholder="Select data key" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKeys.map(key => (
                      <SelectItem key={key} value={key}>{key}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-gray-400 text-sm mb-1">Operator</Label>
                <Select 
                  value={formData.operator} 
                  onValueChange={(value) => handleChange('operator', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 focus:border-purple-500">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">&gt; Greater than</SelectItem>
                    <SelectItem value="<">&lt; Less than</SelectItem>
                    <SelectItem value=">=">&gt;= Greater than or equal</SelectItem>
                    <SelectItem value="<=">&lt;= Less than or equal</SelectItem>
                    <SelectItem value="==">== Equal to</SelectItem>
                    <SelectItem value="!=">!= Not equal to</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-gray-400 text-sm mb-1">Value</Label>
                <Input
                  type="text"
                  placeholder="e.g., 25"
                  className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  value={formData.value}
                  onChange={(e) => handleChange('value', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Then Actions */}
          <div className="md:col-span-2 bg-gray-900 p-3 rounded-lg">
            <h3 className="font-medium mb-3">Then do these actions:</h3>
            <div className="space-y-4">
              {/* Alert Action */}
              <div className="p-2 border border-gray-700 rounded">
                <div className="flex items-center">
                  <Checkbox 
                    id="show-alert"
                    checked={formData.showAlert}
                    onCheckedChange={(checked) => handleChange('showAlert', checked === true)}
                  />
                  <Label htmlFor="show-alert" className="ml-2 font-medium">Show Alert</Label>
                </div>
                
                <div className={`mt-2 pl-6 grid grid-cols-1 md:grid-cols-2 gap-3 ${!formData.showAlert ? 'opacity-50' : ''}`}>
                  <div>
                    <Label className="block text-gray-400 text-sm mb-1">Alert Level</Label>
                    <Select 
                      value={formData.alertLevel} 
                      onValueChange={(value: 'info' | 'warn' | 'error') => handleChange('alertLevel', value)}
                      disabled={!formData.showAlert}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 focus:border-purple-500">
                        <SelectValue placeholder="Select alert level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="block text-gray-400 text-sm mb-1">Alert Message</Label>
                    <Input
                      type="text"
                      placeholder="Message to display"
                      className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.alertMessage}
                      onChange={(e) => handleChange('alertMessage', e.target.value)}
                      disabled={!formData.showAlert}
                    />
                  </div>
                </div>
              </div>
              
              {/* Publish Message Action */}
              <div className="p-2 border border-gray-700 rounded">
                <div className="flex items-center">
                  <Checkbox 
                    id="publish-message"
                    checked={formData.publishMessage}
                    onCheckedChange={(checked) => handleChange('publishMessage', checked === true)}
                  />
                  <Label htmlFor="publish-message" className="ml-2 font-medium">Publish MQTT Message</Label>
                </div>
                
                <div className={`mt-2 pl-6 space-y-3 ${!formData.publishMessage ? 'opacity-50' : ''}`}>
                  <div>
                    <Label className="block text-gray-400 text-sm mb-1">Topic</Label>
                    <Input
                      type="text"
                      placeholder="e.g., alerts/temperature"
                      className="bg-gray-700 rounded w-full px-3 py-2 border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.publishTopic}
                      onChange={(e) => handleChange('publishTopic', e.target.value)}
                      disabled={!formData.publishMessage}
                    />
                  </div>
                  
                  <div>
                    <Label className="block text-gray-400 text-sm mb-1">JSON Payload</Label>
                    <Input
                      as="textarea"
                      rows={3}
                      placeholder={'{"alert": "Temperature exceeded threshold", "value": 25}'}
                      className="font-mono bg-gray-700 rounded w-full px-3 py-2 text-sm border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      value={formData.publishPayload}
                      onChange={(e) => handleChange('publishPayload', e.target.value)}
                      disabled={!formData.publishMessage}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="block text-gray-400 text-sm mb-1">QoS</Label>
                      <Select 
                        value={formData.publishQos.toString()} 
                        onValueChange={(value) => handleChange('publishQos', parseInt(value) as 0 | 1 | 2)}
                        disabled={!formData.publishMessage}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 focus:border-purple-500">
                          <SelectValue placeholder="Select QoS" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - At most once</SelectItem>
                          <SelectItem value="1">1 - At least once</SelectItem>
                          <SelectItem value="2">2 - Exactly once</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center pl-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="publish-retain"
                          checked={formData.publishRetain}
                          onCheckedChange={(checked) => handleChange('publishRetain', checked === true)}
                          disabled={!formData.publishMessage}
                        />
                        <Label htmlFor="publish-retain">Retain Message</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white"
          >
            <i className="fas fa-save mr-2"></i> Save Rule
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RuleCreator;
