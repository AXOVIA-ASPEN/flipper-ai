/**
 * @file src/components/BillingSettings.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.1
 * @brief Conversion-focused billing settings with pricing cards and shimmer effects.
 *
 * @description
 * Premium billing component with glassmorphism pricing cards, animated shimmer
 * highlights, scan-limit progress bar, trust signals, and ROI-driven messaging
 * designed to drive subscription upgrades. Displays current plan, feature
 * comparison, and Stripe-powered upgrade/billing flows. Story 14.8 completed
 * the canonical-surface migration — tier badges use `.fp-badge-*`, the scan
 * progress bar uses the canonical track + purple gradient fill, the Manage
 * Billing button uses `.fp-btn-ghost`, and the mixed-accent upgrade gradients
 * collapse to a single purple accent per FR-UI-DESIGN-04 + ADR-14.7-C.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ToastContainer';
import { EmptyState } from '@/components/ui';
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
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  number: string | null;
  createdAt: number;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
}

const INVOICE_STATUS_BADGE: Record<InvoiceRow['status'], string> = {
  paid: 'fp-badge fp-badge-green',
  pending: 'fp-badge fp-badge-yellow',
  failed: 'fp-badge fp-badge-red',
};

function formatInvoiceAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

function formatInvoiceDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

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
    gradient: '',
    border: '',
    badge: 'fp-badge fp-badge-gray',
    tagline: 'Get started free',
    daily: '',
  },
  FLIPPER: {
    icon: Zap,
    gradient: '',
    border: '',
    badge: 'fp-badge fp-badge-purple',
    tagline: 'Most popular for flippers',
    daily: 'Less than a coffee/day',
  },
  PRO: {
    icon: Crown,
    gradient: '',
    border: '',
    badge: 'fp-badge fp-badge-yellow',
    tagline: 'Maximum earning power',
    daily: 'Pays for itself in one flip',
  },
};

export default function BillingSettings() {
  const { showToast } = useToast();
  const [data, setData] = useState<SubscriptionData>({ tier: 'FREE', scansToday: 0 });
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const res = await fetch('/api/invoices');
      if (!res.ok) {
        setInvoicesError('Unable to load invoices');
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setInvoices(json.data as InvoiceRow[]);
      } else if (json.success) {
        // API returned success without an array — treat as zero invoices.
        setInvoices([]);
      } else {
        setInvoicesError('Unable to load invoices');
      }
    } catch {
      setInvoicesError('Unable to load invoices');
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

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
      style={{ padding: 8 }}
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
          <Sparkles className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          <h2 className="text-2xl font-bold" style={{ color: '#e2e8f0' }}>
            Subscription & Billing
          </h2>
        </div>
        {isPaid && (
          <button
            onClick={handleManageBilling}
            className="fp-btn-ghost"
          >
            <CreditCard className="w-4 h-4" />
            Manage Billing
          </button>
        )}
      </div>

      {/* Current plan summary with scan progress */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm" style={{ color: '#94a3b8' }}>Current plan:</span>
          <span className={TIER_META[data.tier].badge}>
            {limits.name}
          </span>
          {data.tier !== 'FREE' && (
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {TIER_PRICING[data.tier].label}
            </span>
          )}
        </div>

        {/* Scan usage progress bar — nudges FREE users toward limit */}
        {limits.scansPerDay && (
          <div className="max-w-md" data-testid="scan-progress">
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: '#94a3b8' }}>
                {data.scansToday} of {limits.scansPerDay} daily scans used
              </span>
              {data.scansToday >= limits.scansPerDay * 0.8 && (
                <span className="font-medium" style={{ color: '#fcd34d' }}>
                  {data.scansToday >= limits.scansPerDay ? 'Limit reached' : 'Almost there'}
                </span>
              )}
            </div>
            <div
              className="overflow-hidden"
              style={{ height: '8px', width: '100%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '4px',
                  transition: 'width 500ms ease',
                  width: `${Math.min((data.scansToday / limits.scansPerDay) * 100, 100)}%`,
                  background:
                    data.scansToday >= limits.scansPerDay
                      ? 'linear-gradient(90deg, #f87171, #fca5a5)'
                      : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                }}
              />
            </div>
            {data.scansToday >= limits.scansPerDay && (
              <p className="text-xs mt-1.5" style={{ color: '#fcd34d' }}>
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
              className={`relative rounded-2xl p-6 transition-all duration-300 fp-glass-sm ${
                isCurrentTier ? 'ring-2 ring-offset-2' : 'hover:scale-[1.02]'
              } ${isPopular && !isCurrentTier ? 'shimmer-border glow-card' : ''}`}
              style={{
                border: '2px solid rgba(255,255,255,0.1)',
                ...(isCurrentTier ? { boxShadow: '0 0 0 2px #7c3aed, 0 0 0 4px rgba(15,23,42,0.5)' } : {}),
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div
                    className="shimmer-badge float-badge relative flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold shadow-lg"
                    style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', color: '#f1f5f9' }}
                  >
                    <Star className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Tier header */}
              <div className="text-center mb-6 pt-2">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                  style={{
                    background:
                      tier === 'FREE'
                        ? 'rgba(148,163,184,0.15)'
                        : tier === 'FLIPPER'
                        ? 'rgba(124,58,237,0.15)'
                        : 'rgba(251,191,36,0.15)',
                  }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{
                      color:
                        tier === 'FREE'
                          ? '#94a3b8'
                          : tier === 'FLIPPER'
                          ? '#c4b5fd'
                          : '#fcd34d',
                    }}
                  />
                </div>
                <h3 className="text-xl font-bold" style={{ color: '#e2e8f0' }}>
                  {tierLimits.name}
                </h3>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  {meta.tagline}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold" style={{ color: '#e2e8f0' }}>
                    {pricing.monthly === 0 ? '$0' : `$${pricing.monthly / 100}`}
                  </span>
                  <span className="text-sm" style={{ color: '#94a3b8' }}>/mo</span>
                </div>
                {meta.daily && (
                  <p className="font-medium mt-1 text-xs" style={{ color: '#c4b5fd' }}>
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
                    <li key={feature.label} className="flex items-center gap-2 text-sm" style={{ color: hasFeature ? '#94a3b8' : '#475569' }}>
                      {hasFeature ? (
                        <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0" style={{ color: '#475569' }} />
                      )}
                      <span>{feature.label}</span>
                      {typeof value === 'string' && (
                        <span className="ml-auto font-medium" style={{ color: '#e2e8f0' }}>
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
                  <div
                    className="w-full rounded-xl py-3 text-center text-sm font-semibold"
                    style={{
                      border: '2px solid rgba(124,58,237,0.4)',
                      background: 'rgba(124,58,237,0.1)',
                      color: '#c4b5fd',
                    }}
                  >
                    Current Plan
                  </div>
                ) : canUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading !== null}
                    className="gradient-cta fp-btn-primary w-full"
                    style={{
                      padding: '12px',
                      fontSize: '14px',
                      background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
                      backgroundSize: '200% 200%',
                    }}
                  >
                    {upgrading === tier ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full animate-spin"
                          style={{ border: '2px solid #f1f5f9', borderTopColor: 'transparent' }}
                        />
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
                  <div className="fp-glass-sm w-full rounded-xl py-3 text-center text-sm" style={{ color: '#94a3b8' }}>
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
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ padding: '1px', background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)' }}
          >
            <div className="fp-glass-sm rounded-xl px-6 py-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 rounded-lg p-2.5"
                  style={{ background: 'rgba(124,58,237,0.15)' }}
                >
                  <TrendingUp className="w-6 h-6" style={{ color: '#c4b5fd' }} />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#e2e8f0' }}>
                    One good flip pays for a year of Flipper
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
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
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs" style={{ color: '#64748b' }} data-testid="trust-signals">
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

      {/* Invoice history (Story 14.8 AC #5) */}
      <section className="mt-10" aria-labelledby="invoice-history-heading" data-testid="invoice-history">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5" style={{ color: '#8b5cf6' }} />
          <h3 id="invoice-history-heading" className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
            Invoice History
          </h3>
        </div>

        <div className="fp-glass p-6">
          {invoicesLoading ? (
            <div className="space-y-3" data-testid="invoice-history-loading">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 w-full rounded animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              ))}
            </div>
          ) : invoicesError ? (
            <div className="fp-alert-warn p-3 text-sm" data-testid="invoice-history-error" style={{ color: '#fcd34d' }}>
              {invoicesError}{' '}
              <button onClick={() => void fetchInvoices()} className="underline" style={{ color: '#c4b5fd' }}>
                Retry
              </button>
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              message="Your invoice history will appear here once you have an active subscription."
              data-testid="invoice-history-empty"
            />
          ) : (
            <div className="overflow-x-auto" data-testid="invoice-history-table-wrap">
              <table className="w-full text-sm" data-testid="invoice-history-table">
                <thead>
                  <tr style={{ color: '#94a3b8' }} className="text-left">
                    <th className="font-medium pb-3 pr-4">Invoice</th>
                    <th className="font-medium pb-3 pr-4">Date</th>
                    <th className="font-medium pb-3 pr-4">Amount</th>
                    <th className="font-medium pb-3 pr-4">Status</th>
                    <th className="font-medium pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      style={{ color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <td className="py-3 pr-4 font-mono text-xs">
                        {invoice.number ?? invoice.id.slice(0, 12)}
                      </td>
                      <td className="py-3 pr-4">{formatInvoiceDate(invoice.createdAt)}</td>
                      <td className="py-3 pr-4">
                        {formatInvoiceAmount(invoice.amount, invoice.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={INVOICE_STATUS_BADGE[invoice.status]}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {invoice.invoicePdfUrl && (
                            <a
                              href={invoice.invoicePdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                              style={{ color: '#c4b5fd' }}
                              aria-label={`Download PDF for invoice ${invoice.number ?? invoice.id}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </a>
                          )}
                          {invoice.hostedInvoiceUrl && (
                            <a
                              href={invoice.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
                              style={{ color: '#c4b5fd' }}
                              aria-label={`View invoice ${invoice.number ?? invoice.id} on Stripe`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function BillingSettingsSkeleton() {
  const skeletonStyle = { background: 'rgba(255,255,255,0.06)' };
  return (
    <div style={{ padding: 8 }} data-testid="billing-skeleton">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-6 w-6 rounded animate-pulse" style={skeletonStyle} />
        <div className="h-7 w-48 rounded animate-pulse" style={skeletonStyle} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="fp-glass-sm rounded-2xl p-6">
            <div className="space-y-4 animate-pulse">
              <div className="h-12 w-12 rounded-xl mx-auto" style={skeletonStyle} />
              <div className="h-5 w-20 rounded mx-auto" style={skeletonStyle} />
              <div className="h-10 w-24 rounded mx-auto" style={skeletonStyle} />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 w-full rounded" style={skeletonStyle} />
                ))}
              </div>
              <div className="h-11 w-full rounded-xl" style={skeletonStyle} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
