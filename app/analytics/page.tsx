/**
 * @file app/analytics/page.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief Profit & Loss analytics dashboard rebuilt on the canonical dark-glassmorphism design system.
 *
 * @description
 * Renders the user's flipping P&L: primary/secondary metric cards, granularity toggle (monthly/weekly),
 * date-range filter, three Recharts visualisations (Trends LineChart, Profit-by-Category BarChart,
 * Platform Performance BarChart), Best/Worst Deal cards, and a per-item table. All surfaces use canonical
 * .fp-glass / .fp-glass-sm / .fp-btn-primary / .fp-btn-ghost / .fp-badge / .fp-input utilities. Chart series
 * collapse to canonical purple palette with green reserved for the "Profit" series only (FR-UI-DESIGN-04 +
 * ADR-14.9-A). Loading / Error / Empty states consume the shared @/components/ui state components.
 * The CSV/PDF export flow, date-range filter mechanics, granularity toggle behaviour, and analytics fetch
 * lifecycle are preserved verbatim from the previous revision — Story 14.9 is a pure visual migration.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProfitLossSummary } from '@/lib/analytics-service';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { LoadingSkeleton, ErrorBanner, EmptyState } from '@/components/ui';

const TEXT_PRIMARY = '#e2e8f0';
const TEXT_SECONDARY = '#94a3b8';
const PURPLE_ACCENT = '#c4b5fd';
const PROFIT_GREEN = '#34d399';
const DANGER_RED = '#f87171';
const PURPLE_PRIMARY = '#7c3aed';
const PURPLE_TERTIARY = '#c4b5fd';
const GRID_LINE = 'rgba(255,255,255,0.06)';
const TOOLTIP_BG = 'rgba(15,23,42,0.95)';
const TOOLTIP_BORDER = '1px solid rgba(255,255,255,0.1)';
const ACTIVE_TOGGLE_BG = 'rgba(124,58,237,0.15)';

const TOOLTIP_CONTENT_STYLE = {
  background: TOOLTIP_BG,
  border: TOOLTIP_BORDER,
  color: TEXT_PRIMARY,
  borderRadius: 8,
} as const;
const TOOLTIP_LABEL_STYLE = { color: TEXT_SECONDARY } as const;
const TOOLTIP_ITEM_STYLE = { color: TEXT_PRIMARY } as const;

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function ProfitBadge({ value }: { value: number }) {
  return (
    <span
      style={{ color: value >= 0 ? PROFIT_GREEN : DANGER_RED, fontWeight: 600 }}
    >
      {formatCurrency(value)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  valueColor,
}: {
  label: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
}) {
  return (
    <div className="fp-glass-sm" style={{ padding: 16 }}>
      <p style={{ color: TEXT_SECONDARY, fontSize: 13 }}>{label}</p>
      <p
        className="fp-metric-num"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: valueColor ?? TEXT_PRIMARY,
          marginTop: 4,
        }}
      >
        {value}
      </p>
      {subtitle && (
        <p style={{ color: TEXT_SECONDARY, fontSize: 12, marginTop: 4 }}>{subtitle}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PURCHASED: 'fp-badge fp-badge-yellow',
    LISTED: 'fp-badge fp-badge-blue',
    SOLD: 'fp-badge fp-badge-green',
  };
  const cls = map[status] ?? 'fp-badge fp-badge-gray';
  return <span className={cls}>{status}</span>;
}

const TOGGLE_BTN_BASE = 'fp-btn-ghost';
function toggleStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: ACTIVE_TOGGLE_BG, color: PURPLE_ACCENT }
    : {};
}

const TABLE_HEADER_CELL: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  color: TEXT_SECONDARY,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const TABLE_HEADER_CELL_RIGHT: React.CSSProperties = { ...TABLE_HEADER_CELL, textAlign: 'right' };
const TABLE_ROW_DIVIDER: React.CSSProperties = {
  borderTop: `1px solid ${GRID_LINE}`,
};
const TABLE_BODY_CELL: React.CSSProperties = {
  padding: '10px 12px',
  color: TEXT_PRIMARY,
  fontSize: 13,
};
const TABLE_BODY_CELL_RIGHT: React.CSSProperties = { ...TABLE_BODY_CELL, textAlign: 'right' };

export default function AnalyticsPage() {
  const [data, setData] = useState<ProfitLossSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ granularity });
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fetch(`/api/analytics/profit-loss?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load analytics');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [granularity, dateFrom, dateTo]);

  async function handleExportCsv() {
    setExportingCsv(true);
    setExportError(null);
    try {
      const params = new URLSearchParams({ format: 'csv', granularity });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/analytics/export?${params}`);
      if (!res.ok) throw new Error('CSV export failed. Please try again.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flipper-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'CSV export failed.');
    } finally {
      setExportingCsv(false);
    }
  }

  async function handleExportPdf() {
    if (!data) return;
    setExportingPdf(true);
    setExportError(null);
    try {
      const { generateAnalyticsPdf } = await import('@/lib/analytics-pdf-export');
      generateAnalyticsPdf(data, granularity);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PDF export failed.');
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 16px', maxWidth: 1280, margin: '0 auto' }}>
        <ErrorBanner message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 16px',
        maxWidth: 1280,
        margin: '0 auto',
        color: TEXT_PRIMARY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT_PRIMARY }}>📊 Profit & Loss Dashboard</h1>
          <p style={{ color: TEXT_SECONDARY, marginTop: 4 }}>Track your flipping performance</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportingCsv || !data}
              className="fp-btn-ghost"
              data-testid="analytics-export-csv"
            >
              {exportingCsv ? 'Exporting…' : '⬇ Export CSV'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || !data}
              className="fp-btn-primary"
              data-testid="analytics-export-pdf"
            >
              {exportingPdf ? 'Generating…' : '⬇ Export PDF'}
            </button>
            <Link href="/" style={{ color: PURPLE_ACCENT, textDecoration: 'none' }} className="hover:underline">← Back</Link>
          </div>
          {exportError && (
            <p style={{ color: DANGER_RED, fontSize: 12 }}>{exportError}</p>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="fp-glass-sm" style={{ padding: 16, marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY }}>Date Range:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="fp-input"
          style={{ width: 'auto' }}
          aria-label="Filter analytics from date"
        />
        <span style={{ color: TEXT_SECONDARY }}>to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="fp-input"
          style={{ width: 'auto' }}
          aria-label="Filter analytics to date"
        />
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            style={{ fontSize: 13, color: PURPLE_ACCENT, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Primary Metrics — 4 cards per AC #1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(data.totalNetProfit)}
          valueColor={data.totalNetProfit >= 0 ? PROFIT_GREEN : DANGER_RED}
        />
        <SummaryCard label="Flips Completed" value={String(data.completedDeals)} />
        <SummaryCard
          label="Avg Profit / Flip"
          value={formatCurrency(data.avgProfitPerFlip)}
          valueColor={data.avgProfitPerFlip >= 0 ? PROFIT_GREEN : DANGER_RED}
        />
        <SummaryCard
          label="Success Rate"
          value={`${data.successRate}%`}
          subtitle={`${data.completedDeals} sold of ${data.items.length} total`}
        />
      </div>

      {/* Secondary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <SummaryCard label="Total Invested" value={formatCurrency(data.totalInvested)} />
        <SummaryCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <SummaryCard
          label="Overall ROI"
          value={`${data.overallROI}%`}
          valueColor={data.overallROI >= 0 ? PROFIT_GREEN : DANGER_RED}
        />
        <SummaryCard label="Avg Days Held" value={String(data.avgDaysHeld)} />
      </div>

      {/* Granularity Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setGranularity('monthly')}
          aria-pressed={granularity === 'monthly'}
          className={TOGGLE_BTN_BASE}
          style={toggleStyle(granularity === 'monthly')}
          data-testid="granularity-monthly"
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setGranularity('weekly')}
          aria-pressed={granularity === 'weekly'}
          className={TOGGLE_BTN_BASE}
          style={toggleStyle(granularity === 'weekly')}
          data-testid="granularity-weekly"
        >
          Weekly
        </button>
      </div>

      {/* Monthly Trends Line Chart — AC #1 */}
      {data.trends.length > 0 && (
        <section style={{ marginBottom: 32 }} data-testid="analytics-trends-chart">
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: TEXT_PRIMARY }}>📈 Monthly Trends</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                <XAxis dataKey="period" stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} />
                <YAxis stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  formatter={(val: number | undefined) => formatCurrency(val ?? 0)}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Line type="monotone" dataKey="profit" stroke={PROFIT_GREEN} name="Profit" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke={PURPLE_PRIMARY} name="Revenue" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="costs" stroke={PURPLE_TERTIARY} name="Cost" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <LoadingSkeleton variant="card" />
          )}
        </section>
      )}

      {/* Profit by Category Bar Chart — AC #1 */}
      {data.categoryBreakdown.length > 0 && (
        <section style={{ marginBottom: 32 }} data-testid="analytics-category-chart">
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: TEXT_PRIMARY }}>📦 Profit by Category</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                <XAxis type="number" stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                <YAxis type="category" dataKey="category" width={120} stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number | undefined) => formatCurrency(val ?? 0)}
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Bar dataKey="totalProfit" name="Profit" fill={PROFIT_GREEN} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <LoadingSkeleton variant="card" />
          )}
        </section>
      )}

      {/* Platform Performance — AC #1 */}
      {data.platformBreakdown.length > 0 && (
        <section style={{ marginBottom: 32 }} data-testid="analytics-platform-chart">
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: TEXT_PRIMARY }}>🏪 Platform Performance</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.platformBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} />
                <XAxis dataKey="platform" stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} tickFormatter={(v: string) => v.replace('_MARKETPLACE', '')} />
                <YAxis stroke={TEXT_SECONDARY} tick={{ fill: TEXT_SECONDARY, fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  formatter={(val: number | undefined, name: string | undefined) =>
                    name === 'totalProfit' ? [formatCurrency(val ?? 0), 'Total Profit'] : [formatCurrency(val ?? 0), 'Avg Profit']
                  }
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Bar dataKey="totalProfit" name="totalProfit" fill={PURPLE_PRIMARY} />
                <Bar dataKey="avgProfit" name="avgProfit" fill={PURPLE_TERTIARY} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <LoadingSkeleton variant="card" />
          )}
          <div className="fp-glass" style={{ marginTop: 16, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TABLE_HEADER_CELL}>Platform</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Deals</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Total Profit</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Avg Profit</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.platformBreakdown.map((p) => (
                  <tr key={p.platform} style={TABLE_ROW_DIVIDER}>
                    <td style={TABLE_BODY_CELL}>{p.platform.replace('_MARKETPLACE', '')}</td>
                    <td style={TABLE_BODY_CELL_RIGHT}>{p.count}</td>
                    <td style={TABLE_BODY_CELL_RIGHT}><ProfitBadge value={p.totalProfit} /></td>
                    <td style={TABLE_BODY_CELL_RIGHT}><ProfitBadge value={p.avgProfit} /></td>
                    <td style={TABLE_BODY_CELL_RIGHT}>{p.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Best/Worst Deals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {data.bestDeal && (
          <div className="fp-glass" style={{ padding: 16 }} data-testid="analytics-best-deal">
            <h3 style={{ fontWeight: 600, marginBottom: 8, color: PROFIT_GREEN }}>🏆 Best Deal</h3>
            <p style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{data.bestDeal.title}</p>
            <p style={{ fontSize: 13, color: TEXT_SECONDARY }}>{data.bestDeal.platform}</p>
            <p className="fp-metric-num" style={{ fontSize: 18, fontWeight: 700, color: PROFIT_GREEN, marginTop: 8 }}>
              {formatCurrency(data.bestDeal.netProfit)} ({data.bestDeal.roiPercent}% ROI)
            </p>
          </div>
        )}
        {data.worstDeal && (
          <div className="fp-glass" style={{ padding: 16 }} data-testid="analytics-worst-deal">
            <h3 style={{ fontWeight: 600, marginBottom: 8, color: DANGER_RED }}>📉 Worst Deal</h3>
            <p style={{ fontWeight: 500, color: TEXT_PRIMARY }}>{data.worstDeal.title}</p>
            <p style={{ fontSize: 13, color: TEXT_SECONDARY }}>{data.worstDeal.platform}</p>
            <p className="fp-metric-num" style={{ fontSize: 18, fontWeight: 700, color: DANGER_RED, marginTop: 8 }}>
              {formatCurrency(data.worstDeal.netProfit)} ({data.worstDeal.roiPercent}% ROI)
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      {data.items.length > 0 && (
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: TEXT_PRIMARY }}>📋 All Deals ({data.items.length})</h2>
          <div className="fp-glass" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={TABLE_HEADER_CELL}>Item</th>
                  <th style={TABLE_HEADER_CELL}>Platform</th>
                  <th style={TABLE_HEADER_CELL}>Status</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Bought</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Sold</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Profit</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>ROI</th>
                  <th style={TABLE_HEADER_CELL_RIGHT}>Days</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} style={TABLE_ROW_DIVIDER}>
                    <td style={{ ...TABLE_BODY_CELL, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                    <td style={TABLE_BODY_CELL}>{item.platform}</td>
                    <td style={TABLE_BODY_CELL}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td style={TABLE_BODY_CELL_RIGHT}>{formatCurrency(item.purchasePrice)}</td>
                    <td style={TABLE_BODY_CELL_RIGHT}>
                      {item.resalePrice ? formatCurrency(item.resalePrice) : '—'}
                    </td>
                    <td style={TABLE_BODY_CELL_RIGHT}>
                      <ProfitBadge value={item.netProfit} />
                    </td>
                    <td style={TABLE_BODY_CELL_RIGHT}>{item.roiPercent}%</td>
                    <td style={TABLE_BODY_CELL_RIGHT}>{item.daysHeld}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty State */}
      {data.items.length === 0 && (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            title="No analytics yet"
            message="Your analytics dashboard will populate as you purchase and sell items. Find a deal on the Opportunities page and mark it as purchased to get started."
            action={{ label: 'Browse Opportunities', href: '/opportunities', variant: 'primary' }}
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Link href="/scraper" className="fp-btn-ghost" style={{ textDecoration: 'none' }}>
              Start Scanning
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
