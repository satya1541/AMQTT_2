import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMessages, clearMessages, exportMessages, getMessageCount } from '@/lib/indexeddb';
import { MqttMessage } from '@/hooks/use-mqtt';
import { useToast } from '@/hooks/use-toast';
import MessageExportPanel from '@/components/message-export-panel';

const History: React.FC = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [payloadFilter, setPayloadFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const messagesPerPage = 10;

  useEffect(() => {
    loadHistory();
    updateTotalCount();
  }, [currentPage]);

  const updateTotalCount = async () => {
    try {
      const count = await getMessageCount();
      setTotalMessages(count);
      setTotalPages(Math.ceil(count / messagesPerPage));
    } catch (error) {
      console.error('Error getting message count:', error);
      toast({
        title: "Error",
        description: "Failed to get message count",
        variant: "destructive"
      });
    }
  };

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const options: any = {
        limit: messagesPerPage,
        offset: (currentPage - 1) * messagesPerPage
      };

      if (startDateTime) {
        options.startTime = new Date(startDateTime).getTime();
      }
      
      if (endDateTime) {
        options.endTime = new Date(endDateTime).getTime();
      }
      
      if (topicFilter) {
        options.topic = topicFilter;
      }
      
      if (payloadFilter) {
        options.payloadContains = payloadFilter;
      }

      const historyMessages = await getMessages(options);
      setMessages(historyMessages);
    } catch (error) {
      console.error('Error loading message history:', error);
      toast({
        title: "Error",
        description: "Failed to load message history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all message history? This action cannot be undone.')) {
      try {
        await clearMessages();
        setMessages([]);
        setTotalMessages(0);
        setTotalPages(1);
        setCurrentPage(1);
        toast({
          title: "Success",
          description: "Message history cleared successfully",
          variant: "success"
        });
      } catch (error) {
        console.error('Error clearing message history:', error);
        toast({
          title: "Error",
          description: "Failed to clear message history",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = await exportMessages('csv');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mqtt-messages-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "Messages exported to CSV successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast({
        title: "Error",
        description: "Failed to export messages",
        variant: "destructive"
      });
    }
  };

  const handleExportJSON = async () => {
    try {
      const jsonData = await exportMessages('json');
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mqtt-messages-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Success",
        description: "Messages exported to JSON successfully",
        variant: "success"
      });
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast({
        title: "Error",
        description: "Failed to export messages",
        variant: "destructive"
      });
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadHistory();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isJsonString = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const renderPayload = (payload: string) => {
    if (isJsonString(payload)) {
      return (
        <div className="font-mono text-xs max-w-lg truncate">
          {payload}
        </div>
      );
    }
    return <div className="font-mono text-xs max-w-lg truncate">{payload}</div>;
  };

  const handleViewMessage = (message: MqttMessage) => {
    let formattedPayload = message.payload;
    if (isJsonString(message.payload)) {
      formattedPayload = JSON.stringify(JSON.parse(message.payload), null, 2);
    }

    toast({
      title: message.topic,
      description: (
        <div className="mt-2 bg-gray-900 p-2 rounded-md">
          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
            {formattedPayload}
          </pre>
          <div className="text-xs mt-2 text-gray-400">
            <div>Timestamp: {formatTimestamp(message.timestamp)}</div>
            <div>QoS: {message.qos}</div>
            <div>Retain: {message.retain ? 'Yes' : 'No'}</div>
          </div>
        </div>
      ),
      variant: "info",
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-xl text-blue-400">Message History</h2>
        <div className="flex space-x-2">
          <MessageExportPanel />
          <Button
            className="bg-red-600 hover:bg-red-500 text-white"
            onClick={handleClearHistory}
          >
            <i className="fas fa-trash-alt mr-1"></i> Clear History
          </Button>
        </div>
      </div>
      
      {/* Filters */}
      <form onSubmit={handleApplyFilters} className="bg-gray-900 rounded-lg p-4">
        <h3 className="font-medium mb-3">Filter History</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="block text-gray-400 text-sm mb-1">Start Date/Time</Label>
            <Input
              type="datetime-local"
              className="bg-gray-700 border-gray-600 focus:border-purple-500"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="block text-gray-400 text-sm mb-1">End Date/Time</Label>
            <Input
              type="datetime-local"
              className="bg-gray-700 border-gray-600 focus:border-purple-500"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="block text-gray-400 text-sm mb-1">Topic Contains</Label>
            <Input
              type="text"
              placeholder="e.g., sensors"
              className="bg-gray-700 border-gray-600 focus:border-purple-500"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="block text-gray-400 text-sm mb-1">Payload Contains</Label>
            <Input
              type="text"
              placeholder="e.g., temperature"
              className="bg-gray-700 border-gray-600 focus:border-purple-500"
              value={payloadFilter}
              onChange={(e) => setPayloadFilter(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i> Loading...
              </>
            ) : (
              <>
                <i className="fas fa-search mr-2"></i> Apply Filters
              </>
            )}
          </Button>
        </div>
      </form>
      
      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-900 text-left">
              <th className="p-3 font-medium border-b border-gray-700">Timestamp</th>
              <th className="p-3 font-medium border-b border-gray-700">Topic</th>
              <th className="p-3 font-medium border-b border-gray-700">Payload</th>
              <th className="p-3 font-medium border-b border-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {messages.length > 0 ? (
              messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-700/50">
                  <td className="p-3 text-sm">{formatTimestamp(message.timestamp)}</td>
                  <td className="p-3 text-sm">
                    <span className={message.isSys ? "text-purple-400" : "text-green-400"}>
                      {message.topic}
                    </span>
                  </td>
                  <td className="p-3">{renderPayload(message.payload)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 mr-2"
                      onClick={() => handleViewMessage(message)}
                    >
                      <i className="fas fa-eye"></i>
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  {isLoading ? "Loading messages..." : "No messages found matching your criteria."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm">
          <div>
            Showing <span className="font-medium">{(currentPage - 1) * messagesPerPage + 1}-{Math.min(currentPage * messagesPerPage, totalMessages)}</span> of <span className="font-medium">{totalMessages}</span> messages
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  className={pageNum === currentPage ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 py-1">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600 text-white"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-700 hover:bg-gray-600 text-white"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
