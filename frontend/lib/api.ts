/**
 * API client for BioThings AI Platform
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export interface Agent {
  id: string;
  name: string;
  agent_type: string;
  status: 'idle' | 'active' | 'thinking' | 'executing' | 'offline';
  parent_id?: string;
  subordinates: string[];
  department: string;
  last_active: string;
  capabilities?: string[];
}

export interface AgentHierarchy {
  id: string;
  name: string;
  type: string;
  status: string;
  department: string;
  subordinates: AgentHierarchy[];
}

export interface SystemMetrics {
  timestamp: string;
  system: {
    cpu_percent: number;
    memory_percent: number;
    memory_used_gb: number;
    memory_total_gb: number;
  };
  agents: {
    total_agents: number;
    active_agents: number;
    agent_types: Record<string, number>;
  };
  websocket_connections: number;
}

export interface Workflow {
  id: string;
  name: string;
  workflow_type: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
  assigned_agents: string[];
  stages?: Array<{
    name: string;
    status: string;
  }>;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: string;
}

export interface Message {
  message_id: string;
  sender_id: string;
  recipient_id?: string;
  message_type: string;
  payload: any;
  timestamp: string;
  priority?: string;
}

class ApiClient {
  private wsConnection: WebSocket | null = null;
  private wsCallbacks: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // HTTP Methods
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Agent APIs
  async getAgents(): Promise<Agent[]> {
    return this.fetch<Agent[]>('/api/agents');
  }
  
  async getAgent(agentId: string): Promise<Agent> {
    return this.fetch<Agent>(`/api/agents/${agentId}`);
  }
  
  async sendCommandToAgent(agentId: string, command: string, parameters?: any): Promise<any> {
    return this.fetch(`/api/agents/${agentId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command, parameters }),
    });
  }
  
  async getAgentHierarchy(): Promise<AgentHierarchy> {
    return this.fetch<AgentHierarchy>('/api/hierarchy');
  }
  
  // Monitoring APIs
  async getCurrentMetrics(): Promise<SystemMetrics> {
    return this.fetch<SystemMetrics>('/api/monitoring/metrics/current');
  }
  
  async getAlerts(): Promise<Alert[]> {
    return this.fetch<Alert[]>('/api/monitoring/alerts');
  }
  
  // Workflow APIs
  async getWorkflows(): Promise<Workflow[]> {
    return this.fetch<Workflow[]>('/api/workflows');
  }
  
  async simulateWorkflow(type: string): Promise<any> {
    return this.fetch('/api/workflows/simulate', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }
  
  // Message History
  async getMessageHistory(limit: number = 50): Promise<Message[]> {
    return this.fetch<Message[]>(`/api/messages/history?limit=${limit}`);
  }
  
  // WebSocket Methods
  connectWebSocket(clientId: string): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.wsConnection = new WebSocket(`${WS_URL}/ws/${clientId}`);
    
    this.wsConnection.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Start heartbeat
      this.startHeartbeat();
    };
    
    this.wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types
        if (data.type === 'connection') {
          console.log('WebSocket connection confirmed:', data);
        } else if (data.type === 'pong') {
          // Heartbeat response
        } else {
          // Dispatch to registered callbacks
          this.wsCallbacks.forEach((callback) => {
            callback(data);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.wsConnection.onclose = () => {
      console.log('WebSocket disconnected');
      this.stopHeartbeat();
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`);
          this.connectWebSocket(clientId);
        }, 2000 * this.reconnectAttempts);
      }
    };
  }
  
  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.stopHeartbeat();
  }
  
  onWebSocketMessage(callback: (data: any) => void): () => void {
    const id = Math.random().toString(36).substr(2, 9);
    this.wsCallbacks.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.wsCallbacks.delete(id);
    };
  }
  
  sendWebSocketMessage(message: any): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }
  
  // Heartbeat to keep connection alive
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send('ping');
      }
    }, 30000); // Every 30 seconds
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Export singleton instance
export const api = new ApiClient();