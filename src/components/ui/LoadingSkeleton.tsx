/**
 * @file src/components/ui/LoadingSkeleton.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Glass-surfaced shimmer skeleton for loading states (card + list variants).
 *
 * @description
 * Shared loading placeholder used across Dashboard, Opportunities, Listings detail,
 * Messages, and Posting Queue. Renders a .fp-glass container wrapping one or more
 * .fp-shimmer bars whose dimensions depend on the `variant` prop. Replaces hand-rolled
 * inline loading blocks — see Story 14.3 for migration scope.
 *
 * Note: Uses .fp-shimmer (prefixed convention) as exported by Story 14.1 via
 * app/globals.css. The AC spec references ".shimmer" but Story 14.1 ADR-14.1-A
 * prefixed all keyframe names and classes with "fp-" to avoid Tailwind v4 collisions.
 */

'use client';

import React from 'react';

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list';
  rows?: number;
  className?: string;
  'data-testid'?: string;
}

export function LoadingSkeleton({
  variant = 'card',
  rows = 5,
  className,
  'data-testid': testId = 'loading-skeleton',
}: LoadingSkeletonProps): React.JSX.Element {
  if (variant === 'card') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        data-testid={testId}
        className={`fp-glass${className ? ` ${className}` : ''}`}
        style={{ padding: 20 }}
      >
        <span style={srOnlyStyle}>Loading…</span>
        <div
          className="fp-shimmer"
          style={{ height: 16, width: '40%', borderRadius: 6, marginBottom: 12 }}
        />
        <div className="fp-shimmer" style={{ height: 12, width: '80%', borderRadius: 6, marginBottom: 8 }} />
        <div className="fp-shimmer" style={{ height: 12, width: '90%', borderRadius: 6, marginBottom: 8 }} />
        <div className="fp-shimmer" style={{ height: 12, width: '60%', borderRadius: 6 }} />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid={testId}
      className={className}
    >
      <span style={srOnlyStyle}>Loading…</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="fp-glass-sm"
          style={{ padding: 12, height: 80, marginBottom: 8 }}
        >
          <div className="fp-shimmer" style={{ height: '100%', borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
