/**
 * @file src/lib/billing-events.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief DOM event constant for post-checkout subscription sync.
 *
 * @description
 * Exports the custom DOM event name fired after checkout return when the
 * subscription tier has been synced (or polling exhausted). BillingSettings
 * and CheckoutResultBanner both use this event to coordinate UI refresh.
 */

export const BILLING_SUBSCRIPTION_SYNCED_EVENT = 'flipper:subscription-updated';
