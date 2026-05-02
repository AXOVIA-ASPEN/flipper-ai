/**
 * @file src/components/UpgradePrompt.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.2
 * @brief Contextual upgrade prompt shown when a user hits a tier-gated feature.
 *
 * @description
 * Reusable client component that displays an upgrade call-to-action when a user
 * encounters a feature gated by their subscription tier. Shows the feature name,
 * a contextual message, and a button that initiates a Stripe Checkout session
 * via POST /api/checkout. Automatically determines the next tier unless a
 * specific requiredTier is provided. Story 14.8 collapsed the mixed-gradient
 * treatment to canonical single-accent glass per ADR-14.7-C — `.fp-glass`
 * wrapper, purple accent icon (`#8b5cf6`), single `.fp-btn-primary` CTA. The
 * Stripe checkout flow is preserved verbatim.
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
    <div className="fp-glass p-4" data-testid="upgrade-prompt">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0" style={{ color: '#8b5cf6' }}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
            {feature} — Upgrade Required
          </h3>
          <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
            {message}
          </p>
          <div className="mt-3">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="fp-btn-primary"
            >
              {loading ? 'Redirecting...' : `Upgrade to ${TIER_PRICING[targetTier].label !== 'Free' ? `${targetTier.charAt(0) + targetTier.slice(1).toLowerCase()} (${pricing.label})` : targetTier}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
