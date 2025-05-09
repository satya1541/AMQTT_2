import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMessages, clearMessages, getMessageCount } from '@/lib/indexeddb'; // Ensure these imports are correct
import { MqttMessage, useMqtt } from '@/hooks/use-mqtt';
import { useToast } from '@/hooks/use-toast';
import MessageExportPanel from '@/components/message-export-panel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const History: React.FC = () => {
  const { toast } = useToast();
  const { messages: liveMessages } = useMqtt();

  const [historicalMessages, setHistoricalMessages] = useState<MqttMessage[]>([]);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [payloadFilter, setPayloadFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHistoricalMessages, setTotalHistoricalMessages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const messagesPerPage = 10;
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- DEBUG ---
  console.log(`[History Render] Live: ${liveMessages.length}, Hist: ${historicalMessages.length}, Page: ${currentPage}, Loading: ${isLoading}`);

  useEffect(() => {
    console.log("[History Effect] Filters/Page changed, loading historical..."); // <-- DEBUG
    loadHistoricalMessages();
  }, [currentPage, startDateTime, endDateTime, topicFilter, payloadFilter]);

  const updateTotalCount = async (filterOptions: any = {}) => {
    try {
      const count = await getMessageCount(filterOptions);
      console.log(`[History updateTotalCount] Count: ${count}`, filterOptions); // <-- DEBUG
      setTotalHistoricalMessages(count);
      setTotalPages(Math.ceil(count / messagesPerPage));
    } catch (error) {
      console.error('[History updateTotalCount] Error getting filtered message count:', error);
    }
  };

  const loadHistoricalMessages = async () => {
    console.log(`[History loadHistoricalMessages] Loading Page: ${currentPage}`); // <-- DEBUG
    setIsLoading(true);
    try {
      const filterOptions: any = {
        limit: messagesPerPage,
        offset: (currentPage - 1) * messagesPerPage,
        orderBy: 'timestamp',
        orderDirection: 'desc'
      };
      if (startDateTime) filterOptions.startTime = new Date(startDateTime).getTime();
      if (endDateTime) {
        const endDateObj = new Date(endDateTime);
        endDateObj.setHours(23, 59, 59, 999);
        filterOptions.endTime = endDateObj.getTime();
      }
      if (topicFilter) filterOptions.topic = topicFilter;
      if (payloadFilter) filterOptions.payloadContains = payloadFilter;

      console.log("[History loadHistoricalMessages] Fetching with options:", filterOptions); // <-- DEBUG
      const historyMessages = await getMessages(filterOptions);
      console.log("[History loadHistoricalMessages] Received historical messages:", historyMessages); // <-- DEBUG Check data here!
      setHistoricalMessages(historyMessages);

      await updateTotalCount(filterOptions);

    } catch (error) {
      console.error('[History loadHistoricalMessages] Error loading message history:', error); // <-- DEBUG Check for errors
      toast({ title: "Error", description: "Failed to load message history", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmClearHistory = async () => {
    console.log("[History confirmClearHistory] Attempting clear..."); // <-- DEBUG
    setShowClearConfirm(false);
    try {
      await clearMessages(); // Call the function from indexeddb lib
      console.log("[History confirmClearHistory] clearMessages() promise resolved."); // <-- DEBUG
      // Reset state AFTER successful clear
      setHistoricalMessages([]);
      setTotalHistoricalMessages(0);
      setTotalPages(1);
      setCurrentPage(1);
      console.log("[History confirmClearHistory] State cleared."); // <-- DEBUG
      toast({ title: "Success", description: "Message history cleared successfully", variant: "success" });
    } catch (error) {
      console.error('[History confirmClearHistory] Error clearing message history:', error); // <-- DEBUG Check console for this
      toast({ title: "Error", description: "Failed to clear message history", variant: "destructive" });
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // useEffect dependency change will trigger loadHistoricalMessages
  };

  // --- Helper Functions ---
  const formatTimestamp = (timestamp: number): string => {
    if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
        // console.warn(`[formatTimestamp] Invalid timestamp value: ${timestamp}`); // <-- DEBUG
        return 'Invalid Date';
    }
    try {
      return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
      });
    } catch (e) {
      console.error("[formatTimestamp] Error formatting timestamp:", timestamp, e); // <-- DEBUG
      return 'Invalid Date';
    }
  };

  const isJsonString = (str: string): boolean => { /* ... keep previous version ... */ };

  const renderPayload = (payload: string): React.ReactNode => {
    const trimmedPayload = typeof payload === 'string' ? payload.trim() : '';
    // console.log(`[renderPayload] Input: "${payload}", Trimmed: "${trimmedPayload}"`); // <-- DEBUG
    if (trimmedPayload === '') {
      return <span className="text-gray-500 italic text-xs">[Empty]</span>;
    }
    // ... rest of renderPayload logic ...
     if (isJsonString(trimmedPayload)) {
      try {
        const jsonObj = JSON.parse(trimmedPayload);
        const prettyJson = JSON.stringify(jsonObj, null, 2);
        const displayValue = prettyJson.length < 300 ? prettyJson : trimmedPayload;
        return (
          <pre className="font-mono text-xs max-w-lg truncate whitespace-pre-wrap break-words" title={trimmedPayload}>
            {displayValue}
          </pre>
        );
      } catch (e) {
         return <div className="font-mono text-xs max-w-lg truncate" title={trimmedPayload}>{trimmedPayload}</div>;
      }
    }
    return <div className="font-mono text-xs max-w-lg truncate" title={trimmedPayload}>{trimmedPayload}</div>;
  };

  const handleViewMessage = (message: MqttMessage) => { /* ... keep previous version ... */ };

  // --- Combine Live and Historical Messages for Display ---
  const displayedMessages = useMemo(() => {
    // console.log("[History useMemo] Recalculating displayedMessages..."); // <-- DEBUG
    const sortedLiveMessages = [...liveMessages].sort((a, b) => b.timestamp - a.timestamp);
    const liveMessageIds = new Set(sortedLiveMessages.map(msg => msg.id));
    const uniqueHistoricalMessages = historicalMessages.filter(msg => !liveMessageIds.has(msg.id));
    const combined = [...sortedLiveMessages, ...uniqueHistoricalMessages];
    // console.log(`[History useMemo] Combined Count: ${combined.length}`); // <-- DEBUG
    return combined;
  }, [liveMessages, historicalMessages]);


  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 space-y-4 sm:space-y-6 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        {/* ... Title and Export Button ... */}
         <h2 className="font-heading text-2xl sm:text-3xl font-bold text-blue-400 whitespace-nowrap">
          Message History
        </h2>
        <div className="flex items-center space-x-2 sm:space-x-3 self-start sm:self-center">
          <MessageExportPanel />
          {/* Clear History Button with Confirmation Dialog */}
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="w-9 h-9 sm:w-10 sm:h-10" aria-label="Clear History">
                <i className="fas fa-trash"></i>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-800 text-white border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Message History</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Are you sure you want to clear all message history? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowClearConfirm(false)}>Cancel</AlertDialogCancel>
                {/* Ensure this calls the correct function */}
                <AlertDialogAction onClick={confirmClearHistory} className="bg-red-600 hover:bg-red-700 focus:ring-red-600">
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleApplyFilters} className="bg-gray-900/60 rounded-lg p-4 shrink-0">
        {/* ... Filter inputs and Apply button ... */}
        <h3 className="font-medium text-lg text-gray-200 mb-3">Filter History</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label className="block text-gray-400 text-sm mb-1">Start Date/Time</Label><Input type="datetime-local" className="bg-gray-700/80 border-gray-600 focus:border-purple-500 w-full" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} /></div>
          <div><Label className="block text-gray-400 text-sm mb-1">End Date/Time</Label><Input type="datetime-local" className="bg-gray-700/80 border-gray-600 focus:border-purple-500 w-full" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} /></div>
          <div><Label className="block text-gray-400 text-sm mb-1">Topic Contains</Label><Input type="text" placeholder="e.g., sensors" className="bg-gray-700/80 border-gray-600 focus:border-purple-500 w-full" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} /></div>
          <div><Label className="block text-gray-400 text-sm mb-1">Payload Contains</Label><Input type="text" placeholder="e.g., temperature" className="bg-gray-700/80 border-gray-600 focus:border-purple-500 w-full" value={payloadFilter} onChange={(e) => setPayloadFilter(e.target.value)} /></div>
        </div>
        <div className="mt-4 flex justify-end"><Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6" disabled={isLoading}>{isLoading ? (<><i className="fas fa-spinner fa-spin mr-2"></i> Loading...</>) : (<><i className="fas fa-search mr-2"></i> Apply Filters</>)}</Button></div>
      </form>

      {/* History Table */}
      <div className="overflow-auto flex-grow">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-900 text-left sticky top-0 z-10">
              <th className="p-3 font-medium border-b border-gray-700 text-gray-300">Timestamp</th>
              <th className="p-3 font-medium border-b border-gray-700 text-gray-300">Topic</th>
              <th className="p-3 font-medium border-b border-gray-700 text-gray-300">Payload</th>
              <th className="p-3 font-medium border-b border-gray-700 text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {displayedMessages.length > 0 ? (
              displayedMessages.map((message) => {
                // --- DEBUG --- Log data for each row being rendered
                // console.log(`  Rendering Row ID: ${message.id}, TS: ${message.timestamp}, Payload: "${message.payload}"`);
                const timestampFormatted = formatTimestamp(message.timestamp);
                const payloadRendered = renderPayload(message.payload);
                // console.log(`    Formatted TS: ${timestampFormatted}, Rendered Payload:`, payloadRendered);

                return (
                  <tr key={message.id} className={`hover:bg-gray-700/50 ${liveMessages.some(liveMsg => liveMsg.id === message.id) ? 'bg-blue-900/10' : ''}`}>
                    <td className="p-3 text-sm whitespace-nowrap">{timestampFormatted}</td>
                    <td className="p-3 text-sm">
                      <span className={message.isSys ? "text-purple-400" : "text-green-400"}>
                        {message.topic}
                      </span>
                    </td>
                    <td className="p-3">{payloadRendered}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 mr-2" onClick={() => handleViewMessage(message)}><i className="fas fa-eye"></i></Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-gray-500">
                  {isLoading ? "Loading messages..." : "No messages found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-700/50 shrink-0">
          {/* ... Pagination controls ... */}
           <div>Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span> ({totalHistoricalMessages} historical messages found)</div>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><i className="fas fa-chevron-left"></i></Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { let pageNum; if (totalPages <= 5) { pageNum = i + 1; } else if (currentPage <= 3) { pageNum = i + 1; } else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; } else { pageNum = currentPage - 2 + i; } return ( <Button key={pageNum} variant={pageNum === currentPage ? "default" : "outline"} size="sm" className={pageNum === currentPage ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"} onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button> ); })}
            {totalPages > 5 && currentPage < totalPages - 2 && ( <> <span className="px-2 py-1">...</span> <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white" onClick={() => setCurrentPage(totalPages)}>{totalPages}</Button> </> )}
            <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}><i className="fas fa-chevron-right"></i></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
