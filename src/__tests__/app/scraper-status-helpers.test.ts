/**
 * @file src/__tests__/app/scraper-status-helpers.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Unit tests for scraper page status helpers (Story 14.9 ADR-14.9-C).
 *
 * @description
 * Verifies that getStatusColor returns the canonical inline hex token (not a Tailwind class)
 * and that getStatusBadgeClass returns the canonical .fp-badge variant for each scraper-job
 * status. The hex/class mapping is the contract Story 14.9 commits to in AC #5; these tests
 * lock it in so future refactors cannot silently regress the palette.
 */

import { getStatusColor, getStatusBadgeClass } from '@/lib/scraper-status';

describe('scraper status helpers (Story 14.9)', () => {
  describe('getStatusColor — returns canonical inline hex per ADR-14.9-C', () => {
    test.each([
      ['COMPLETED', '#34d399'],
      ['RUNNING', '#a78bfa'],
      ['FAILED', '#f87171'],
      ['QUEUED', '#94a3b8'],
      ['UNKNOWN', '#94a3b8'],
    ])('status=%s → %s', (status, expected) => {
      expect(getStatusColor(status)).toBe(expected);
    });

    it('never returns a Tailwind class string', () => {
      const statuses = ['COMPLETED', 'RUNNING', 'FAILED', 'QUEUED', 'WHATEVER'];
      statuses.forEach((s) => {
        const out = getStatusColor(s);
        expect(out).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(out).not.toMatch(/^text-/);
      });
    });
  });

  describe('getStatusBadgeClass — returns canonical .fp-badge variant', () => {
    test.each([
      ['COMPLETED', 'fp-badge fp-badge-green'],
      ['RUNNING', 'fp-badge fp-badge-purple'],
      ['FAILED', 'fp-badge fp-badge-red'],
      ['QUEUED', 'fp-badge fp-badge-gray'],
      ['UNKNOWN', 'fp-badge fp-badge-gray'],
    ])('status=%s → %s', (status, expected) => {
      expect(getStatusBadgeClass(status)).toBe(expected);
    });

    it('always emits the fp-badge prefix', () => {
      const statuses = ['COMPLETED', 'RUNNING', 'FAILED', 'QUEUED', 'EXOTIC'];
      statuses.forEach((s) => {
        expect(getStatusBadgeClass(s)).toMatch(/^fp-badge fp-badge-(green|purple|red|gray)$/);
      });
    });
  });
});
