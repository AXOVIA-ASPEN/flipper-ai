/**
 * @file src/__tests__/components/ui/LoadingSkeleton.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit tests for the LoadingSkeleton shared component.
 *
 * @description
 * Tests the card and list variants, accessibility attributes, row count prop,
 * and custom className/data-testid forwarding.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders card variant with .fp-glass surface and .fp-shimmer children', () => {
    const { container } = render(<LoadingSkeleton variant="card" />);
    expect(container.querySelector('.fp-glass')).toBeInTheDocument();
    const shimmerEls = container.querySelectorAll('.fp-shimmer');
    expect(shimmerEls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders list variant with 5 rows by default', () => {
    const { container } = render(<LoadingSkeleton variant="list" />);
    const rows = container.querySelectorAll('.fp-glass-sm');
    expect(rows).toHaveLength(5);
  });

  it('honors `rows` prop for list variant (rows=3 → 3 rows)', () => {
    const { container } = render(<LoadingSkeleton variant="list" rows={3} />);
    const rows = container.querySelectorAll('.fp-glass-sm');
    expect(rows).toHaveLength(3);
  });

  it('applies aria-busy and role=status for accessibility', () => {
    render(<LoadingSkeleton />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('applies custom className and data-testid when provided', () => {
    render(<LoadingSkeleton className="custom-class" data-testid="my-skeleton" />);
    expect(screen.getByTestId('my-skeleton')).toBeInTheDocument();
  });

  it('defaults data-testid to "loading-skeleton"', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});
