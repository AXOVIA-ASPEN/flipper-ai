/**
 * @file src/__tests__/components/ui/EmptyState.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit tests for the EmptyState shared component.
 *
 * @description
 * Tests title/message rendering, optional action (link vs button), action variant
 * (primary/ghost), icon slot, and default data-testid.
 *
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyState } from '@/components/ui/EmptyState';

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

describe('EmptyState', () => {
  it('renders title and message with expected inline styles', () => {
    const { container } = render(
      <EmptyState title="No data" message="Nothing here yet." />
    );
    const title = screen.getByText('No data');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveStyle({ color: '#e2e8f0' });
    const msg = screen.getByText('Nothing here yet.');
    expect(msg).toHaveStyle({ color: '#94a3b8' });
    expect(container.querySelector('.fp-glass')).toBeInTheDocument();
  });

  it('omits action when action prop is undefined', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders Link when action.href is provided', () => {
    render(<EmptyState title="Empty" action={{ label: 'Go somewhere', href: '/scraper' }} />);
    const link = screen.getByRole('link', { name: 'Go somewhere' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/scraper');
    expect(link.className).toContain('fp-btn-primary');
  });

  it('renders button and calls action.onClick when only onClick is provided', () => {
    const onClick = jest.fn();
    render(<EmptyState title="Empty" action={{ label: 'Do it', onClick }} />);
    const btn = screen.getByRole('button', { name: 'Do it' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses fp-btn-ghost when action.variant === "ghost"', () => {
    render(<EmptyState title="Empty" action={{ label: 'Ghost', href: '/x', variant: 'ghost' }} />);
    const link = screen.getByRole('link', { name: 'Ghost' });
    expect(link.className).toContain('fp-btn-ghost');
  });

  it('defaults data-testid to "empty-state"', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders icon slot when provided', () => {
    render(<EmptyState title="Empty" icon={<span data-testid="my-icon">🔥</span>} />);
    expect(screen.getByTestId('my-icon')).toBeInTheDocument();
  });

  it('exposes role="status" + aria-live="polite" so screen readers announce empty states (Story 14.7 AC #15)', () => {
    render(<EmptyState title="No conversation selected" />);
    const region = screen.getByTestId('empty-state');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
