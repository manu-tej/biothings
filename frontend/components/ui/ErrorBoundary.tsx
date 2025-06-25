'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/atoms/Button';
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/atoms/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    // TODO: Replace with actual error monitoring service (e.g., Sentry, LogRocket)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track error count to prevent infinite loops
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to custom monitoring service
    this.logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when resetKeys change
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary();
      }
    }

    // Reset on any props change if specified
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Implement actual error logging service integration
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    };

    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Log');
      console.error('Error Data:', errorData);
      console.groupEnd();
    }

    // TODO: Send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorData });
  };

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  handleReset = () => {
    // Prevent infinite error loops
    if (this.state.errorCount > 3) {
      console.error('Too many consecutive errors. Preventing reset to avoid infinite loop.');
      return;
    }
    this.resetErrorBoundary();
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, isolate, showDetails } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <div className={`
          ${isolate ? '' : 'min-h-screen'} 
          flex items-center justify-center p-4
          ${isolate ? '' : 'bg-gray-50 dark:bg-gray-900'}
        `}>
          <Card className="max-w-2xl w-full" variant="outline" shadow="lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    An unexpected error occurred while rendering this component
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardBody>
              <div className="space-y-4">
                {/* Error message */}
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                  <p className="text-sm font-mono text-red-800 dark:text-red-200">
                    {error?.message || 'Unknown error'}
                  </p>
                </div>

                {/* Error details (collapsible) */}
                {showDetails && errorInfo && (
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                      Show error details
                    </summary>
                    <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                      <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {error?.stack}
                      </pre>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                          Component Stack:
                        </p>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}

                {/* Error count warning */}
                {errorCount > 2 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      This error has occurred {errorCount} times. If it persists, please contact support.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>

            <CardFooter>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleGoHome}
                  icon={<Home className="w-4 h-4" />}
                >
                  Go to Home
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={this.handleReset}
                  icon={<RefreshCw className="w-4 h-4" />}
                  disabled={errorCount > 3}
                >
                  Try Again
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Hook for functional components to interact with ErrorBoundary
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

// HOC for wrapping components with ErrorBoundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Props
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Specialized error boundary for async components
export function AsyncBoundary({ 
  children, 
  fallback = <div>Loading...</div>,
  ...props 
}: Props & { fallback?: ReactNode }) {
  return (
    <ErrorBoundary {...props} fallback={fallback}>
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}