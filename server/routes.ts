import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import * as mqtt from 'mqtt';
import { PacketCallback } from 'mqtt';
import os from 'os';

interface MqttClientConnection {
  client: mqtt.MqttClient;
  topics: Set<string>;
}

interface BrokerMessage {
  type: string;
  [key: string]: any;
}

// Map to store MQTT client connections by WebSocket instance
const mqttConnections = new Map<WebSocket, MqttClientConnection>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server with a distinct path (to avoid conflict with Vite HMR)
  console.log('Setting up WebSocket server on path: /ws');
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true,
    // Allow all origins
    verifyClient: ({ origin, req, secure }, callback) => {
      console.log(`WebSocket connection attempt from origin: ${origin || 'unknown'}`);
      // Allow all connections
      callback(true);
    }
  });
  
  // Track WebSocket server events
  wss.on('listening', () => {
    console.log('WebSocket server is listening');
  });
  
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });
  
  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}, URL: ${req.url}`);
    
    // Log connection headers for debugging
    console.log('WebSocket connection headers:', {
      origin: req.headers.origin,
      host: req.headers.host,
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      secWebSocketKey: req.headers['sec-websocket-key'] ? 'present' : 'missing',
      secWebSocketVersion: req.headers['sec-websocket-version'],
      secWebSocketProtocol: req.headers['sec-websocket-protocol']
    });
    
    // Send a welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'info',
        message: 'Connected to MQTT Explorer WebSocket server',
        timestamp: Date.now()
      }));
    }
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data: BrokerMessage = JSON.parse(message.toString());
        console.log('Received message:', data.type);
        
        switch (data.type) {
          case 'ping':
            // Respond to ping messages immediately for testing
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now(),
                receivedTimestamp: data.timestamp,
                id: data.id || 'unknown'
              }));
            }
            break;
          case 'connect':
            handleMqttConnect(ws, data);
            break;
          case 'disconnect':
            handleMqttDisconnect(ws);
            break;
          case 'subscribe':
            handleMqttSubscribe(ws, data);
            break;
          case 'unsubscribe':
            handleMqttUnsubscribe(ws, data);
            break;
          case 'publish':
            handleMqttPublish(ws, data);
            break;
          default:
            console.warn('Unknown message type:', data.type);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${data.type}`
              }));
            }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Error processing message'
          }));
        }
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      handleMqttDisconnect(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      handleMqttDisconnect(ws);
    });
  });
  
  function handleMqttConnect(ws: WebSocket, data: BrokerMessage) {
    // Check if there's already a connection for this WebSocket
    if (mqttConnections.has(ws)) {
      handleMqttDisconnect(ws);
    }
    
    try {
      console.log(`Connecting to MQTT broker: ${data.brokerUrl}`);
      
      // Create MQTT client
      const mqttClient = mqtt.connect(data.brokerUrl, {
        clientId: data.clientId || `mqtt-explorer-${Math.random().toString(16).substring(2, 10)}`,
        username: data.username,
        password: data.password,
        clean: data.clean !== undefined ? data.clean : true,
        reconnectPeriod: data.reconnectPeriod || 5000,
      });
      
      // Store connection
      mqttConnections.set(ws, {
        client: mqttClient,
        topics: new Set()
      });
      
      // Handle MQTT connection events
      mqttClient.on('connect', () => {
        console.log('MQTT client connected to broker');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-connected'
          }));
        }
      });
      
      mqttClient.on('reconnect', () => {
        console.log('MQTT client reconnecting');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-reconnecting'
          }));
        }
      });
      
      mqttClient.on('error', (err) => {
        console.error('MQTT client error:', err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-error',
            error: err.message
          }));
        }
      });
      
      mqttClient.on('offline', () => {
        console.log('MQTT client offline');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-offline'
          }));
        }
      });
      
      mqttClient.on('close', () => {
        console.log('MQTT client connection closed');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-disconnected'
          }));
        }
      });
      
      mqttClient.on('message', (topic, payload, packet) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'mqtt-message',
            topic,
            payload: payload.toString(),
            qos: packet.qos,
            retain: packet.retain,
            timestamp: Date.now()
          }));
        }
      });
      
    } catch (error: any) {
      console.error('Error connecting to MQTT broker:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: error.message
        }));
      }
    }
  }
  
  function handleMqttDisconnect(ws: WebSocket) {
    const connection = mqttConnections.get(ws);
    if (connection) {
      try {
        connection.client.end(true);
        console.log('MQTT client disconnected');
      } catch (error) {
        console.error('Error disconnecting MQTT client:', error);
      }
      mqttConnections.delete(ws);
    }
  }
  
  function handleMqttSubscribe(ws: WebSocket, data: BrokerMessage) {
    const connection = mqttConnections.get(ws);
    if (!connection) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: 'Not connected to MQTT broker'
        }));
      }
      return;
    }
    
    const topic = data.topic;
    const qos = data.qos || 0;
    
    try {
      connection.client.subscribe(topic, { qos }, function(err: any, granted: any) {
        const error = err ? new Error(err.message || 'Unknown error') : null;
        if (err) {
          console.error('Error subscribing to topic:', err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-error',
              error: `Failed to subscribe to ${topic}: ${err.message}`
            }));
          }
        } else {
          console.log(`Subscribed to topic: ${topic} with QoS ${qos}`);
          connection.topics.add(topic);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-subscribed',
              topic,
              qos
            }));
          }
        }
      });
    } catch (error: any) {
      console.error('Error subscribing to topic:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: `Failed to subscribe to ${topic}: ${error.message}`
        }));
      }
    }
  }
  
  function handleMqttUnsubscribe(ws: WebSocket, data: BrokerMessage) {
    const connection = mqttConnections.get(ws);
    if (!connection) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: 'Not connected to MQTT broker'
        }));
      }
      return;
    }
    
    const topic = data.topic;
    
    try {
      connection.client.unsubscribe(topic, function(err: any) {
        const error = err ? new Error(err.message || 'Unknown error') : null;
        if (error) {
          console.error('Error unsubscribing from topic:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-error',
              error: `Failed to unsubscribe from ${topic}: ${error.message}`
            }));
          }
        } else {
          console.log(`Unsubscribed from topic: ${topic}`);
          connection.topics.delete(topic);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-unsubscribed',
              topic
            }));
          }
        }
      });
    } catch (error: any) {
      console.error('Error unsubscribing from topic:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: `Failed to unsubscribe from ${topic}: ${error.message}`
        }));
      }
    }
  }
  
  function handleMqttPublish(ws: WebSocket, data: BrokerMessage) {
    const connection = mqttConnections.get(ws);
    if (!connection) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: 'Not connected to MQTT broker'
        }));
      }
      return;
    }
    
    const topic = data.topic;
    const message = data.message;
    const qos = data.qos || 0;
    const retain = data.retain || false;
    
    try {
      connection.client.publish(topic, message, { qos, retain }, function(err: any) {
        const error = err ? new Error(err.message || 'Unknown error') : null;
        if (error) {
          console.error('Error publishing message:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-error',
              error: `Failed to publish to ${topic}: ${error.message}`
            }));
          }
        } else {
          console.log(`Published message to topic: ${topic}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'mqtt-published',
              topic,
              timestamp: Date.now()
            }));
          }
        }
      });
    } catch (error: any) {
      console.error('Error publishing message:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-error',
          error: `Failed to publish to ${topic}: ${error.message}`
        }));
      }
    }
  }
  
  // API routes
  app.get('/api/status', (req, res) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      connections: {
        websocket: wss.clients.size,
        mqtt: mqttConnections.size
      },
      websocket: {
        server: 'active',
        path: '/ws'
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          rss: formatBytes(memory.rss),
          heapTotal: formatBytes(memory.heapTotal),
          heapUsed: formatBytes(memory.heapUsed),
          external: formatBytes(memory.external)
        },
        cpus: os.cpus().length,
        hostname: os.hostname()
      }
    });
  });
  
  // WebSocket health check endpoint
  app.get('/api/ws-check', (req, res) => {
    // Check if WebSocket server is actually responding to a ping
    let serverResponsive = false;
    try {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
          serverResponsive = true;
        }
      });
    } catch (error) {
      console.error('Error pinging WebSocket clients:', error);
    }
    
    // Get client connection info for debugging
    const clientInfo: Array<{
      readyState: number;
      readyStateString: string;
      protocol: string;
      hasMqttConnection: boolean;
    }> = [];
    
    wss.clients.forEach(client => {
      clientInfo.push({
        readyState: client.readyState,
        readyStateString: getReadyStateString(client.readyState),
        protocol: client.protocol || '',
        hasMqttConnection: mqttConnections.has(client)
      });
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      websocket_server: 'active',
      websocket_responsive: serverResponsive || wss.clients.size === 0,
      clients_connected: wss.clients.size,
      path: '/ws',
      mqtt_connections: mqttConnections.size,
      client_details: clientInfo
    });
  });
  
  // Simple ping endpoint for easy connection testing
  app.get('/api/ping', (req, res) => {
    res.json({ 
      pong: true,
      timestamp: Date.now(),
      formatted: new Date().toISOString()
    });
  });
  
  // Test WebSocket echo endpoint
  app.get('/api/ws-test', (req, res) => {
    const testId = Date.now().toString(36);
    try {
      // Create a test WebSocket connection to ourselves
      const protocol = req.protocol === 'https' ? 'wss' : 'ws';
      const host = req.headers.host || 'localhost:5000';
      const wsUrl = `${protocol}://${host}/ws`;
      
      res.json({
        test_id: testId,
        status: 'starting',
        ws_url: wsUrl,
        message: 'WebSocket test initiated. This endpoint only creates the test; check logs for results.'
      });
      
      // We're not actually creating a test WebSocket here because it's complex to do
      // from the server to itself and would require additional libraries
      console.log(`WebSocket test ${testId} would connect to ${wsUrl}`);
    } catch (error: unknown) {
      console.error(`WebSocket test ${testId} failed:`, error);
      res.status(500).json({
        test_id: testId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Helper functions for formatting
  function formatUptime(uptime: number): string {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function getReadyStateString(readyState: number): string {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  return httpServer;
}
