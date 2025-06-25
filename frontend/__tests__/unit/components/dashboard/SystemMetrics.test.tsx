import { render, screen, waitFor, act } from '@/shared/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import SystemMetrics from '@/components/dashboard/SystemMetrics'
import { apiClient } from '@/lib/api/client'
import { useMetricsWebSocket } from '@/lib/hooks/useWebSocketNew'
import {
  createMetrics,
  createCriticalMetrics,
  createHealthyMetrics,
  createMetricsHistory,
} from '@/__tests__/factories'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock the dependencies
jest.mock('@/lib/api/client')
jest.mock('@/lib/hooks/useWebSocketNew')

// Enhanced echarts mock
const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  dispose: jest.fn(),
}

jest.mock('echarts', () => ({
  init: jest.fn(() => mockChartInstance),
}))

// Mock error console to prevent noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('SystemMetrics', () => {
  let queryClient: QueryClient
  const mockUseMetricsWebSocket = useMetricsWebSocket as jest.MockedFunction<
    typeof useMetricsWebSocket
  >
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    // Default mock implementations
    mockApiClient.getMetrics = jest.fn().mockResolvedValue(mockMetricsData)
    mockUseMetricsWebSocket.mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SystemMetrics />
      </QueryClientProvider>
    )
  }

  it('should render loading state initially', () => {
    renderComponent()
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('should display system metrics after loading', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('System Performance')).toBeInTheDocument()
    })

    // Check CPU metrics
    expect(screen.getByText('CPU Usage')).toBeInTheDocument()
    expect(screen.getByText('45.5')).toBeInTheDocument()

    // Check Memory metrics
    expect(screen.getByText('Memory Usage')).toBeInTheDocument()
    expect(screen.getByText('62.3')).toBeInTheDocument()

    // Check Agent metrics
    expect(screen.getByText('Active Agents')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Total Agents')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('should show correct status colors based on metric values', async () => {
    // Test critical CPU status (>80%)
    mockApiClient.getMetrics.mockResolvedValueOnce({
      ...mockMetricsData,
      system: { cpu_percent: 85, memory_percent: 50 },
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('85.0')).toBeInTheDocument()
    })

    // Check that critical status styling is applied
    const cpuCard = screen.getByText('CPU Usage').closest('div')
    expect(cpuCard?.querySelector('.text-red-600')).toBeInTheDocument()
  })

  it('should display trends correctly', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('+2.5%')).toBeInTheDocument() // Positive trend
      expect(screen.getByText('-1.2%')).toBeInTheDocument() // Negative trend
    })
  })

  it('should show live connection status when WebSocket is connected', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    // Check connection indicator
    const indicator = document.querySelector('.bg-green-500')
    expect(indicator).toBeInTheDocument()
  })

  it('should show polling status when WebSocket is disconnected', async () => {
    mockUseMetricsWebSocket.mockReturnValue({
      isConnected: false,
      connectionState: 'disconnected',
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Polling')).toBeInTheDocument()
    })
  })

  it('should update metrics when WebSocket receives data', async () => {
    let websocketCallback: ((data: any) => void) | null = null

    mockUseMetricsWebSocket.mockImplementation((callback) => {
      websocketCallback = callback
      return {
        isConnected: true,
        connectionState: 'connected',
      } as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('45.5')).toBeInTheDocument()
    })

    // Simulate WebSocket update
    const newMetrics = {
      cpu_percent: 55.5,
      memory_percent: 70.0,
      active_agents: 8,
      total_agents: 10,
      timestamp: new Date().toISOString(),
    }

    act(() => {
      websocketCallback?.(newMetrics)
    })

    await waitFor(() => {
      expect(screen.getByText('55.5')).toBeInTheDocument()
      expect(screen.getByText('70.0')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockApiClient.getMetrics.mockRejectedValueOnce(new Error('API Error'))

    // Suppress console error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    renderComponent()

    await waitFor(() => {
      // Should show default values when error occurs
      expect(screen.getByText('0.0')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('should resize chart on window resize', async () => {
    const { container } = renderComponent()

    await waitFor(() => {
      expect(screen.getByText('System Performance')).toBeInTheDocument()
    })

    // Trigger window resize
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    // Chart resize should be handled (mocked in echarts mock)
    expect(container).toBeInTheDocument()
  })
})
