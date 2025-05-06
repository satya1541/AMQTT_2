import mqtt, { IClientOptions, MqttClient } from 'mqtt';

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

export class MqttClientManager {
  private client: MqttClient | null = null;
  private messageHandlers: ((message: MqttMessage) => void)[] = [];
  private statusHandlers: ((status: string, error?: Error) => void)[] = [];

  connect(options: MqttConnectionOptions): Promise<MqttClient> {
    return new Promise((resolve, reject) => {
      try {
        // Close any existing connection
        if (this.client) {
          this.client.end(true);
        }

        const clientId = options.clientId || `mqtt-explorer-${Math.random().toString(16).substr(2, 8)}`;
        
        const mqttOptions: IClientOptions = {
          clientId,
          username: options.username,
          password: options.password,
          clean: options.clean !== undefined ? options.clean : true,
          reconnectPeriod: options.reconnectPeriod || 5000, // Auto reconnect after 5 seconds
        };

        this.notifyStatusChange('connecting');
        
        this.client = mqtt.connect(options.brokerUrl, mqttOptions);
        
        this.client.on('connect', () => {
          this.notifyStatusChange('connected');
          resolve(this.client!);
        });
        
        this.client.on('message', (topic, payload, packet) => {
          const message: MqttMessage = {
            topic,
            payload: payload.toString(),
            timestamp: Date.now(),
            qos: packet.qos as 0 | 1 | 2,
            retain: packet.retain,
            isSys: topic.startsWith('$SYS/')
          };
          
          this.notifyMessageReceived(message);
        });
        
        this.client.on('error', (err) => {
          this.notifyStatusChange('error', err);
          reject(err);
        });
        
        this.client.on('close', () => {
          this.notifyStatusChange('disconnected');
        });
        
        this.client.on('reconnect', () => {
          this.notifyStatusChange('reconnecting');
        });
        
      } catch (error) {
        this.notifyStatusChange('error', error as Error);
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.notifyStatusChange('disconnected');
    }
  }
  
  subscribe(topic: string, qos: 0 | 1 | 2 = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      this.client.subscribe(topic, { qos }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      this.client.unsubscribe(topic, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  
  publish(topic: string, message: string, options: { qos?: 0 | 1 | 2, retain?: boolean } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }
      
      this.client.publish(
        topic, 
        message, 
        { 
          qos: options.qos !== undefined ? options.qos : 0, 
          retain: options.retain !== undefined ? options.retain : false 
        }, 
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
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
  
  getClient(): MqttClient | null {
    return this.client;
  }
  
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }
}

// Singleton instance
export const mqttClient = new MqttClientManager();
