export interface MqttMessage {
  topic: string;
  payload: any;
  timestamp: number;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  isSys?: boolean;
}

export interface MqttConnectionOptions {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  clean?: boolean;
  qos?: 0 | 1 | 2;
  reconnectPeriod?: number;
}

export class WebSocketMqttClient {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: MqttMessage) => void)[] = [];
  private statusHandlers: ((status: string, error?: Error) => void)[] = [];
  private connectionOptions: MqttConnectionOptions | null = null;
  private subscriptions: Map<string, number> = new Map(); // topic -> qos
  private connected: boolean = false;

  connect(options: MqttConnectionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close any existing connection
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.disconnect();
        }

        // Store connection options for reconnection
        this.connectionOptions = options;

        // Notify status change
        this.notifyStatusChange('connecting');
        
        // Connect to WebSocket server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`Connecting to WebSocket server at ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          // Send connect message to broker via WebSocket
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'connect',
              brokerUrl: options.brokerUrl,
              clientId: options.clientId || `mqtt-explorer-${Math.random().toString(16).substring(2, 10)}`,
              username: options.username,
              password: options.password,
              clean: options.clean !== undefined ? options.clean : true,
              reconnectPeriod: options.reconnectPeriod || 5000,
            }));
          }
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'info':
                console.log('WebSocket info:', data.message);
                break;
                
              case 'mqtt-connected':
                console.log('MQTT client connected to broker');
                this.connected = true;
                this.notifyStatusChange('connected');
                
                // Resubscribe to topics after reconnection
                this.resubscribeToTopics();
                resolve();
                break;
                
              case 'mqtt-reconnecting':
                console.log('MQTT client reconnecting');
                this.notifyStatusChange('reconnecting');
                break;
                
              case 'mqtt-disconnected':
                console.log('MQTT client disconnected');
                this.connected = false;
                this.notifyStatusChange('disconnected');
                break;
                
              case 'mqtt-offline':
                console.log('MQTT client offline');
                this.connected = false;
                this.notifyStatusChange('offline');
                break;
                
              case 'mqtt-error':
                console.error('MQTT error:', data.error);
                this.notifyStatusChange('error', new Error(data.error));
                reject(new Error(data.error));
                break;
                
              case 'mqtt-message':
                const message: MqttMessage = {
                  topic: data.topic,
                  payload: data.payload,
                  timestamp: data.timestamp,
                  qos: data.qos,
                  retain: data.retain,
                  isSys: data.topic.startsWith('$SYS/')
                };
                this.notifyMessageReceived(message);
                break;
                
              case 'mqtt-subscribed':
                console.log(`Subscribed to topic: ${data.topic} with QoS: ${data.qos}`);
                this.subscriptions.set(data.topic, data.qos);
                break;
                
              case 'mqtt-unsubscribed':
                console.log(`Unsubscribed from topic: ${data.topic}`);
                this.subscriptions.delete(data.topic);
                break;
                
              case 'mqtt-published':
                console.log(`Published message to topic: ${data.topic}`);
                break;
                
              case 'error':
                console.error('WebSocket error:', data.message);
                this.notifyStatusChange('error', new Error(data.message));
                reject(new Error(data.message));
                break;
                
              default:
                console.warn('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            this.notifyStatusChange('error', error as Error);
            reject(error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.connected = false;
          this.notifyStatusChange('disconnected');
          
          // Auto reconnect after 5 seconds
          setTimeout(() => {
            if (this.connectionOptions) {
              this.connect(this.connectionOptions).catch(console.error);
            }
          }, 5000);
        };
        
        this.ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          this.notifyStatusChange('error', new Error('WebSocket error'));
          reject(new Error('WebSocket error'));
        };
        
      } catch (error) {
        console.error('Error connecting to MQTT broker:', error);
        this.notifyStatusChange('error', error as Error);
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send disconnect message to MQTT broker via WebSocket
      this.ws.send(JSON.stringify({ type: 'disconnect' }));
      
      // Close WebSocket connection
      this.ws.close();
      this.ws = null;
      this.connected = false;
      this.notifyStatusChange('disconnected');
    }
  }
  
  subscribe(topic: string, qos: 0 | 1 | 2 = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }
      
      if (!this.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      // Send subscribe message to MQTT broker via WebSocket
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        topic,
        qos
      }));
      
      // Store subscription locally
      this.subscriptions.set(topic, qos);
      
      resolve();
    });
  }
  
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }
      
      if (!this.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      // Send unsubscribe message to MQTT broker via WebSocket
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        topic
      }));
      
      // Remove subscription locally
      this.subscriptions.delete(topic);
      
      resolve();
    });
  }
  
  publish(topic: string, message: string, options: { qos?: 0 | 1 | 2, retain?: boolean } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }
      
      if (!this.connected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      // Send publish message to MQTT broker via WebSocket
      this.ws.send(JSON.stringify({
        type: 'publish',
        topic,
        message,
        qos: options.qos !== undefined ? options.qos : 0,
        retain: options.retain !== undefined ? options.retain : false
      }));
      
      resolve();
    });
  }
  
  // Resubscribe to all topics after reconnection
  private resubscribeToTopics(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connected) {
      return;
    }
    
    // Resubscribe to all topics
    this.subscriptions.forEach((qos, topic) => {
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        topic,
        qos
      }));
    });
  }
  
  onMessage(handler: (message: MqttMessage) => void): () => void {
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
  
  onStatusChange(handler: (status: string, error?: Error) => void): () => void {
    this.statusHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }
  
  private notifyMessageReceived(message: MqttMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }
  
  private notifyStatusChange(status: string, error?: Error): void {
    this.statusHandlers.forEach(handler => handler(status, error));
  }
  
  getActiveSubscriptions(): Map<string, number> {
    return new Map(this.subscriptions);
  }
  
  isConnected(): boolean {
    return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const mqttClient = new WebSocketMqttClient();
