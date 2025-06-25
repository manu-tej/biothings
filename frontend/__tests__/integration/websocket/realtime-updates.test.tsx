import { render, screen, act, waitFor } from '@/shared/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SystemMetrics from '@/components/dashboard/SystemMetrics';
import WS from 'jest-websocket-mock';

describe('Real-time WebSocket Updates', () => {
  let server: WS;
  let queryClient: QueryClient;

  beforeEach(async () => {
    server = new WS('ws://localhost:8000/ws');
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    WS.clean();
  });

  it('should update metrics in real-time', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SystemMetrics />
      </QueryClientProvider>
    );

    await server.connected;

    const metricsUpdate = {
      type: 'metrics_update',
      data: {
        cpu_percent: 45.5,
        memory_percent: 62.3,
      },
    };

    act(() => {
      server.send(JSON.stringify(metricsUpdate));
    });

    await waitFor(() => {
      expect(screen.getByText('45.5')).toBeInTheDocument();
      expect(screen.getByText('62.3')).toBeInTheDocument();
    });
  });

  it('should handle reconnection', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SystemMetrics />
      </QueryClientProvider>
    );

    await server.connected;

    // Simulate disconnect
    server.close();

    await waitFor(() => {
      expect(screen.getByText('Polling')).toBeInTheDocument();
    });

    // Create new server to simulate reconnection
    const newServer = new WS('ws://localhost:8000/ws');
    await newServer.connected;

    const update = {
      type: 'metrics_update',
      data: { cpu_percent: 50.0, memory_percent: 65.0 },
    };

    act(() => {
      newServer.send(JSON.stringify(update));
    });

    await waitFor(() => {
      expect(screen.getByText('50.0')).toBeInTheDocument();
    });

    newServer.close();
  });

  it('should handle multiple concurrent connections', async () => {
    // Test that multiple components can connect to WebSocket
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <div>
          <SystemMetrics />
          <SystemMetrics />
        </div>
      </QueryClientProvider>
    );

    await server.connected;

    const update = {
      type: 'metrics_update',
      data: { cpu_percent: 75.5, memory_percent: 80.0 },
    };

    act(() => {
      server.send(JSON.stringify(update));
    });

    // Both components should update
    const cpuElements = await screen.findAllByText('75.5');
    expect(cpuElements).toHaveLength(2);
  });

  it('should handle malformed messages gracefully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SystemMetrics />
      </QueryClientProvider>
    );

    await server.connected;

    // Send malformed JSON
    act(() => {
      server.send('invalid json{');
    });

    // Component should continue to function
    expect(screen.getByText('System Performance')).toBeInTheDocument();

    // Send valid message after malformed one
    const validUpdate = {
      type: 'metrics_update',
      data: { cpu_percent: 55.5, memory_percent: 70.0 },
    };

    act(() => {
      server.send(JSON.stringify(validUpdate));
    });

    await waitFor(() => {
      expect(screen.getByText('55.5')).toBeInTheDocument();
    });
  });
});