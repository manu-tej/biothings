'use client';

import React from 'react';

import { Button } from './atoms/Button';
import { ErrorBoundary, AsyncBoundary, withErrorBoundary, useErrorHandler } from './ErrorBoundary';

// Example 1: Basic Error Boundary usage
export function BasicErrorBoundaryExample() {
  return (
    <ErrorBoundary>
      <ComponentThatMightError />
    </ErrorBoundary>
  );
}

// Example 2: Error Boundary with custom fallback
export function CustomFallbackExample() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 rounded">
          <h3>Oops! Something went wrong</h3>
          <p>We're working on fixing this issue.</p>
        </div>
      }
    >
      <ComponentThatMightError />
    </ErrorBoundary>
  );
}

// Example 3: Isolated Error Boundary (doesn't affect parent layout)
export function IsolatedErrorBoundaryExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ErrorBoundary isolate>
        <ComponentThatMightError />
      </ErrorBoundary>
      <div>This component will still render even if the other fails</div>
    </div>
  );
}

// Example 4: Error Boundary with error logging
export function ErrorLoggingExample() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Send to monitoring service
        console.error('Component error:', error);
        // TODO: logToSentry(error, errorInfo);
      }}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <ComponentThatMightError />
    </ErrorBoundary>
  );
}

// Example 5: Reset keys - Error boundary resets when keys change
export function ResetKeysExample() {
  const [userId, setUserId] = React.useState('123');
  
  return (
    <ErrorBoundary
      resetKeys={[userId]}
      resetOnPropsChange
    >
      <UserProfile userId={userId} />
    </ErrorBoundary>
  );
}

// Example 6: Async Boundary for lazy-loaded components
export function AsyncBoundaryExample() {
  const LazyComponent = React.lazy(() => import('./LazyComponent'));
  
  return (
    <AsyncBoundary
      fallback={<div>Loading component...</div>}
      onError={(error) => console.error('Failed to load component:', error)}
    >
      <LazyComponent />
    </AsyncBoundary>
  );
}

// Example 7: HOC usage
const SafeComponent = withErrorBoundary(ComponentThatMightError, {
  isolate: true,
  fallback: <div>Component failed to render</div>,
});

export function HOCExample() {
  return <SafeComponent />;
}

// Example 8: Hook usage for imperative error handling
export function UseErrorHandlerExample() {
  const throwError = useErrorHandler();
  
  const handleAsyncError = async () => {
    try {
      await riskyAsyncOperation();
    } catch (error) {
      // This will be caught by the nearest error boundary
      throwError(error as Error);
    }
  };
  
  return (
    <Button onClick={handleAsyncError}>
      Perform Risky Operation
    </Button>
  );
}

// Example 9: Multiple nested error boundaries
export function NestedBoundariesExample() {
  return (
    <ErrorBoundary fallback={<div>App crashed</div>}>
      <div className="space-y-4">
        <ErrorBoundary isolate fallback={<div>Header failed</div>}>
          <Header />
        </ErrorBoundary>
        
        <ErrorBoundary isolate fallback={<div>Content failed</div>}>
          <MainContent />
        </ErrorBoundary>
        
        <ErrorBoundary isolate fallback={<div>Footer failed</div>}>
          <Footer />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

// Example 10: Dashboard with comprehensive error handling
export function DashboardWithErrorBoundaries() {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to monitoring service
        }
      }}
    >
      <div className="dashboard">
        {/* Header with isolated boundary */}
        <ErrorBoundary
          isolate
          fallback={<div className="h-16 bg-gray-100">Navigation unavailable</div>}
        >
          <DashboardHeader />
        </ErrorBoundary>
        
        {/* Main content area */}
        <div className="grid grid-cols-3 gap-4 p-4">
          {/* Each widget has its own boundary */}
          <ErrorBoundary isolate fallback={<WidgetErrorFallback />}>
            <MetricsWidget />
          </ErrorBoundary>
          
          <ErrorBoundary isolate fallback={<WidgetErrorFallback />}>
            <ChartWidget />
          </ErrorBoundary>
          
          <ErrorBoundary isolate fallback={<WidgetErrorFallback />}>
            <AlertsWidget />
          </ErrorBoundary>
        </div>
        
        {/* WebSocket consumer with special handling */}
        <ErrorBoundary
          isolate
          fallback={<div>Real-time updates unavailable</div>}
          resetKeys={['websocket-connection']}
        >
          <WebSocketConsumer />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

// Helper components for examples
function ComponentThatMightError() {
  const [shouldError, setShouldError] = React.useState(false);
  
  if (shouldError) {
    throw new Error('Example error thrown');
  }
  
  return (
    <div className="p-4">
      <p>This component is working fine!</p>
      <Button onClick={() => setShouldError(true)}>Trigger Error</Button>
    </div>
  );
}

function WidgetErrorFallback() {
  return (
    <div className="p-4 bg-gray-100 rounded-lg text-center">
      <p className="text-gray-600">Widget unavailable</p>
    </div>
  );
}

// Placeholder components
function UserProfile({ userId }: { userId: string }) {
  return <div>User Profile: {userId}</div>;
}

function Header() {
  return <header>Header</header>;
}

function MainContent() {
  return <main>Main Content</main>;
}

function Footer() {
  return <footer>Footer</footer>;
}

function DashboardHeader() {
  return <header>Dashboard Header</header>;
}

function MetricsWidget() {
  return <div>Metrics Widget</div>;
}

function ChartWidget() {
  return <div>Chart Widget</div>;
}

function AlertsWidget() {
  return <div>Alerts Widget</div>;
}

function WebSocketConsumer() {
  return <div>WebSocket Consumer</div>;
}

async function riskyAsyncOperation() {
  throw new Error('Async operation failed');
}