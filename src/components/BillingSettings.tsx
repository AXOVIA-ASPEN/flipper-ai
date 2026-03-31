/**
 * @file src/components/BillingSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.0
 * @brief Conversion-focused billing settings with pricing cards and shimmer effects.
 *
 * @description
 * Premium billing component with glassmorphism pricing cards, animated shimmer
 * highlights, scan-limit progress bar, trust signals, and ROI-driven messaging
 * designed to drive subscription upgrades. Displays current plan, feature
 * comparison, and Stripe-powered upgrade/billing flows.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ToastContainer';
import { BILLING_SUBSCRIPTION_SYNCED_EVENT } from '@/lib/billing-events';
import { TIER_PRICING } from '@/lib/stripe';
import { TIER_LIMITS } from '@/lib/subscription-tiers';
import type { SubscriptionTier } from '@/lib/subscription-tiers';
import {
  Check,
  X,
  Zap,
  Crown,
  TrendingUp,
  Shield,
  Star,
  ArrowRight,
  CreditCard,
  Sparkles,
  Lock,
  Clock,
} from 'lucide-react';

export interface SubscriptionData {
  tier: SubscriptionTier;
  scansToday: number;
}

export const TIER_ORDER: SubscriptionTier[] = ['FREE', 'FLIPPER', 'PRO'];

export interface FeatureRow {
  label: string;
  free: string | boolean;
  flipper: string | boolean;
  pro: string | boolean;
}

export const FEATURES: FeatureRow[] = [
  { label: 'Daily scans', free: '10', flipper: 'Unlimited', pro: 'Unlimited' },
  { label: 'Marketplaces', free: '1', flipper: '3', pro: 'All 5' },
  { label: 'Search configs', free: '3', flipper: '20', pro: 'Unlimited' },
  { label: 'Active jobs', free: '1', flipper: '5', pro: '20' },
  { label: 'AI analysis', free: true, flipper: true, pro: true },
  { label: 'Price history', free: false, flipper: true, pro: true },
  { label: 'Messaging', free: false, flipper: true, pro: true },
  { label: 'eBay cross-listing', free: false, flipper: false, pro: true },
];

export const TIER_META: Record<
  SubscriptionTier,
  {
    icon: typeof Zap;
    gradient: string;
    border: string;
    badge: string;
    tagline: string;
    daily: string;
  }
> = {
  FREE: {
    icon: Shield,
    gradient: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
    border: 'border-gray-200 dark:border-gray-700',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    tagline: 'Get started free',
    daily: '',
  },
  FLIPPER: {
    icon: Zap,
    gradient: 'from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950',
    border: 'border-blue-300 dark:border-blue-600',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    tagline: 'Most popular for flippers',
    daily: 'Less than a coffee/day',
  },
  PRO: {
    icon: Crown,
    gradient: 'from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950 dark:via-pink-950 dark:to-amber-950',
    border: 'border-purple-300 dark:border-purple-600',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    tagline: 'Maximum earning power',
    daily: 'Pays for itself in one flip',
  },
};

export default function BillingSettings() {
  const { showToast } = useToast();
  const [data, setData] = useState<SubscriptionData>({ tier: 'FREE', scansToday: 0 });
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
        const res = await fetch('/api/usage');
        if (res.ok) {
          const json = await res.json();
          const payload = json.data ?? json;
          const scans = payload.scans as
            | { usedToday?: number; used?: number }
            | undefined;
          const usedToday =
            typeof scans?.usedToday === 'number'
              ? scans.usedToday
              : typeof scans?.used === 'number'
                ? scans.used
                : 0;
          setData({
            tier: (payload.tier || 'FREE') as SubscriptionTier,
            scansToday: usedToday,
          });
        }
    } catch (err) {
      console.error('Failed to fetch subscription data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    function onSubscriptionSynced() {
      void fetchSubscription();
    }
    window.addEventListener(BILLING_SUBSCRIPTION_SYNCED_EVENT, onSubscriptionSynced);
    return () => window.removeEventListener(BILLING_SUBSCRIPTION_SYNCED_EVENT, onSubscriptionSynced);
  }, [fetchSubscription]);

  async function handleUpgrade(tier: SubscriptionTier) {
    setUpgrading(tier);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      console.error('Failed to initiate checkout:', err);
      showToast({
        type: 'error',
        title: 'Checkout failed',
        message: 'Unable to start checkout. Please try again.',
        duration: 5000,
      });
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch('/api/checkout/portal', { method: 'POST' });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err);
      showToast({
        type: 'error',
        title: 'Billing portal unavailable',
        message: 'Unable to open billing portal. Please try again.',
        duration: 5000,
      });
    }
  }

  if (loading) {
    return <BillingSettingsSkeleton />;
  }

  const currentTierIndex = TIER_ORDER.indexOf(data.tier);
  const isPaid = data.tier !== 'FREE';
  const limits = TIER_LIMITS[data.tier];

  return (
    <div
      id="billing"
      className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes subtle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .shimmer-badge {
          background: linear-gradient(
            110deg,
            transparent 25%,
            rgba(255, 255, 255, 0.3) 37%,
            transparent 63%
          );
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .shimmer-border {
          position: relative;
          overflow: hidden;
        }
        .shimmer-border::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(99, 102, 241, 0.4) 35%,
            rgba(168, 85, 247, 0.4) 50%,
            transparent 65%
          );
          background-size: 200% 100%;
          animation: shimmer 4s ease-in-out infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .glow-card {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .gradient-cta {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .float-badge {
          animation: subtle-float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Subscription & Billing
          </h2>
        </div>
        {isPaid && (
          <button
            onClick={handleManageBilling}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <CreditCard className="w-4 h-4" />
            Manage Billing
          </button>
        )}
      </div>

      {/* Current plan summary with scan progress */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Current plan:</span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${TIER_META[data.tier].badge}`}>
            {limits.name}
          </span>
          {data.tier !== 'FREE' && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {TIER_PRICING[data.tier].label}
            </span>
          )}
        </div>

        {/* Scan usage progress bar — nudges FREE users toward limit */}
        {limits.scansPerDay && (
          <div className="max-w-md" data-testid="scan-progress">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {data.scansToday} of {limits.scansPerDay} daily scans used
              </span>
              {data.scansToday >= limits.scansPerDay * 0.8 && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {data.scansToday >= limits.scansPerDay ? 'Limit reached' : 'Almost there'}
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.scansToday >= limits.scansPerDay
                    ? 'bg-red-500'
                    : data.scansToday >= limits.scansPerDay * 0.8
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min((data.scansToday / limits.scansPerDay) * 100, 100)}%` }}
              />
            </div>
            {data.scansToday >= limits.scansPerDay && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                Upgrade to unlock unlimited scans and find more deals
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {TIER_ORDER.map((tier) => {
          const meta = TIER_META[tier];
          const pricing = TIER_PRICING[tier];
          const tierLimits = TIER_LIMITS[tier];
          const Icon = meta.icon;
          const isCurrentTier = data.tier === tier;
          const canUpgrade = TIER_ORDER.indexOf(tier) > currentTierIndex;
          const isPopular = tier === 'FLIPPER';

          return (
            <div
              key={tier}
              className={`
                relative rounded-2xl border-2 p-6 transition-all duration-300
                bg-gradient-to-br ${meta.gradient}
                ${isCurrentTier ? `${meta.border} ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800` : `${meta.border} hover:scale-[1.02]`}
                ${isPopular && !isCurrentTier ? 'shimmer-border glow-card' : ''}
              `}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="shimmer-badge float-badge relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Tier header */}
              <div className="text-center mb-6 pt-2">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 ${
                  tier === 'FREE'
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : tier === 'FLIPPER'
                    ? 'bg-indigo-100 dark:bg-indigo-900'
                    : 'bg-purple-100 dark:bg-purple-900'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    tier === 'FREE'
                      ? 'text-gray-500'
                      : tier === 'FLIPPER'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {tierLimits.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {meta.tagline}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {pricing.monthly === 0 ? '$0' : `$${pricing.monthly / 100}`}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                </div>
                {meta.daily && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                    {meta.daily}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {FEATURES.map((feature) => {
                  const value = tier === 'FREE' ? feature.free : tier === 'FLIPPER' ? feature.flipper : feature.pro;
                  const hasFeature = value !== false;

                  return (
                    <li key={feature.label} className={`flex items-center gap-2 text-sm ${
                      hasFeature ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {hasFeature ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      )}
                      <span>{feature.label}</span>
                      {typeof value === 'string' && (
                        <span className="ml-auto font-medium text-gray-900 dark:text-white">
                          {value}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* CTA Button */}
              <div className="mt-auto">
                {isCurrentTier ? (
                  <div className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50 py-3 text-center text-sm font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    Current Plan
                  </div>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading !== null}
                    className={`
                      w-full rounded-xl py-3 text-sm font-bold text-white transition-all duration-300
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${tier === 'FLIPPER'
                        ? 'gradient-cta bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5'
                        : 'gradient-cta bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {upgrading === tier ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Redirecting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Upgrade to {tierLimits.name}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 text-center text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600">
                    Included in your plan
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ROI Messaging — shown to FREE users */}
      {data.tier === 'FREE' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px]">
            <div className="rounded-xl bg-white px-6 py-5 dark:bg-gray-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 p-2.5 dark:from-indigo-900 dark:to-purple-900">
                  <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    One good flip pays for a year of Flipper
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    The average flipper finds deals worth $100+ in profit. At just{' '}
                    {TIER_PRICING.FLIPPER.label}, Flipper pays for itself on your very
                    first find. Stop scrolling marketplace listings for hours — let AI
                    do the hunting.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500" data-testid="trust-signals">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Secure checkout via Stripe
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Cancel anytime, no contracts
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              30-day money-back guarantee
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function BillingSettingsSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800" data-testid="billing-skeleton">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
            <div className="space-y-4 animate-pulse">
              <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700 mx-auto" />
              <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
              <div className="h-10 w-24 rounded bg-gray-200 dark:bg-gray-700 mx-auto" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                ))}
              </div>
              <div className="h-11 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
