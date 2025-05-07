import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import * as mqtt from 'mqtt';
import { PacketCallback } from 'mqtt';
import { generateMqttInsights, generateMqttRecommendations, analyzeMqttTopicPattern, AiInsight } from './openai-service';

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
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'info',
        message: 'Connected to MQTT Explorer WebSocket server'
      }));
    }
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data: BrokerMessage = JSON.parse(message.toString());
        console.log('Received message:', data.type);
        
        switch (data.type) {
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
      connection.client.subscribe(topic, { qos }, (err, granted) => {
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
      // Handle unsubscribe without callback
      connection.client.unsubscribe(topic);
      
      // Log unsubscribe locally
      console.log(`Unsubscribed from topic: ${topic}`);
      connection.topics.delete(topic);
      
      // Send confirmation to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-unsubscribed',
          topic
        }));
      }
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
      // Publish message without callback
      connection.client.publish(topic, message, { qos, retain });
      
      // Log locally
      console.log(`Published message to topic: ${topic}`);
      
      // Send confirmation to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'mqtt-published',
          topic,
          timestamp: Date.now()
        }));
      }
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
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      connections: {
        websocket: wss.clients.size,
        mqtt: mqttConnections.size
      }
    });
  });
  
  // AI Insights API endpoints
  
  // Type for the message data sent to AI analysis
  interface MessageForAnalysis {
    id: string;
    topic: string;
    payload: string;
    timestamp: number;
    retain?: boolean;
    qos?: number;
    isSys?: boolean;
  }
  
  // Generate AI insights from MQTT messages
  app.post('/api/insights/analyze', async (req: Request, res: Response) => {
    try {
      const messages: MessageForAnalysis[] = req.body.messages || [];
      
      if (messages.length === 0) {
        return res.json({
          insights: [{
            type: 'info',
            message: 'No messages provided for analysis. Subscribe to topics and collect some messages first.'
          }]
        });
      }
      
      console.log(`Analyzing ${messages.length} messages with AI...`);
      // Cast for type compatibility while maintaining structure
      const typedMessages = messages as unknown as import('../client/src/hooks/use-mqtt').MqttMessage[];
      const insights = await generateMqttInsights(typedMessages);
      
      return res.json({ insights });
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      return res.status(500).json({
        error: 'Failed to generate AI insights',
        message: error.message
      });
    }
  });
  
  // Get recommendations for MQTT system optimization
  app.post('/api/insights/recommendations', async (req: Request, res: Response) => {
    try {
      const messages: MessageForAnalysis[] = req.body.messages || [];
      
      if (messages.length === 0) {
        return res.json({
          recommendations: ['Start by connecting to an MQTT broker and subscribing to topics to collect data.']
        });
      }
      
      console.log(`Generating recommendations based on ${messages.length} messages...`);
      // Cast for type compatibility while maintaining structure
      const typedMessages = messages as unknown as import('../client/src/hooks/use-mqtt').MqttMessage[];
      const recommendations = await generateMqttRecommendations(typedMessages);
      
      return res.json({ recommendations });
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      return res.status(500).json({
        error: 'Failed to generate recommendations',
        message: error.message
      });
    }
  });
  
  // Analyze MQTT topic patterns
  app.post('/api/insights/topics', async (req: Request, res: Response) => {
    try {
      const topics: string[] = req.body.topics || [];
      
      if (topics.length === 0) {
        return res.json({
          analysis: 'No topics provided for analysis. Subscribe to some topics first.'
        });
      }
      
      console.log(`Analyzing ${topics.length} topic patterns...`);
      const analysis = await analyzeMqttTopicPattern(topics);
      
      return res.json({ analysis });
    } catch (error: any) {
      console.error('Error analyzing topic patterns:', error);
      return res.status(500).json({
        error: 'Failed to analyze topic patterns',
        message: error.message
      });
    }
  });

  return httpServer;
}
