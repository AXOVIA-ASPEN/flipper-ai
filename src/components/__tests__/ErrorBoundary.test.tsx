/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary } from '../ErrorBoundary';
import * as errorTracker from '@/lib/error-tracker';

// Mock dependencies
jest.mock('@/lib/error-tracker');
jest.mock('@/lib/logger');

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
  shouldThrow,
  errorMessage = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Suppress console.error in tests (ErrorBoundary logs expected)
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches and displays error message when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('We encountered an unexpected error. Please try again.')
    ).toBeInTheDocument();
  });

  it('logs error to error tracker when caught', () => {
    const captureErrorSpy = jest.spyOn(errorTracker, 'captureError');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow errorMessage="Custom error" />
      </ErrorBoundary>
    );

    expect(captureErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom error' }),
      expect.objectContaining({
        action: 'component_error',
        retryCount: 0,
      })
    );
  });

  it('calls custom onError handler when provided', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('renders custom fallback when provided', () => {
    const fallback = <div>Custom error UI</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('displays retry button and allows retry attempt', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Try Again/)).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByText(/Try Again/));

    // Wait for retry delay
    await waitFor(
      () => {
        // After retry, re-render with no error
        rerender(
          <ErrorBoundary>
            <ThrowError shouldThrow={false} />
          </ErrorBoundary>
        );

        expect(screen.getByText('No error')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('shows retry count when retrying multiple times', () => {
    // Mock setTimeout to execute immediately
    jest.useFakeTimers();

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // First retry
    fireEvent.click(screen.getByText(/Try Again/));
    jest.advanceTimersByTime(1000);

    // Throw again
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Try Again \(1\/3\)/)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('hides retry button after max attempts', () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    // Attempt 3 retries
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText(/Try Again/));
      jest.advanceTimersByTime(1000 * Math.pow(2, i));
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );
    }

    expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();

    jest.useRealTimers();
  });

  it('renders reload button and it is clickable', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton).toBeEnabled();
    
    // Verify button is clickable (doesn't throw)
    expect(() => fireEvent.click(reloadButton)).not.toThrow();
  });

  it('shows error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow errorMessage="Dev error" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error details/)).toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('hides error details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Error details/)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('includes support link', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );

    const supportLink = screen.getByText('contact support');
    expect(supportLink).toBeInTheDocument();
    expect(supportLink.closest('a')).toHaveAttribute('href', '/support');
  });
});
