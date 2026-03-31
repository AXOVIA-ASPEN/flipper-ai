/**
 * @file src/__tests__/lib/holding-cost.test.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief Unit tests for holding cost utility functions.
 *
 * @description
 * Tests calculateDaysHeld, calculateCarryingCost, and isAgingInventory
 * with 100% branch coverage including edge cases for same-day, future
 * dates, zero rates, fractional rates, and custom thresholds.
 */

import { calculateDaysHeld, calculateCarryingCost, isAgingInventory } from '@/lib/holding-cost';

describe('calculateDaysHeld', () => {
  it('returns 0 for same-day purchase', () => {
    // Use local noon and local midnight to avoid DST/timezone boundary issues
    const now = new Date(2026, 2, 3, 12, 0, 0); // 2026-03-03 12:00 local
    const purchaseDate = new Date(2026, 2, 3, 8, 0, 0); // 2026-03-03 08:00 local
    expect(calculateDaysHeld(purchaseDate, now)).toBe(0);
  });

  it('returns 1 for purchase exactly 1 day ago', () => {
    const now = new Date(2026, 2, 3, 12, 0, 0); // 2026-03-03 12:00 local
    const purchaseDate = new Date(2026, 2, 2, 12, 0, 0); // 2026-03-02 12:00 local
    expect(calculateDaysHeld(purchaseDate, now)).toBe(1);
  });

  it('returns 30 for purchase 30 days ago', () => {
    const now = new Date(2026, 2, 3, 12, 0, 0); // 2026-03-03 local
    const purchaseDate = new Date(2026, 1, 1, 12, 0, 0); // 2026-02-01 local
    expect(calculateDaysHeld(purchaseDate, now)).toBe(30);
  });

  it('returns 365 for purchase 365 days ago', () => {
    const now = new Date(2026, 2, 3, 12, 0, 0); // 2026-03-03 local
    const purchaseDate = new Date(2025, 2, 3, 12, 0, 0); // 2025-03-03 local
    expect(calculateDaysHeld(purchaseDate, now)).toBe(365);
  });

  it('returns 0 for future purchase date (never negative)', () => {
    const now = new Date(2026, 2, 3, 12, 0, 0); // 2026-03-03 local
    const purchaseDate = new Date(2026, 2, 10, 12, 0, 0); // 2026-03-10 local
    expect(calculateDaysHeld(purchaseDate, now)).toBe(0);
  });

  it('uses current date when now is not provided', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = calculateDaysHeld(yesterday);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(2); // allow for date boundary edge cases
  });
});

describe('calculateCarryingCost', () => {
  it('returns 0 when daysHeld is 0', () => {
    expect(calculateCarryingCost(0, 2.0)).toBe(0);
  });

  it('returns 60 for 30 days at $2/day', () => {
    expect(calculateCarryingCost(30, 2.0)).toBe(60);
  });

  it('handles fractional daily rate', () => {
    expect(calculateCarryingCost(10, 1.5)).toBe(15);
  });

  it('returns 0 for zero daily rate', () => {
    expect(calculateCarryingCost(100, 0)).toBe(0);
  });
});

describe('isAgingInventory', () => {
  it('returns false for 0 days', () => {
    expect(isAgingInventory(0)).toBe(false);
  });

  it('returns false for 29 days (below default threshold)', () => {
    expect(isAgingInventory(29)).toBe(false);
  });

  it('returns true for exactly 30 days (at default threshold)', () => {
    expect(isAgingInventory(30)).toBe(true);
  });

  it('returns true for 31 days (above default threshold)', () => {
    expect(isAgingInventory(31)).toBe(true);
  });

  it('respects custom threshold — false below', () => {
    expect(isAgingInventory(14, 15)).toBe(false);
  });

  it('respects custom threshold — true at boundary', () => {
    expect(isAgingInventory(15, 15)).toBe(true);
  });

  it('respects custom threshold — true above', () => {
    expect(isAgingInventory(16, 15)).toBe(true);
  });
});
