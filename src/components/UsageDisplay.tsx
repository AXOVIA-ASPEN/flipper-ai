/**
 * @file src/components/UsageDisplay.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.0
 * @brief Displays monthly API usage (scans & analyses) with tier-appropriate limits.
 *
 * @description
 * Client component that fetches usage data from /api/usage and renders
 * scan/analysis counts. FREE tier: daily scan progress (today vs /10) plus
 * monthly totals; paid tiers: monthly scan totals without a daily cap.
 * Story 14.8 migrated to canonical glass surfaces, replaced the blue/red
 * Tailwind progress bar with a purple-to-violet gradient (`#7c3aed` →
 * `#a78bfa`) on a neutral track (`rgba(255,255,255,0.06)`), and added the
 * over-limit red-gradient + `.fp-alert-warn` state plus an "approaching
 * limit" `.fp-alert-info` notice at >=90% usage. Optional `used` / `limit`
 * props short-circuit the fetch for deterministic unit testing of the
 * 50/95/100/120% threshold matrix per AC #9. role="progressbar" with
 * aria-valuemin/max/now satisfies AC #18.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UsageData {
  scans: {
    usedToday: number;
    usedThisMonth: number;
    limitPerDay: number | null;
  };
  analyses: { usedThisMonth: number; limit: null };
  tier: string;
  periodStart: string;
  periodEnd: string;
}

interface UsageDisplayProps {
  /** Override fetched data — used for unit testing the threshold matrix (AC #9). */
  used?: number;
  /** Override fetched data — used for unit testing the threshold matrix (AC #9). */
  limit?: number;
}

const PURPLE_GRADIENT = 'linear-gradient(90deg, #7c3aed, #a78bfa)';
const RED_GRADIENT = 'linear-gradient(90deg, #f87171, #fca5a5)';
const TRACK_BG = 'rgba(255,255,255,0.06)';

/**
 * Pure render of the usage progress bar with threshold-aware styling.
 * Extracted so the four states (under, approaching, exact, over) are
 * deterministic from the (used, limit) inputs without needing fetch.
 */
function UsageBar({ used, limit, label }: { used: number; limit: number; label?: string }) {
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  const fillWidth = Math.min(percent, 100);
  const isOverLimit = used > limit;
  const isApproaching = limit > 0 && used >= limit * 0.9 && used <= limit;
  const fillBackground = isOverLimit ? RED_GRADIENT : PURPLE_GRADIENT;

  return (
    <div data-testid="usage-bar">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label ?? 'Usage'}</span>
        <span className="text-sm" style={{ color: '#94a3b8' }} data-testid="usage-readout">
          {used}/{limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        aria-valuetext={`${used} of ${limit}`}
        style={{ background: TRACK_BG, height: '8px', borderRadius: '4px' }}
        data-testid="usage-bar-track"
      >
        <div
          style={{
            background: fillBackground,
            height: '100%',
            width: `${fillWidth}%`,
            borderRadius: '4px',
            transition: 'width 300ms ease',
          }}
          data-testid="usage-bar-fill"
        />
      </div>
      {isApproaching && (
        <div className="fp-alert-info mt-2 p-2 text-xs" style={{ color: '#93c5fd' }} data-testid="usage-info-banner">
          You&apos;re approaching your limit.{' '}
          <Link href="/settings#billing" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>
            Upgrade
          </Link>{' '}
          for more.
        </div>
      )}
      {isOverLimit && (
        <div className="fp-alert-warn mt-2 p-2 text-xs" style={{ color: '#fcd34d' }} data-testid="usage-warn-banner">
          You&apos;ve exceeded your limit.{' '}
          <Link href="/settings#billing" style={{ color: '#c4b5fd', textDecoration: 'underline' }}>
            Upgrade
          </Link>{' '}
          for unlimited usage.
        </div>
      )}
    </div>
  );
}

export default function UsageDisplay({ used, limit }: UsageDisplayProps = {}) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const propOverride = typeof used === 'number' && typeof limit === 'number';

  useEffect(() => {
    if (propOverride) {
      setLoading(false);
      return;
    }
    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) {
          setError('Failed to load usage data');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setUsage(json.data);
        } else {
          setError('Failed to load usage data');
        }
      } catch {
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, [propOverride]);

  // Test harness path — render only the bar with explicit values.
  if (propOverride) {
    return (
      <div className="fp-glass-sm p-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Usage</h2>
        <UsageBar used={used!} limit={limit!} label="Scans" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fp-glass-sm p-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Usage</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-4 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="fp-glass-sm p-4">
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Usage</h2>
        <p className="text-sm" style={{ color: '#fca5a5' }}>{error ?? 'Unable to load usage data'}</p>
      </div>
    );
  }

  const isFree = usage.tier === 'FREE';
  const dailyLimit = usage.scans.limitPerDay;

  return (
    <div className="fp-glass-sm p-4">
      <h2 className="text-xl font-semibold mb-4" style={{ color: '#e2e8f0' }}>Usage This Month</h2>

      <div className="space-y-4">
        {isFree && dailyLimit ? (
          <UsageBar used={usage.scans.usedToday} limit={dailyLimit} label="Scans (today)" />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Scans</span>
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {usage.scans.usedThisMonth} scans this month
            </span>
          </div>
        )}

        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
          This month: {usage.scans.usedThisMonth} scan{usage.scans.usedThisMonth === 1 ? '' : 's'} recorded
        </p>

        {/* Analysis usage */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Analyses</span>
          <span className="text-sm" style={{ color: '#94a3b8' }}>
            {usage.analyses.usedThisMonth} analyses this month
          </span>
        </div>
      </div>
    </div>
  );
}
