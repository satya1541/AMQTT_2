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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { exportMessages, getMessageCount } from '@/lib/indexeddb';
import { MqttMessage } from '@/hooks/use-mqtt';
import { motion } from 'framer-motion';

interface ExportOptions {
  format: 'json' | 'csv';
  timeRange: 'all' | 'last24' | 'last7days' | 'custom';
  startDate: Date | null;
  endDate: Date | null;
  topicFilter: string;
  payloadFilter: string;
  limit: number;
  prettyFormat: boolean;
}

const MessageExportPanel: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    timeRange: 'all',
    startDate: null,
    endDate: null,
    topicFilter: '',
    payloadFilter: '',
    limit: 1000,
    prettyFormat: true
  });
  
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Load message count on open
  const handleDialogOpen = async () => {
    try {
      const count = await getMessageCount();
      setMessageCount(count);
    } catch (error) {
      console.error('Error getting message count:', error);
    }
  };
  
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Build query options
      const queryOptions: any = {
        limit: exportOptions.limit
      };
      
      // Set time range
      if (exportOptions.timeRange === 'last24') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        queryOptions.startTime = oneDayAgo.getTime();
      } else if (exportOptions.timeRange === 'last7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        queryOptions.startTime = sevenDaysAgo.getTime();
      } else if (exportOptions.timeRange === 'custom') {
        if (exportOptions.startDate) {
          queryOptions.startTime = exportOptions.startDate.getTime();
        }
        if (exportOptions.endDate) {
          queryOptions.endTime = exportOptions.endDate.getTime();
        }
      }
      
      // Set topic filter
      if (exportOptions.topicFilter) {
        queryOptions.topic = exportOptions.topicFilter;
      }
      
      // Set payload filter
      if (exportOptions.payloadFilter) {
        queryOptions.payloadContains = exportOptions.payloadFilter;
      }
      
      // Export 
      const result = await exportMessages(exportOptions.format);
      
      // Create download
      const contentType = exportOptions.format === 'json' ? 'application/json' : 'text/csv';
      const fileName = `mqtt-messages-${new Date().toISOString().slice(0, 10)}.${exportOptions.format}`;
      
      const blob = new Blob([result], { type: contentType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting messages:', error);
      alert('Error exporting messages. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <Dialog onOpenChange={(open) => {
      if (open) handleDialogOpen();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-gray-800/70 border-gray-700 hover:bg-gray-700/70 hover:border-gray-600 text-gray-200"
        >
          <i className="fas fa-file-export mr-2"></i>
          Export Messages
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] glass-card border-gray-700 bg-gray-900/95 shadow-xl text-gray-200">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Export Message History</DialogTitle>
        </DialogHeader>
        
        {messageCount !== null && (
          <div className="mt-2 rounded-md bg-blue-900/20 p-3 text-sm text-blue-300">
            <p className="flex items-center">
              <i className="fas fa-info-circle mr-2"></i>
              <span>Database contains {messageCount.toLocaleString()} saved messages</span>
            </p>
          </div>
        )}
        
        <motion.div 
          className="mt-5 space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="basic" className="mt-5">
            <TabsList className="grid grid-cols-2 bg-gray-800/50">
              <TabsTrigger value="basic" className="data-[state=active]:bg-gray-700/70">Basic Options</TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-gray-700/70">Advanced Filters</TabsTrigger>
            </TabsList>
            
            {/* Basic Options Tab */}
            <TabsContent value="basic" className="p-4 rounded-md mt-2 bg-gray-800/30">
              <motion.div 
                className="space-y-4"
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
                      format: value as 'json' | 'csv'
                    }))}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="json" id="format-json" />
                      <Label htmlFor="format-json">JSON</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="format-csv" />
                      <Label htmlFor="format-csv">CSV</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-3">
                  <Label className="block mb-2">Time Range</Label>
                  <RadioGroup
                    value={exportOptions.timeRange}
                    onValueChange={(value) => setExportOptions(prev => ({ 
                      ...prev, 
                      timeRange: value as ExportOptions['timeRange']
                    }))}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="range-all" />
                      <Label htmlFor="range-all">All Messages</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="last24" id="range-last24" />
                      <Label htmlFor="range-last24">Last 24 Hours</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="last7days" id="range-last7days" />
                      <Label htmlFor="range-last7days">Last 7 Days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="range-custom" />
                      <Label htmlFor="range-custom">Custom Range</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {exportOptions.timeRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="startDate"
                            variant="outline"
                            className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700 justify-start text-left"
                          >
                            {exportOptions.startDate ? (
                              format(exportOptions.startDate, "PPP")
                            ) : (
                              <span className="text-gray-400">Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                          <Calendar
                            mode="single"
                            selected={exportOptions.startDate || undefined}
                            onSelect={(date) => setExportOptions(prev => ({ ...prev, startDate: date as Date | null }))}
                            className="bg-gray-800 text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="endDate"
                            variant="outline"
                            className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700 justify-start text-left"
                          >
                            {exportOptions.endDate ? (
                              format(exportOptions.endDate, "PPP")
                            ) : (
                              <span className="text-gray-400">Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                          <Calendar
                            mode="single"
                            selected={exportOptions.endDate || undefined}
                            onSelect={(date) => setExportOptions(prev => ({ ...prev, endDate: date as Date | null }))}
                            disabled={(date) => 
                              (exportOptions.startDate ? date < exportOptions.startDate : false) || 
                              date > new Date()
                            }
                            className="bg-gray-800 text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
                
                {exportOptions.format === 'json' && (
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox 
                      id="prettyFormat"
                      checked={exportOptions.prettyFormat}
                      onCheckedChange={(checked) => setExportOptions(prev => ({ 
                        ...prev, 
                        prettyFormat: checked === true
                      }))}
                    />
                    <Label htmlFor="prettyFormat">Format JSON with indentation</Label>
                  </div>
                )}
              </motion.div>
            </TabsContent>
            
            {/* Advanced Options Tab */}
            <TabsContent value="advanced" className="p-4 rounded-md mt-2 bg-gray-800/30">
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="topic-filter">Topic Filter</Label>
                  <Input 
                    id="topic-filter"
                    placeholder="Enter topic to filter (e.g. sensor/+/temp)"
                    value={exportOptions.topicFilter}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      topicFilter: e.target.value
                    }))}
                    className="bg-gray-800 border-gray-700"
                  />
                  <p className="text-xs text-gray-400">Leave empty to include all topics</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payload-filter">Payload Contains</Label>
                  <Input 
                    id="payload-filter"
                    placeholder="Filter messages containing this text"
                    value={exportOptions.payloadFilter}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      payloadFilter: e.target.value
                    }))}
                    className="bg-gray-800 border-gray-700"
                  />
                  <p className="text-xs text-gray-400">Case-sensitive text search in message payloads</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="limit">Maximum Messages</Label>
                  <Select 
                    value={exportOptions.limit.toString()} 
                    onValueChange={(value) => setExportOptions(prev => ({ 
                      ...prev, 
                      limit: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger id="limit" className="bg-gray-800 border-gray-700">
                      <SelectValue placeholder="Select limit" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="100">100 messages</SelectItem>
                      <SelectItem value="500">500 messages</SelectItem>
                      <SelectItem value="1000">1,000 messages</SelectItem>
                      <SelectItem value="5000">5,000 messages</SelectItem>
                      <SelectItem value="10000">10,000 messages</SelectItem>
                      <SelectItem value="0">All messages</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">Large exports may take longer to process</p>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
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
            disabled={exporting}
          >
            {exporting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Exporting...
              </>
            ) : (
              <>
                <i className="fas fa-file-export mr-2"></i>
                Export Messages
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageExportPanel;