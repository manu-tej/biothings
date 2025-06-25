# BioThings Frontend Testing Guide

## Overview

This guide covers the testing setup and practices for the BioThings frontend application.

## Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW (Mock Service Worker)**: API mocking
- **jest-websocket-mock**: WebSocket testing
- **@swc/jest**: Fast TypeScript transpilation

## Project Structure

```
frontend/
├── __tests__/
│   ├── unit/
│   │   ├── components/    # Component unit tests
│   │   ├── hooks/        # Custom hook tests
│   │   └── lib/          # Utility/library tests
│   ├── integration/
│   │   ├── api/          # API integration tests
│   │   └── websocket/    # WebSocket integration tests
│   ├── e2e/             # End-to-end tests
│   └── mocks/           # MSW handlers and server setup
├── shared/
│   └── test-utils/      # Custom test utilities
├── jest.config.js       # Jest configuration
└── jest.setup.js        # Jest setup file
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Specific Test Types

```bash
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests only
```

### CI Mode

```bash
npm run test:ci         # Optimized for CI/CD pipelines
```

## Writing Tests

### Component Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@/shared/test-utils';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', async () => {
    render(<MyComponent />);

    expect(screen.getByText('Hello')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});
```

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react'
import useMyHook from '@/hooks/useMyHook'

describe('useMyHook', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyHook())

    expect(result.current.value).toBe(0)

    act(() => {
      result.current.increment()
    })

    expect(result.current.value).toBe(1)
  })
})
```

### API Tests with MSW

```typescript
import { server } from '@/__tests__/mocks/server'
import { http, HttpResponse } from 'msw'

it('should handle API errors', async () => {
  server.use(
    http.get('/api/data', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  // Test error handling
})
```

### WebSocket Tests

```typescript
import WS from 'jest-websocket-mock'

it('should handle WebSocket messages', async () => {
  const server = new WS('ws://localhost:8000/ws')

  // Render component that uses WebSocket

  await server.connected

  server.send(JSON.stringify({ type: 'update', data: 'test' }))

  // Assert on UI updates
})
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Use Testing Library Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Async Testing**: Always use `waitFor` for async operations
4. **Mock External Dependencies**: Use MSW for API calls, mock timers for time-based tests
5. **Test User Behavior**: Test what users see and do, not implementation details
6. **Coverage Goals**: Maintain 80% coverage globally, 90% for critical paths

## Common Testing Patterns

### Testing with React Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
};
```

### Testing Loading States

```typescript
it('should show loading state', () => {
  render(<MyComponent />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('should handle errors gracefully', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

  // Trigger error condition

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  consoleSpy.mockRestore()
})
```

## Debugging Tests

### Interactive Mode

```bash
npm run test:watch
```

### Debug in VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "--watchAll=false"],
  "cwd": "${workspaceFolder}/frontend",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

1. **Module Resolution**: Ensure `@/` paths are configured in both Jest and TypeScript
2. **Async Tests**: Remember to use `await` and `waitFor` for async operations
3. **Cleanup**: Tests should clean up after themselves (handled automatically by React Testing Library)
4. **Mocking**: Reset mocks between tests using `afterEach`

## CI/CD Integration

Tests run automatically on:

- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

See `.github/workflows/frontend-tests.yml` for CI configuration.

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
