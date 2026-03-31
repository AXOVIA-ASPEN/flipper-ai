/**
 * @file src/components/UpgradePrompt.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.1
 * @brief Contextual upgrade prompt shown when a user hits a tier-gated feature.
 *
 * @description
 * Reusable client component that displays an upgrade call-to-action when a user
 * encounters a feature gated by their subscription tier. Shows the feature name,
 * a contextual message, and a button that initiates a Stripe Checkout session
 * via POST /api/checkout. Automatically determines the next tier unless a
 * specific requiredTier is provided.
 */
'use client';

import { useState } from 'react';
import { TIER_PRICING } from '@/lib/stripe';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

interface UpgradePromptProps {
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  feature: string;
  message: string;
}

const TIER_ORDER: SubscriptionTier[] = ['FREE', 'FLIPPER', 'PRO'];

function getNextTier(current: SubscriptionTier): SubscriptionTier {
  const idx = TIER_ORDER.indexOf(current);
  if (idx < TIER_ORDER.length - 1) return TIER_ORDER[idx + 1];
  return current;
}

export default function UpgradePrompt({
  currentTier,
  requiredTier,
  feature,
  message,
}: UpgradePromptProps) {
  const targetTier = requiredTier || getNextTier(currentTier);
  const pricing = TIER_PRICING[targetTier];
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      console.error('Failed to initiate checkout:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-amber-500">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {feature} — Upgrade Required
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {message}
          </p>
          <div className="mt-3">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Redirecting...' : `Upgrade to ${TIER_PRICING[targetTier].label !== 'Free' ? `${targetTier.charAt(0) + targetTier.slice(1).toLowerCase()} (${pricing.label})` : targetTier}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
