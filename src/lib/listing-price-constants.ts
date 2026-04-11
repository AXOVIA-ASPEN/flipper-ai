/**
 * @file src/lib/listing-price-constants.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Shared constants for the optimal listing price calculator (Story 9.2).
 *
 * @description
 * Pure constants extracted into their own module so they can be imported by
 * both the server-side calculator (`src/lib/listing-price-calculator.ts`,
 * which depends on Prisma) and the client-side `PriceCalculator` React
 * component without dragging the Prisma client into the browser bundle.
 *
 * Importing the calculator module from a `'use client'` component would
 * pull `import prisma from './db'` along with it, which fails in jsdom/jest
 * test environments that lack TextEncoder polyfills.
 */

/** Default profit margin (percent) when the caller doesn't supply one. */
export const DEFAULT_TARGET_MARGIN_PERCENT = 30;

/** Default cap on recommended price as a fraction of verified market value. */
export const DEFAULT_MARKET_CAP_PERCENT = 0.95;

/**
 * Discount applied to after-fee market value when pricing a $0-cost item.
 * Single source of truth so the client-side recalculation in PriceCalculator
 * stays in lockstep with the server-side formula in listing-price-calculator.
 */
export const FREE_ITEM_DISCOUNT_FACTOR = 0.85;

/** Tolerance for flagging a divergence between LLM and formula prices. */
export const PRICE_DISCREPANCY_THRESHOLD = 0.15;
