import { render, screen, fireEvent, waitFor, act } from '@/shared/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkflowStatus from '@/components/dashboard/WorkflowStatus';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client');

const mockWorkflows = [
  {
    id: 'wf-001',
    name: 'PCR Protocol',
    status: 'running',
    progress: 0.65,
    started_at: new Date().toISOString(),
  },
  {
    id: 'wf-002',
    name: 'DNA Sequencing',
    status: 'completed',
    progress: 1.0,
    started_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'wf-003',
    name: 'Cell Culture',
    status: 'failed',
    progress: 0.3,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    error: 'Temperature out of range',
  },
];

describe('WorkflowStatus', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    (apiClient.getWorkflows as jest.Mock).mockResolvedValue(mockWorkflows);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WorkflowStatus />
      </QueryClientProvider>
    );
  };

  it('should render workflow list', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Workflow Status')).toBeInTheDocument();
    });

    // Check all workflows are displayed
    expect(screen.getByText('PCR Protocol')).toBeInTheDocument();
    expect(screen.getByText('DNA Sequencing')).toBeInTheDocument();
    expect(screen.getByText('Cell Culture')).toBeInTheDocument();
  });

  it('should display correct status indicators', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should show progress bars with correct values', async () => {
    renderComponent();

    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(3);
    });

    // Check progress values
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('should handle workflow actions', async () => {
    const mockStopWorkflow = jest.fn().mockResolvedValue({ success: true });
    (apiClient.stopWorkflow as jest.Mock) = mockStopWorkflow;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PCR Protocol')).toBeInTheDocument();
    });

    // Find and click stop button for running workflow
    const stopButton = screen.getByTestId('stop-workflow-wf-001');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockStopWorkflow).toHaveBeenCalledWith('wf-001');
    });
  });

  it('should refresh data periodically', async () => {
    jest.useFakeTimers();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PCR Protocol')).toBeInTheDocument();
    });

    expect(apiClient.getWorkflows).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds (refetch interval)
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(apiClient.getWorkflows).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should filter workflows by status', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PCR Protocol')).toBeInTheDocument();
    });

    // Click on "Running" filter
    const runningFilter = screen.getByRole('button', { name: /running/i });
    fireEvent.click(runningFilter);

    // Only running workflows should be visible
    expect(screen.getByText('PCR Protocol')).toBeInTheDocument();
    expect(screen.queryByText('DNA Sequencing')).not.toBeInTheDocument();
    expect(screen.queryByText('Cell Culture')).not.toBeInTheDocument();
  });

  it('should display error message for failed workflows', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Temperature out of range')).toBeInTheDocument();
    });
  });

  it('should handle empty workflow list', async () => {
    (apiClient.getWorkflows as jest.Mock).mockResolvedValue([]);
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No workflows running')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (apiClient.getWorkflows as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    // Suppress console error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Error loading workflows/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should allow retrying failed workflows', async () => {
    const mockRetryWorkflow = jest.fn().mockResolvedValue({ success: true });
    (apiClient.retryWorkflow as jest.Mock) = mockRetryWorkflow;

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Cell Culture')).toBeInTheDocument();
    });

    // Find and click retry button for failed workflow
    const retryButton = screen.getByTestId('retry-workflow-wf-003');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetryWorkflow).toHaveBeenCalledWith('wf-003');
    });
  });

  it('should show workflow duration', async () => {
    renderComponent();

    await waitFor(() => {
      // Should show duration for completed workflow
      expect(screen.getByText(/Duration: \d+h \d+m/)).toBeInTheDocument();
    });
  });

  it('should update progress when data changes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    // Update mock to return new data
    (apiClient.getWorkflows as jest.Mock).mockResolvedValue([
      {
        ...mockWorkflows[0],
        progress: 0.85, // Updated progress
      },
      ...mockWorkflows.slice(1),
    ]);

    // Trigger refetch
    act(() => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    });

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
    });
  });
});