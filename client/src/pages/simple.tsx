import { useState, useEffect } from 'react';

export default function SimplePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [log, setLog] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Add log message
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${message}`]);
  };
  
  // Connect to WebSocket server
  const connectWebSocket = () => {
    try {
      addLog('Connecting to WebSocket server...', 'info');
      setConnectionStatus('Connecting...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      addLog(`WebSocket URL: ${wsUrl}`, 'info');
      
      const socket = new WebSocket(wsUrl);
      
      // Set connection timeout
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          addLog('WebSocket connection timeout after 10 seconds', 'error');
          socket.close();
          setConnectionStatus('Connection timeout');
        }
      }, 10000);
      
      socket.onopen = () => {
        clearTimeout(timeout);
        addLog('WebSocket connection established successfully', 'success');
        setConnectionStatus('Connected to WebSocket server');
        setWs(socket);
        
        // Send a test message
        const testMessage = { type: 'ping', timestamp: Date.now() };
        socket.send(JSON.stringify(testMessage));
        addLog(`Sent message: ${JSON.stringify(testMessage)}`, 'info');
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(`Received message: ${JSON.stringify(data)}`, 'success');
          
          // Handle specific message types
          if (data.type === 'pong') {
            setConnectionStatus('Connected and verified with ping/pong');
          }
        } catch (error) {
          addLog(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
      };
      
      socket.onerror = (event) => {
        clearTimeout(timeout);
        addLog('WebSocket error occurred', 'error');
        setConnectionStatus('Connection error');
      };
      
      socket.onclose = (event) => {
        clearTimeout(timeout);
        addLog(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`, 'warning');
        setConnectionStatus('Disconnected');
        setWs(null);
      };
      
    } catch (error) {
      addLog(`Error creating WebSocket: ${error instanceof Error ? error.message : String(error)}`, 'error');
      setConnectionStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Disconnect from WebSocket server
  const disconnectWebSocket = () => {
    if (!ws) {
      addLog('Not connected to WebSocket server', 'warning');
      return;
    }
    
    try {
      ws.close(1000, 'User requested disconnect');
      addLog('Closing WebSocket connection', 'info');
    } catch (error) {
      addLog(`Error closing WebSocket: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };
  
  // Send a message to WebSocket server
  const sendMessage = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('Not connected to WebSocket server', 'warning');
      return;
    }
    
    try {
      const message = {
        type: 'ping',
        timestamp: Date.now(),
        id: Math.random().toString(36).substring(2, 15)
      };
      
      ws.send(JSON.stringify(message));
      addLog(`Sent ping message: ${JSON.stringify(message)}`, 'info');
    } catch (error) {
      addLog(`Error sending message: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Simple WebSocket Test</h1>
      
      <div className="bg-white shadow-md rounded p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
        <div className={`p-2 rounded mb-2 ${
          connectionStatus.includes('Connected') ? 'bg-green-100 text-green-800' : 
          connectionStatus.includes('Connecting') ? 'bg-yellow-100 text-yellow-800' : 
          connectionStatus.includes('Error') || connectionStatus.includes('timeout') ? 'bg-red-100 text-red-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {connectionStatus}
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={connectWebSocket} 
            disabled={ws !== null}
            className={`px-4 py-2 rounded ${
              ws !== null ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Connect
          </button>
          
          <button 
            onClick={disconnectWebSocket} 
            disabled={ws === null}
            className={`px-4 py-2 rounded ${
              ws === null ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Disconnect
          </button>
          
          <button 
            onClick={sendMessage} 
            disabled={ws === null || ws.readyState !== WebSocket.OPEN}
            className={`px-4 py-2 rounded ${
              ws === null || ws.readyState !== WebSocket.OPEN ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Send Ping
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Log</h2>
        <div className="bg-gray-900 text-white p-4 rounded h-80 overflow-y-auto font-mono text-sm">
          {log.map((entry, index) => (
            <div key={index} className={`mb-1 ${
              entry.includes('[ERROR]') ? 'text-red-400' : 
              entry.includes('[SUCCESS]') ? 'text-green-400' : 
              entry.includes('[WARNING]') ? 'text-yellow-400' : 
              'text-blue-400'
            }`}>
              {entry}
            </div>
          ))}
          {log.length === 0 && (
            <div className="text-gray-400">No log entries yet. Click "Connect" to start.</div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <a href="/simple-app.html" className="text-blue-500 hover:underline mr-4">
          Open Standalone App
        </a>
        <a href="/basic-test.html" className="text-blue-500 hover:underline mr-4">
          Open Basic Test
        </a>
        <a href="/" className="text-blue-500 hover:underline">
          Back to Home
        </a>
      </div>
    </div>
  );
}