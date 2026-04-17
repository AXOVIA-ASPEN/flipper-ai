/**
 * @file src/components/ui/ErrorBanner.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Shared error banner using .fp-alert-danger + optional retry button.
 *
 * @description
 * Displays a styled error message on a .fp-alert-danger surface with an optional
 * retry button (.fp-btn-ghost). The retry handler is guarded against click-spam and
 * async rejections are rethrown on the next microtask so Sentry captures them without
 * ErrorBanner swallowing them silently.
 */

'use client';

import React, { useState } from 'react';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  className?: string;
  'data-testid'?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
  className,
  'data-testid': testId = 'error-banner',
}: ErrorBannerProps): React.JSX.Element {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleClick = async () => {
    if (!onRetry) return;
    try {
      setIsRetrying(true);
      await Promise.resolve(onRetry());
    } catch (err) {
      // Rethrow on next microtask so global error handlers / Sentry catch it
      // without breaking the React event handler chain.
      queueMicrotask(() => {
        throw err;
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid={testId}
      className={`fp-alert-danger${className ? ` ${className}` : ''}`}
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <span style={{ color: '#f87171', fontSize: 13, flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          className="fp-btn-ghost"
          onClick={handleClick}
          disabled={isRetrying}
          aria-busy={isRetrying}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
