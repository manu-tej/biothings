import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions, RenderResult, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'

interface TestProviderProps {
  children: ReactNode
  queryClient?: QueryClient
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  })

const AllTheProviders = ({
  children,
  queryClient = createTestQueryClient(),
}: TestProviderProps) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

const customRender = (ui: ReactElement, options?: CustomRenderOptions): RenderResult => {
  const { queryClient, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render, userEvent, createTestQueryClient }

// Utility to wait for loading states to resolve
export const waitForLoadingToFinish = () =>
  waitFor(() => {
    const loadingElements = screen.queryAllByText(/loading/i)
    const spinners = screen.queryAllByRole('progressbar')
    expect(loadingElements).toHaveLength(0)
    expect(spinners).toHaveLength(0)
  })

// Utility for testing error boundaries
export const ThrowError = ({ error }: { error: Error }) => {
  throw error
}
