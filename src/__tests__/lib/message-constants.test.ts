/**
 * @file src/__tests__/lib/message-constants.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Jest unit test for STATUS_COLORS canonical class regression guard.
 *
 * @description
 * Asserts every STATUS_COLORS entry is a canonical `fp-badge fp-badge-*`
 * class string per AC #11. Adding a new status in the future without
 * following the canonical pattern will fail this test.
 */

import { STATUS_COLORS } from '@/lib/message-constants';

describe('Story 14.7 — STATUS_COLORS canonical .fp-badge regression (AC #11)', () => {
  const CANONICAL = /^fp-badge fp-badge-(red|blue|gray|yellow|green|purple|orange)$/;

  it('every value matches the canonical .fp-badge pattern', () => {
    const values = Object.values(STATUS_COLORS);
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value).toMatch(CANONICAL);
    }
  });

  it('includes required status keys', () => {
    expect(STATUS_COLORS.DRAFT).toBeDefined();
    expect(STATUS_COLORS.PENDING_APPROVAL).toBeDefined();
    expect(STATUS_COLORS.SENT).toBeDefined();
    expect(STATUS_COLORS.DELIVERED).toBeDefined();
    expect(STATUS_COLORS.READ).toBeDefined();
    expect(STATUS_COLORS.REJECTED).toBeDefined();
  });

  it('maps PENDING_APPROVAL to yellow (caution)', () => {
    expect(STATUS_COLORS.PENDING_APPROVAL).toBe('fp-badge fp-badge-yellow');
  });

  it('maps REJECTED to red (terminal/negative)', () => {
    expect(STATUS_COLORS.REJECTED).toBe('fp-badge fp-badge-red');
  });

  it('does not ship legacy Tailwind palette shade classes', () => {
    const legacyRe = /(bg|text|border)-(blue|gray|yellow|red|green|amber|slate|purple)-\d+/;
    for (const value of Object.values(STATUS_COLORS)) {
      expect(value).not.toMatch(legacyRe);
    }
  });

  it('does not ship dark:* prefixes', () => {
    for (const value of Object.values(STATUS_COLORS)) {
      expect(value).not.toContain('dark:');
    }
  });
});
