/**
 * @jest-environment jsdom
 *
 * @file src/__tests__/components/UsageDisplay.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-24
 * @version 1.0
 * @brief Tests UsageDisplay's four-state threshold matrix per Story 14.8 AC #9.
 *
 * @description
 * Renders the prop-driven path of <UsageDisplay used={X} limit={Y} /> at the
 * four canonical thresholds and asserts the fill background string and banner
 * presence/absence per state:
 *   (i)   50%   — purple gradient,  no banner
 *   (ii)  95%   — purple gradient,  info banner ("approaching limit")
 *   (iii) 100% exact — purple gradient (full),  no warn banner
 *   (iv)  120%  — red gradient,    warn banner ("over limit")
 *
 * Also exercises the role="progressbar" + aria-valuenow contract (AC #18).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import UsageDisplay from '@/components/UsageDisplay';

const PURPLE_GRADIENT = 'linear-gradient(90deg, #7c3aed, #a78bfa)';
const RED_GRADIENT = 'linear-gradient(90deg, #f87171, #fca5a5)';

function renderUsage(used: number, limit: number) {
  return render(<UsageDisplay used={used} limit={limit} />);
}

function getFillBackground(): string {
  const fill = screen.getByTestId('usage-bar-fill');
  return fill.style.background;
}

describe('UsageDisplay — four-state threshold matrix (AC #9)', () => {
  it('(i)  50% — purple gradient, no banner', () => {
    renderUsage(50, 100);
    expect(getFillBackground()).toBe(PURPLE_GRADIENT);
    expect(screen.queryByTestId('usage-info-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('usage-warn-banner')).not.toBeInTheDocument();
  });

  it('(ii) 95% — purple gradient + info "approaching limit" banner', () => {
    renderUsage(95, 100);
    expect(getFillBackground()).toBe(PURPLE_GRADIENT);
    expect(screen.getByTestId('usage-info-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('usage-warn-banner')).not.toBeInTheDocument();
  });

  it('(iii) 100% exact — purple gradient at full width, no warn banner', () => {
    renderUsage(100, 100);
    expect(getFillBackground()).toBe(PURPLE_GRADIENT);
    expect(screen.getByTestId('usage-bar-fill').style.width).toBe('100%');
    expect(screen.queryByTestId('usage-warn-banner')).not.toBeInTheDocument();
    // Info banner is allowed at exact 100% (still in the "approaching" window).
  });

  it('(iv) 120% — red gradient + warn "over limit" banner', () => {
    renderUsage(120, 100);
    expect(getFillBackground()).toBe(RED_GRADIENT);
    expect(screen.getByTestId('usage-warn-banner')).toBeInTheDocument();
    // Width is capped at 100% even when usage exceeds it.
    expect(screen.getByTestId('usage-bar-fill').style.width).toBe('100%');
  });
});

describe('UsageDisplay — accessibility (AC #18)', () => {
  it('exposes role="progressbar" with aria-valuemin/max/now', () => {
    renderUsage(50, 100);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });
});

describe('UsageDisplay — canonical glass surface (AC #1)', () => {
  it('outer wrapper uses .fp-glass-sm', () => {
    const { container } = renderUsage(50, 100);
    expect(container.querySelector('.fp-glass-sm')).toBeTruthy();
  });
});
