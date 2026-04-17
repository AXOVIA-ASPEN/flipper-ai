/**
 * @file src/components/ui/EmptyState.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Shared empty-state card using .fp-glass surface + optional action.
 *
 * @description
 * Renders a centred .fp-glass card with title, optional message, optional decorative
 * icon slot, and an optional action (link or button). The action.href takes precedence
 * over action.onClick when both are provided — document this at call sites if mixing.
 */

'use client';

import React from 'react';
import Link from 'next/link';

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: EmptyStateAction;
  icon?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
  'data-testid': testId = 'empty-state',
}: EmptyStateProps): React.JSX.Element {
  const btnClass = action?.variant === 'ghost' ? 'fp-btn-ghost' : 'fp-btn-primary';

  return (
    <div
      data-testid={testId}
      className={`fp-glass${className ? ` ${className}` : ''}`}
      style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 480, margin: '0 auto' }}
    >
      {icon}
      <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      {message && (
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>{message}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href} className={btnClass} style={{ textDecoration: 'none' }}>
            {action.label}
          </Link>
        ) : (
          <button type="button" className={btnClass} onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
