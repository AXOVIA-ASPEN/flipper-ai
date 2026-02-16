/**
 * Stripe configuration and helpers for Flipper AI.
 * Author: ASPEN
 * Company: Axovia AI
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set — Stripe features disabled');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

/**
 * Stripe Price IDs for each subscription tier.
 * Set these in environment variables or replace with actual Stripe Price IDs.
 */
export const STRIPE_PRICE_IDS = {
  FLIPPER: process.env.STRIPE_PRICE_FLIPPER || 'price_flipper_monthly',
  PRO: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
} as const;

/**
 * Stripe product metadata mapped to internal tier names.
 */
export const PRICE_TO_TIER: Record<string, string> = {
  [STRIPE_PRICE_IDS.FLIPPER]: 'FLIPPER',
  [STRIPE_PRICE_IDS.PRO]: 'PRO',
};

/**
 * Display pricing for the frontend (cents).
 */
export const TIER_PRICING = {
  FREE: { monthly: 0, label: 'Free' },
  FLIPPER: { monthly: 1500, label: '$15/mo' },
  PRO: { monthly: 4000, label: '$40/mo' },
} as const;
