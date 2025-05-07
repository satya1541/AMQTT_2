import OpenAI from 'openai';
import { MqttMessage } from '../client/src/hooks/use-mqtt';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Convert a number to a more human-friendly representation
function humanReadableNumber(value: number): string {
  if (value === undefined || value === null) return 'N/A';
  
  // For very small numbers
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(2);
  }
  
  // For regular numbers
  return value.toLocaleString(undefined, { 
    maximumFractionDigits: 2 
  });
}

// Interface for the statistics we calculate
interface MessageStats {
  messageCount: number;
  topicCounts: { [topic: string]: number };
  payloadSizes: { min: number, max: number, avg: number };
  numericValues: { [key: string]: { min: number, max: number, avg: number, count: number, recent: number[] } };
  messageFrequency: { perMinute: number, perHour: number };
  topicPattern?: string;
  messageTypes: { json: number, string: number, numeric: number, boolean: number, other: number };
  timeRangeMinutes: number;
}

export interface AiInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
}

// Extract all paths from a nested object (for JSON payload analysis)
function extractPaths(obj: any, prefix = '', result: { [key: string]: any } = {}): { [key: string]: any } {
  if (!obj || typeof obj !== 'object') return result;
  
  Object.keys(obj).forEach(key => {
    const newPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'number') {
      result[newPath] = value;
    }
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      extractPaths(value, newPath, result);
    }
  });
  
  return result;
}

// Calculate statistics from an array of MQTT messages
function calculateStats(messages: MqttMessage[]): MessageStats {
  // Initialize statistics object
  const stats: MessageStats = {
    messageCount: messages.length,
    topicCounts: {},
    payloadSizes: { min: Infinity, max: 0, avg: 0 },
    numericValues: {},
    messageFrequency: { perMinute: 0, perHour: 0 },
    messageTypes: { json: 0, string: 0, numeric: 0, boolean: 0, other: 0 },
    timeRangeMinutes: 0
  };
  
  // Skip if no messages
  if (messages.length === 0) return stats;
  
  // Track total message sizes for average calculation
  let totalSize = 0;
  
  // Find earliest and latest message timestamps for frequency calculation
  const timestamps = messages.map(msg => msg.timestamp);
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  const timeRange = (latest - earliest) / 1000; // in seconds
  stats.timeRangeMinutes = timeRange / 60;
  
  // Calculate message frequency if we have a reasonable time range
  if (timeRange > 0) {
    stats.messageFrequency.perMinute = (messages.length / timeRange) * 60;
    stats.messageFrequency.perHour = stats.messageFrequency.perMinute * 60;
  }
  
  // Process each message
  messages.forEach(message => {
    // Count by topic
    if (!stats.topicCounts[message.topic]) {
      stats.topicCounts[message.topic] = 0;
    }
    stats.topicCounts[message.topic]++;
    
    // Analyze payload
    const payloadSize = message.payload.length;
    totalSize += payloadSize;
    
    // Update min/max payload size
    stats.payloadSizes.min = Math.min(stats.payloadSizes.min, payloadSize);
    stats.payloadSizes.max = Math.max(stats.payloadSizes.max, payloadSize);
    
    // Detect payload type
    try {
      // Try to parse as JSON
      const payloadData = JSON.parse(message.payload);
      stats.messageTypes.json++;
      
      // Extract numeric values from JSON payload
      const numericFields = extractPaths(payloadData);
      
      // Update stats for each numeric field
      Object.entries(numericFields).forEach(([path, value]) => {
        if (typeof value === 'number') {
          if (!stats.numericValues[path]) {
            stats.numericValues[path] = {
              min: Infinity,
              max: -Infinity,
              avg: 0,
              count: 0,
              recent: []
            };
          }
          
          const fieldStats = stats.numericValues[path];
          fieldStats.min = Math.min(fieldStats.min, value);
          fieldStats.max = Math.max(fieldStats.max, value);
          fieldStats.count++;
          fieldStats.avg = ((fieldStats.avg * (fieldStats.count - 1)) + value) / fieldStats.count;
          
          // Keep last 5 values
          fieldStats.recent.push(value);
          if (fieldStats.recent.length > 5) {
            fieldStats.recent.shift();
          }
        }
      });
    } catch {
      // Not JSON, try other types
      const payload = message.payload.trim().toLowerCase();
      
      // Check if numeric
      if (!isNaN(Number(payload))) {
        stats.messageTypes.numeric++;
        
        // Add to numeric values stats
        const numValue = Number(payload);
        const path = message.topic; // Use topic as key for non-JSON messages
        
        if (!stats.numericValues[path]) {
          stats.numericValues[path] = {
            min: Infinity,
            max: -Infinity,
            avg: 0,
            count: 0,
            recent: []
          };
        }
        
        const fieldStats = stats.numericValues[path];
        fieldStats.min = Math.min(fieldStats.min, numValue);
        fieldStats.max = Math.max(fieldStats.max, numValue);
        fieldStats.count++;
        fieldStats.avg = ((fieldStats.avg * (fieldStats.count - 1)) + numValue) / fieldStats.count;
        
        // Keep last 5 values
        fieldStats.recent.push(numValue);
        if (fieldStats.recent.length > 5) {
          fieldStats.recent.shift();
        }
      }
      // Check if boolean
      else if (payload === 'true' || payload === 'false') {
        stats.messageTypes.boolean++;
      }
      // Otherwise treat as string
      else {
        stats.messageTypes.string++;
      }
    }
  });
  
  // Finalize average payload size
  if (messages.length > 0) {
    stats.payloadSizes.avg = totalSize / messages.length;
  }
  
  // Fix Infinity values if no data points
  if (stats.payloadSizes.min === Infinity) stats.payloadSizes.min = 0;
  
  Object.values(stats.numericValues).forEach(stat => {
    if (stat.min === Infinity) stat.min = 0;
    if (stat.max === -Infinity) stat.max = 0;
  });
  
  return stats;
}

// Generate insights about MQTT messages using OpenAI
export async function generateMqttInsights(messages: MqttMessage[]): Promise<AiInsight[]> {
  if (messages.length === 0) {
    return [{ type: 'info', message: 'No messages available for analysis. Connect to an MQTT broker and subscribe to some topics to start receiving data.' }];
  }
  
  // Calculate statistics from messages
  const stats = calculateStats(messages);
  
  // Create a prompt with the most important analytics
  const prompt = `
You are an MQTT data analyst. Analyze these MQTT message statistics and provide 3-5 concise, specific insights. 
Format each insight on a new line with either SUCCESS:, INFO:, or WARNING: prefix.

Data Statistics:
- ${stats.messageCount} messages across ${Object.keys(stats.topicCounts).length} topics over ${stats.timeRangeMinutes.toFixed(1)} minutes
- Message frequency: ${stats.messageFrequency.perMinute.toFixed(1)}/minute
- Payload types: ${stats.messageTypes.json} JSON, ${stats.messageTypes.numeric} numeric, ${stats.messageTypes.string} text
- Payload size: avg ${stats.payloadSizes.avg.toFixed(0)} bytes, max ${stats.payloadSizes.max} bytes

Topics:
${Object.entries(stats.topicCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([topic, count]) => `- ${topic}: ${count} messages`)
  .join('\n')}

Numeric values:
${Object.entries(stats.numericValues)
  .slice(0, 5)
  .map(([path, data]) => `- ${path}: min=${humanReadableNumber(data.min)}, max=${humanReadableNumber(data.max)}, avg=${humanReadableNumber(data.avg)}, recent=[${data.recent.map(v => humanReadableNumber(v)).join(', ')}]`)
  .join('\n')}

Guidelines:
1. Identify patterns or anomalies in the data
2. Comment on message frequencies and distribution
3. Note unusual numeric values or trends
4. Offer concise, technically useful insights
5. Keep each insight under 100 characters
6. Focus on what would be most useful to an IoT developer
  `;
  
  try {
    // Make the OpenAI API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an MQTT messaging expert providing concise technical insights about data patterns." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // More deterministic responses
      max_tokens: 400
    });
    
    // Process the response into an array of insights
    const content = response.choices[0].message.content;
    if (!content) {
      return [{ type: 'warning', message: 'Unable to generate insights at this time.' }];
    }
    
    // Parse the insights from the content
    return content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const lowerLine = line.toLowerCase();
        let type: 'success' | 'warning' | 'info' = 'info';
        let message = line;
        
        if (lowerLine.startsWith('success:')) {
          type = 'success';
          message = line.substring(8).trim();
        } else if (lowerLine.startsWith('warning:')) {
          type = 'warning';
          message = line.substring(8).trim();
        } else if (lowerLine.startsWith('info:')) {
          type = 'info';
          message = line.substring(5).trim();
        }
        
        return { type, message };
      })
      .filter(insight => insight.message.length > 0);
      
  } catch (error) {
    console.error('Error generating MQTT insights:', error);
    return [{ 
      type: 'warning', 
      message: 'Error analyzing messages. Please check your OpenAI API key and try again.'
    }];
  }
}

// Generate recommendations for improving the MQTT system
export async function generateMqttRecommendations(messages: MqttMessage[]): Promise<string[]> {
  if (messages.length === 0) {
    return ['Start by connecting to an MQTT broker and subscribing to topics to collect data.'];
  }
  
  const stats = calculateStats(messages);
  
  const prompt = `
You are an MQTT best practices expert. Based on these statistics about an MQTT system, provide 3-4 specific recommendations for optimizing the system.

Data Statistics:
- ${stats.messageCount} messages across ${Object.keys(stats.topicCounts).length} topics
- Message frequency: ${stats.messageFrequency.perMinute.toFixed(1)}/minute
- Payload types: ${stats.messageTypes.json} JSON, ${stats.messageTypes.numeric} numeric, ${stats.messageTypes.string} text
- Payload size: avg ${stats.payloadSizes.avg.toFixed(0)} bytes, max ${stats.payloadSizes.max} bytes

Topic structure:
${Object.keys(stats.topicCounts).slice(0, 8).join('\n')}

Focus on:
1. Topic organization and naming conventions
2. Payload size optimization
3. QoS level recommendations
4. Message frequency optimization
5. Security considerations

Provide technically specific, concise recommendations that would help an IoT developer improve this system.
Each recommendation should be 1-2 sentences at most.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an MQTT optimization expert providing technical recommendations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 350
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      return ['Unable to generate recommendations at this time.'];
    }
    
    // Split the response by newlines and filter out empty lines
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
  } catch (error) {
    console.error('Error generating MQTT recommendations:', error);
    return ['Error generating recommendations. Please check your OpenAI API key and try again.'];
  }
}

// Analyze a specific MQTT topic pattern to provide insights
export async function analyzeMqttTopicPattern(topics: string[]): Promise<string> {
  if (topics.length === 0) {
    return "No topics available for analysis.";
  }
  
  const topicsText = topics.join('\n');
  
  const prompt = `
As an MQTT topic design expert, analyze these topics and provide a brief analysis of their structure and organization.
Focus on best practices, hierarchy, and potential improvements.

Topics:
${topicsText}

Provide a concise analysis (max 3 sentences) on the quality and organization of these topic names.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an MQTT topic design expert providing concise technical feedback." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 150
    });
    
    return response.choices[0].message.content || "Unable to analyze topic patterns.";
  } catch (error) {
    console.error('Error analyzing MQTT topic pattern:', error);
    return "Error analyzing topic pattern. Please check your OpenAI API key.";
  }
}