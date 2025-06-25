export interface SystemMetrics {
  system: {
    cpu_percent: number;
    memory_percent: number;
    disk_usage_percent?: number;
    network_io?: {
      bytes_sent: number;
      bytes_recv: number;
    };
  };
  agents: {
    total_agents: number;
    active_agents: number;
    agent_types?: Record<string, number>;
  };
  websocket_connections?: number;
  timestamp: string;
}

export const createMetrics = (overrides: Partial<SystemMetrics> = {}): SystemMetrics => {
  const baseMetrics: SystemMetrics = {
    system: {
      cpu_percent: 40 + Math.random() * 30, // 40-70%
      memory_percent: 50 + Math.random() * 20, // 50-70%
      disk_usage_percent: 30 + Math.random() * 20, // 30-50%
      network_io: {
        bytes_sent: Math.floor(Math.random() * 1000000),
        bytes_recv: Math.floor(Math.random() * 2000000),
      },
    },
    agents: {
      total_agents: 10,
      active_agents: 7,
      agent_types: {
        CEO: 1,
        CTO: 1,
        CFO: 1,
        Lab: 7,
      },
    },
    websocket_connections: 3,
    timestamp: new Date().toISOString(),
  };

  return {
    ...baseMetrics,
    ...overrides,
    system: { ...baseMetrics.system, ...overrides.system },
    agents: { ...baseMetrics.agents, ...overrides.agents },
  };
};

export const createMetricsHistory = (count: number = 30): SystemMetrics[] => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date(now - (count - i - 1) * 60000).toISOString();
    return createMetrics({ timestamp });
  });
};

export const createCriticalMetrics = (): SystemMetrics => 
  createMetrics({
    system: {
      cpu_percent: 95,
      memory_percent: 88,
      disk_usage_percent: 92,
    },
  });

export const createHealthyMetrics = (): SystemMetrics => 
  createMetrics({
    system: {
      cpu_percent: 25,
      memory_percent: 40,
      disk_usage_percent: 35,
    },
  });