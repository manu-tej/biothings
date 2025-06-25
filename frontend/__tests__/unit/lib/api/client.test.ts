import { apiClient } from '@/lib/api/client';
import nock from 'nock';

describe('API Client', () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
  });

  describe('getAgents', () => {
    it('should fetch agents successfully', async () => {
      const mockAgents = [
        {
          id: 'ceo-001',
          name: 'CEO Agent',
          agent_type: 'CEO',
          status: 'active',
          department: 'Executive',
        },
      ];

      nock(API_BASE_URL)
        .get('/api/agents')
        .reply(200, mockAgents);

      const agents = await apiClient.getAgents();
      expect(agents).toEqual(mockAgents);
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/api/agents')
        .reply(500, { error: 'Internal Server Error' });

      await expect(apiClient.getAgents()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      nock(API_BASE_URL)
        .get('/api/agents')
        .replyWithError('Network error');

      await expect(apiClient.getAgents()).rejects.toThrow();
    });
  });

  describe('getWorkflows', () => {
    it('should fetch workflows successfully', async () => {
      const mockWorkflows = [
        {
          id: 'wf-001',
          name: 'PCR Protocol',
          status: 'running',
          progress: 0.65,
        },
      ];

      nock(API_BASE_URL)
        .get('/api/workflows')
        .reply(200, mockWorkflows);

      const workflows = await apiClient.getWorkflows();
      expect(workflows).toEqual(mockWorkflows);
    });

    it('should handle empty workflow list', async () => {
      nock(API_BASE_URL)
        .get('/api/workflows')
        .reply(200, []);

      const workflows = await apiClient.getWorkflows();
      expect(workflows).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should fetch system metrics successfully', async () => {
      const mockMetrics = {
        system: {
          cpu_percent: 45.5,
          memory_percent: 62.3,
        },
        agents: {
          total_agents: 10,
          active_agents: 7,
        },
        timestamp: new Date().toISOString(),
      };

      nock(API_BASE_URL)
        .get('/api/system/metrics')
        .reply(200, mockMetrics);

      const metrics = await apiClient.getMetrics();
      expect(metrics).toEqual(mockMetrics);
    });

    it('should retry on temporary failures', async () => {
      const mockMetrics = {
        system: { cpu_percent: 45.5, memory_percent: 62.3 },
      };

      // First attempt fails
      nock(API_BASE_URL)
        .get('/api/system/metrics')
        .reply(503, { error: 'Service Unavailable' });

      // Retry succeeds
      nock(API_BASE_URL)
        .get('/api/system/metrics')
        .reply(200, mockMetrics);

      const metrics = await apiClient.getMetrics();
      expect(metrics).toEqual(mockMetrics);
    });
  });

  describe('Request interceptors', () => {
    it('should add authorization header if token exists', async () => {
      // Mock localStorage
      const mockToken = 'test-jwt-token';
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => mockToken),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      nock(API_BASE_URL)
        .get('/api/agents')
        .matchHeader('authorization', `Bearer ${mockToken}`)
        .reply(200, []);

      await apiClient.getAgents();
    });

    it('should handle timeout errors', async () => {
      nock(API_BASE_URL)
        .get('/api/agents')
        .delay(30000) // Delay longer than timeout
        .reply(200, []);

      await expect(apiClient.getAgents()).rejects.toThrow();
    });
  });
});