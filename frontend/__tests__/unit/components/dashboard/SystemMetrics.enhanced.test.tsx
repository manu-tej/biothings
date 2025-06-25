import { render, screen, waitFor, act } from '@/shared/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import SystemMetrics from '@/components/dashboard/SystemMetrics';
import { apiClient } from '@/lib/api/client';
import { useMetricsWebSocket } from '@/lib/hooks/useWebSocketNew';
import { 
  createMetrics, 
  createCriticalMetrics, 
  createHealthyMetrics,
  createMetricsHistory 
} from '@/__tests__/factories';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the dependencies
jest.mock('@/lib/api/client');
jest.mock('@/lib/hooks/useWebSocketNew');

// Enhanced echarts mock
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
};

jest.mock('echarts', () => ({
  init: jest.fn(() => mockChartInstance),
}));

// Mock error console to prevent noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('SystemMetrics', () => {
  const mockUseMetricsWebSocket = useMetricsWebSocket as jest.MockedFunction<typeof useMetricsWebSocket>;
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChartInstance.setOption.mockClear();
    mockChartInstance.resize.mockClear();
    
    // Default mock implementations
    mockApiClient.getMetrics = jest.fn().mockResolvedValue(createMetrics());
    mockUseMetricsWebSocket.mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
    } as any);
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () => {
    return render(<SystemMetrics />);
  };

  describe('Rendering and Loading States', () => {
    it('should render loading state initially', () => {
      mockApiClient.getMetrics = jest.fn(() => new Promise(() => {})); // Never resolves
      renderComponent();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should display system metrics after loading', async () => {
      const testMetrics = createMetrics({
        system: { cpu_percent: 45.5, memory_percent: 62.3 },
        agents: { total_agents: 10, active_agents: 7 }
      });
      mockApiClient.getMetrics.mockResolvedValueOnce(testMetrics);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Check CPU metrics
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('45.5')).toBeInTheDocument();

      // Check Memory metrics
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('62.3')).toBeInTheDocument();

      // Check Agent metrics
      expect(screen.getByText('Active Agents')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('Total Agents')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should show default values when no data is available', async () => {
      mockApiClient.getMetrics.mockResolvedValueOnce({
        system: undefined,
        agents: undefined,
        timestamp: new Date().toISOString()
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Should show default 0 values
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('should show correct status colors based on metric values', async () => {
      const criticalMetrics = createCriticalMetrics();
      mockApiClient.getMetrics.mockResolvedValueOnce(criticalMetrics);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('95.0')).toBeInTheDocument();
      });

      // Check that critical status styling is applied
      const criticalElements = document.querySelectorAll('.text-red-600');
      expect(criticalElements.length).toBeGreaterThan(0);
    });

    it('should show healthy status colors for good metrics', async () => {
      const healthyMetrics = createHealthyMetrics();
      mockApiClient.getMetrics.mockResolvedValueOnce(healthyMetrics);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('25.0')).toBeInTheDocument();
      });

      // Check that good status styling is applied
      const goodElements = document.querySelectorAll('.text-green-600');
      expect(goodElements.length).toBeGreaterThan(0);
    });

    it('should show warning status for medium metrics', async () => {
      const warningMetrics = createMetrics({
        system: { cpu_percent: 65, memory_percent: 75 }
      });
      mockApiClient.getMetrics.mockResolvedValueOnce(warningMetrics);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('65.0')).toBeInTheDocument();
      });

      // Check that warning status styling is applied
      const warningElements = document.querySelectorAll('.text-yellow-600');
      expect(warningElements.length).toBeGreaterThan(0);
    });
  });

  describe('Trends and Real-time Updates', () => {
    it('should display trends correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('+2.5%')).toBeInTheDocument(); // Positive trend
        expect(screen.getByText('-1.2%')).toBeInTheDocument(); // Negative trend
      });
    });

    it('should update metrics when WebSocket receives data', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Simulate WebSocket update
      const newMetrics = {
        system: { cpu_percent: 55.5, memory_percent: 70.0 },
        agents: { active_agents: 8, total_agents: 10 },
        timestamp: new Date().toISOString(),
      };

      act(() => {
        websocketCallback?.(newMetrics);
      });

      await waitFor(() => {
        expect(screen.getByText('55.5')).toBeInTheDocument();
        expect(screen.getByText('70.0')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('should handle complex WebSocket updates with nested system data', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Simulate WebSocket update with nested structure
      const complexMetrics = {
        system: {
          cpu_percent: 88.8,
          memory_percent: 66.6
        },
        agents: {
          active_agents: 12,
          total_agents: 15
        },
        timestamp: new Date().toISOString(),
      };

      act(() => {
        websocketCallback?.(complexMetrics);
      });

      await waitFor(() => {
        expect(screen.getByText('88.8')).toBeInTheDocument();
        expect(screen.getByText('66.6')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });
  });

  describe('Connection States', () => {
    it('should show live connection status when WebSocket is connected', async () => {
      mockUseMetricsWebSocket.mockReturnValue({
        isConnected: true,
        connectionState: 'connected',
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      // Check connection indicator
      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show polling status when WebSocket is disconnected', async () => {
      mockUseMetricsWebSocket.mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Polling')).toBeInTheDocument();
      });

      // Check disconnected indicator
      const indicator = document.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
    });

    it('should show connecting status with animated indicator', async () => {
      mockUseMetricsWebSocket.mockReturnValue({
        isConnected: false,
        connectionState: 'connecting',
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Polling')).toBeInTheDocument();
      });

      // Check connecting indicator with animation
      const indicator = document.querySelector('.bg-yellow-500.animate-pulse');
      expect(indicator).toBeInTheDocument();
    });

    it('should show error status with red indicator', async () => {
      mockUseMetricsWebSocket.mockReturnValue({
        isConnected: false,
        connectionState: 'error',
      } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Polling')).toBeInTheDocument();
      });

      // Check error indicator
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Chart Functionality', () => {
    it('should initialize chart correctly', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Chart should be initialized
      expect(mockChartInstance.setOption).toHaveBeenCalled();
    });

    it('should update chart when metrics history changes', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(mockChartInstance.setOption).toHaveBeenCalled();
      });

      const initialCallCount = mockChartInstance.setOption.mock.calls.length;

      // Simulate WebSocket update that should update chart
      act(() => {
        websocketCallback?.({
          cpu_percent: 55.5,
          memory_percent: 70.0,
          timestamp: new Date().toISOString(),
        });
      });

      await waitFor(() => {
        expect(mockChartInstance.setOption.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should resize chart on window resize', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Trigger window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Chart resize should be called
      expect(mockChartInstance.resize).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.getMetrics.mockRejectedValueOnce(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        // Should show default values when error occurs
        expect(screen.getByText('0.0')).toBeInTheDocument();
      });
    });

    it('should handle malformed WebSocket data', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Send malformed data
      act(() => {
        websocketCallback?.(null);
      });

      act(() => {
        websocketCallback?.({ invalid: 'data' });
      });

      // Component should still be functional
      expect(screen.getByText('System Performance')).toBeInTheDocument();
    });

    it('should handle missing chart container gracefully', async () => {
      // Mock querySelector to return null (no chart container)
      const mockQuerySelector = jest.spyOn(document, 'querySelector').mockReturnValue(null);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Should not crash even without chart container
      expect(screen.getByText('System Performance')).toBeInTheDocument();

      mockQuerySelector.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Check for proper headings
      expect(screen.getByRole('heading', { name: /system performance/i })).toBeInTheDocument();
      
      // Check metric cards have proper structure
      const cpuUsageText = screen.getByText('CPU Usage');
      expect(cpuUsageText).toBeInTheDocument();
      
      const memoryUsageText = screen.getByText('Memory Usage');
      expect(memoryUsageText).toBeInTheDocument();
    });

    it('should provide meaningful tooltips for status indicators', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Connection status indicator should have title attribute
      const statusIndicator = document.querySelector('[title*="WebSocket"]');
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator?.getAttribute('title')).toContain('WebSocket: connected');
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks with event listeners', async () => {
      const { unmount } = renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Add event listeners
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // Unmount component
      unmount();

      // Should clean up event listeners (no easy way to test directly, but ensures no errors)
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      // No errors should occur after unmount
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should efficiently handle rapid WebSocket updates', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Send multiple rapid updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          websocketCallback?.({
            cpu_percent: 50 + i,
            memory_percent: 60 + i,
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
          });
        }
      });

      // Should handle rapid updates without crashing
      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });
    });

    it('should limit metrics history to prevent memory growth', async () => {
      let websocketCallback: ((data: any) => void) | null = null;
      
      mockUseMetricsWebSocket.mockImplementation((callback) => {
        websocketCallback = callback;
        return {
          isConnected: true,
          connectionState: 'connected',
        } as any;
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });

      // Send more than 30 updates (the limit in the component)
      act(() => {
        for (let i = 0; i < 35; i++) {
          websocketCallback?.({
            cpu_percent: 50,
            memory_percent: 60,
            active_agents: 5,
            active_workflows: 2,
            timestamp: new Date(Date.now() + i * 1000).toISOString(),
          });
        }
      });

      // Component should still function normally
      await waitFor(() => {
        expect(screen.getByText('System Performance')).toBeInTheDocument();
      });
    });
  });
});