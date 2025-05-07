import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, X, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Diagnostic() {
  const [serverStatus, setServerStatus] = useState<null | {
    status: string;
    timestamp: string;
    connections?: {
      websocket: number;
      mqtt: number;
    };
    websocket?: {
      server: string;
      path: string;
    };
  }>(null);
  const [wsStatus, setWsStatus] = useState<null | {
    websocket_server: string;
    clients_connected: number;
    path: string;
    mqtt_connections: number;
  }>(null);
  const [wsTestStatus, setWsTestStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [wsTestError, setWsTestError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('');

  // Check server status on page load
  useEffect(() => {
    checkServerStatus();
    checkWsStatus();
    
    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    setWsUrl(url);
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setServerStatus(data);
    } catch (error) {
      console.error('Error checking server status:', error);
    }
  };

  const checkWsStatus = async () => {
    try {
      const response = await fetch('/api/ws-check');
      const data = await response.json();
      setWsStatus(data);
    } catch (error) {
      console.error('Error checking WebSocket status:', error);
    }
  };

  const testWebSocketConnection = () => {
    setWsTestStatus('connecting');
    setWsTestError(null);
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWsTestStatus('connected');
        
        // Send a ping message
        ws.send(JSON.stringify({ type: 'ping' }));
        
        // Close the connection after a short delay
        setTimeout(() => {
          ws.close();
        }, 3000);
      };
      
      ws.onmessage = (event) => {
        console.log('Received message:', event.data);
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setWsTestStatus('error');
        setWsTestError('Failed to establish WebSocket connection');
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        if (wsTestStatus !== 'error') {
          setWsTestStatus('idle');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setWsTestStatus('error');
      setWsTestError(`Failed to create WebSocket: ${(error as Error).message}`);
    }
  };

  const reload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen w-full p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div>MQTT Explorer Diagnostic Tool</div>
              <Badge variant="outline" className="ml-auto">Diagnostic Mode</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Alert className={serverStatus ? "border-gray-200" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                <div className="flex items-center gap-2">
                  {serverStatus ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                  <AlertTitle>Server Status</AlertTitle>
                </div>
                <AlertDescription>
                  {serverStatus ? (
                    <div className="mt-2">
                      <div><strong>Status:</strong> {serverStatus.status}</div>
                      <div><strong>Timestamp:</strong> {serverStatus.timestamp}</div>
                      {serverStatus.connections && (
                        <div><strong>Connections:</strong> WebSocket: {serverStatus.connections.websocket}, MQTT: {serverStatus.connections.mqtt}</div>
                      )}
                      {serverStatus.websocket && (
                        <div><strong>WebSocket:</strong> {serverStatus.websocket.server} on path {serverStatus.websocket.path}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">Server status check failed. Server may be down or unreachable.</div>
                  )}
                  <Button onClick={checkServerStatus} variant="outline" size="sm" className="mt-2">Refresh</Button>
                </AlertDescription>
              </Alert>

              <Alert className={wsStatus ? "border-gray-200" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
                <div className="flex items-center gap-2">
                  {wsStatus ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-red-500" />}
                  <AlertTitle>WebSocket Server Status</AlertTitle>
                </div>
                <AlertDescription>
                  {wsStatus ? (
                    <div className="mt-2">
                      <div><strong>Status:</strong> {wsStatus.websocket_server}</div>
                      <div><strong>Connected Clients:</strong> {wsStatus.clients_connected}</div>
                      <div><strong>Path:</strong> {wsStatus.path}</div>
                      <div><strong>Active MQTT Connections:</strong> {wsStatus.mqtt_connections}</div>
                    </div>
                  ) : (
                    <div className="mt-2">WebSocket status check failed. Server may be down or unreachable.</div>
                  )}
                  <Button onClick={checkWsStatus} variant="outline" size="sm" className="mt-2">Refresh</Button>
                </AlertDescription>
              </Alert>

              <Alert className={
                wsTestStatus === 'idle' ? "border-gray-200" : 
                wsTestStatus === 'connecting' ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                wsTestStatus === 'connected' ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"
              }>
                <div className="flex items-center gap-2">
                  {wsTestStatus === 'connected' ? <Wifi className="h-5 w-5" /> : 
                   wsTestStatus === 'error' ? <X className="h-5 w-5" /> :
                   <WifiOff className="h-5 w-5" />}
                  <AlertTitle>WebSocket Connection Test</AlertTitle>
                </div>
                <AlertDescription>
                  <div className="mt-2">
                    <div><strong>Status:</strong> {
                      wsTestStatus === 'idle' ? 'Ready to test' :
                      wsTestStatus === 'connecting' ? 'Connecting...' :
                      wsTestStatus === 'connected' ? 'Connected successfully!' :
                      'Connection error'
                    }</div>
                    <div><strong>URL:</strong> {wsUrl}</div>
                    {wsTestError && <div className="mt-2 text-red-500"><strong>Error:</strong> {wsTestError}</div>}
                  </div>
                  <div className="mt-2 space-x-2">
                    <Button 
                      onClick={testWebSocketConnection} 
                      variant="outline" 
                      size="sm"
                      disabled={wsTestStatus === 'connecting'}
                    >
                      Test Connection
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => window.history.back()}>
                  Back
                </Button>
                <Button variant="default" onClick={reload}>
                  Reload Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}