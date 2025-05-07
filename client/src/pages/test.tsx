import { useState, useEffect } from 'react';

export default function TestPage() {
  const [serverStatus, setServerStatus] = useState<string>("Checking...");
  const [wsStatus, setWsStatus] = useState<string>("Not tested");
  const [wsTestError, setWsTestError] = useState<string | null>(null);

  useEffect(() => {
    // Check server status
    fetch('/api/status')
      .then(response => response.json())
      .then(data => {
        console.log("Server status:", data);
        setServerStatus(JSON.stringify(data, null, 2));
      })
      .catch(error => {
        console.error("Server status check failed:", error);
        setServerStatus(`Error: ${error.message}`);
      });
  }, []);

  const testWebSocket = () => {
    setWsStatus("Connecting...");
    setWsTestError(null);
    
    try {
      // Get WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection opened successfully");
        setWsStatus("Connected successfully");
        
        // Send a test message
        ws.send(JSON.stringify({ type: 'ping' }));
        
        // Close after a few seconds
        setTimeout(() => {
          ws.close();
        }, 3000);
      };
      
      ws.onmessage = (event) => {
        console.log("Received WebSocket message:", event.data);
        setWsStatus(`Connected. Received: ${event.data}`);
      };
      
      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setWsStatus("Connection failed");
        setWsTestError("WebSocket error occurred");
      };
      
      ws.onclose = () => {
        console.log("WebSocket connection closed");
        if (wsStatus === "Connecting...") {
          setWsStatus("Connection closed before establishing");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setWsStatus("Failed to create WebSocket");
      setWsTestError(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif', 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#fff'
    }}>
      <h1 style={{ color: '#333' }}>Basic Test Page</h1>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#555' }}>Server Status:</h2>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto' 
        }}>
          {serverStatus}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#555' }}>WebSocket Test:</h2>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <p><strong>Status:</strong> {wsStatus}</p>
          {wsTestError && (
            <p style={{ color: 'red' }}><strong>Error:</strong> {wsTestError}</p>
          )}
        </div>
        <button 
          onClick={testWebSocket}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test WebSocket Connection
        </button>
      </div>
      
      <div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Reload Page
        </button>
        <button 
          onClick={() => window.history.back()}
          style={{
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}