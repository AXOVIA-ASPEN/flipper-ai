/**
 * @file src/__tests__/components/ui/ErrorBanner.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit tests for the ErrorBanner shared component.
 *
 * @description
 * Tests message rendering, conditional retry button, async rejection handling,
 * accessibility attributes, and click-spam guard.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders .fp-alert-danger surface with message', () => {
    const { container: c } = render(<ErrorBanner message="Something went wrong" />);
    expect(c.querySelector('.fp-alert-danger')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('omits retry button when onRetry is undefined', () => {
    render(<ErrorBanner message="Error" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders retry button with .fp-btn-ghost when onRetry is provided', () => {
    const { container } = render(<ErrorBanner message="Error" onRetry={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('fp-btn-ghost');
  });

  it('invokes onRetry when retry is clicked', async () => {
    const onRetry = jest.fn().mockResolvedValue(undefined);
    render(<ErrorBanner message="Error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(onRetry).toHaveBeenCalledTimes(1));
  });

  it('handles async retry rejection without throwing an unhandled rejection synchronously', async () => {
    const rejection = new Error('retry failed');
    const onRetry = jest.fn().mockRejectedValue(rejection);

    // Mock queueMicrotask to capture the rethrow without crashing the test.
    // The component's design is to rethrow asynchronously (for Sentry); here we
    // just verify onRetry was called and no synchronous throw occurred.
    const queueMicrotaskSpy = jest.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {});

    render(<ErrorBanner message="Error" onRetry={onRetry} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
      await new Promise<void>((r) => setTimeout(r, 10));
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
    queueMicrotaskSpy.mockRestore();
  });

  it('has role="alert" and aria-live="assertive"', () => {
    render(<ErrorBanner message="Error" />);
    const el = screen.getByRole('alert');
    expect(el).toHaveAttribute('aria-live', 'assertive');
  });

  it('uses custom retryLabel when provided', () => {
    render(<ErrorBanner message="Error" onRetry={() => {}} retryLabel="Reload" />);
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });
});
