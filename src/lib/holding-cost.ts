/**
 * @file src/lib/holding-cost.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief Pure utility functions for calculating inventory holding costs.
 *
 * @description
 * Provides three pure functions for holding cost calculations:
 * calculateDaysHeld, calculateCarryingCost, and isAgingInventory.
 * Used by the Inventory tab in the opportunities page to display
 * carrying costs and flag aging inventory (30+ days).
 */

import { differenceInCalendarDays } from 'date-fns';

/** Number of calendar days between purchaseDate and now. Never negative. */
export function calculateDaysHeld(purchaseDate: Date, now: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(now, purchaseDate));
}

/** Total estimated carrying cost at the given daily rate. */
export function calculateCarryingCost(daysHeld: number, dailyRate: number): number {
  return daysHeld * dailyRate;
}

/** Returns true if the item has been held at or beyond the threshold (default 30 days). */
export function isAgingInventory(daysHeld: number, thresholdDays: number = 30): boolean {
  return daysHeld >= thresholdDays;
}
