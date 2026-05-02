/**
 * @file src/__tests__/app/health-status-badge.test.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Unit tests for the health page StatusIcon/StatusBadge canonical mapping (Story 14.9 AC #7).
 *
 * @description
 * Asserts that the per-status icon color (statusIconColor) and badge class (statusBadgeClass)
 * helpers map each ServiceStatus to its canonical token: green for online, yellow for degraded,
 * gray for loading, red for offline. Replaces the previous hand-rolled `bg-{color}-100 text-
 * {color}-800` Tailwind grid; locks the contract from AC #7 so the canonical palette cannot
 * silently regress.
 */

import { statusIconColor, statusBadgeClass } from '@/lib/health-status';

describe('health page status helpers (Story 14.9 AC #7)', () => {
  describe('statusIconColor — canonical inline hex per ADR-14.9-D', () => {
    test.each([
      ['online' as const, '#34d399'],
      ['degraded' as const, '#fbbf24'],
      ['loading' as const, '#94a3b8'],
      ['offline' as const, '#f87171'],
    ])('status=%s → %s', (status, expected) => {
      expect(statusIconColor(status)).toBe(expected);
    });

    it('always returns a hex token, never a className', () => {
      (['online', 'degraded', 'loading', 'offline'] as const).forEach((s) => {
        expect(statusIconColor(s)).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('statusBadgeClass — canonical .fp-badge variant', () => {
    test.each([
      ['online' as const, 'fp-badge fp-badge-green'],
      ['degraded' as const, 'fp-badge fp-badge-yellow'],
      ['loading' as const, 'fp-badge fp-badge-gray'],
      ['offline' as const, 'fp-badge fp-badge-red'],
    ])('status=%s → %s', (status, expected) => {
      expect(statusBadgeClass(status)).toBe(expected);
    });

    it('never returns hand-rolled bg-*-100 text-*-800 patterns', () => {
      (['online', 'degraded', 'loading', 'offline'] as const).forEach((s) => {
        const out = statusBadgeClass(s);
        expect(out).not.toMatch(/bg-[a-z]+-\d+/);
        expect(out).not.toMatch(/text-[a-z]+-\d+/);
        expect(out).toMatch(/^fp-badge fp-badge-(green|yellow|gray|red)$/);
      });
    });
  });
});
