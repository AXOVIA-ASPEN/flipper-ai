'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/error-tracker';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Global Error Boundary for catching React component errors.
 * Implements error recovery strategies and user-friendly error display.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private static readonly MAX_RETRY_COUNT = 3;
  private static readonly RETRY_DELAY_MS = 1000;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to error tracker
    captureError(error, {
      route: window.location.pathname,
      action: 'component_error',
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({ errorInfo });
  }

  /**
   * Attempt to recover from the error by resetting state.
   * Implements exponential backoff for retry attempts.
   */
  private handleRetry = (): void => {
    const { retryCount } = this.state;

    if (retryCount >= ErrorBoundary.MAX_RETRY_COUNT) {
      logger.warn('Max retry attempts reached', { retryCount });
      return;
    }

    logger.info('Attempting error recovery', { attempt: retryCount + 1 });

    // Clear error state after delay
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }, ErrorBoundary.RETRY_DELAY_MS * Math.pow(2, retryCount));
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private renderErrorMessage(): ReactNode {
    const { error, retryCount } = this.state;
    const canRetry = retryCount < ErrorBoundary.MAX_RETRY_COUNT;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
              <p className="mt-1 text-sm text-gray-500">
                We encountered an unexpected error. Please try again.
              </p>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <details className="bg-gray-100 rounded p-3 text-xs">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                Error details (development only)
              </summary>
              <pre className="whitespace-pre-wrap text-red-600 overflow-auto">
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex space-x-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Try Again {retryCount > 0 && `(${retryCount}/${ErrorBoundary.MAX_RETRY_COUNT})`}
              </button>
            )}
            <button
              onClick={this.handleReload}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Reload Page
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            If the problem persists, please{' '}
            <a href="/support" className="text-blue-600 hover:underline">
              contact support
            </a>
          </div>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || this.renderErrorMessage();
    }

    return this.props.children;
  }
}

/**
 * Hook to create a scoped error boundary with custom fallback.
 */
export function useErrorBoundary(): {
  ErrorBoundary: typeof ErrorBoundary;
  captureError: (error: Error, context?: Record<string, unknown>) => void;
} {
  return {
    ErrorBoundary,
    captureError: (error: Error, context?: Record<string, unknown>) => {
      captureError(error, {
        route: window.location.pathname,
        ...context,
      });
    },
  };
}
