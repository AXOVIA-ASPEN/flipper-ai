'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProfitLossSummary } from '@/lib/analytics-service';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function ProfitBadge({ value }: { value: number }) {
  const color = value >= 0 ? 'text-green-600' : 'text-red-600';
  return <span className={`font-semibold ${color}`}>{formatCurrency(value)}</span>;
}

function SummaryCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PURCHASED: 'bg-yellow-100 text-yellow-800',
    LISTED: 'bg-blue-100 text-blue-800',
    SOLD: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">📊 Profit & Loss Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your flipping performance</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv || !data}
              className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
            >
              {exportingCsv ? 'Exporting…' : '⬇ Export CSV'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || !data}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {exportingPdf ? 'Generating…' : '⬇ Export PDF'}
            </button>
            <Link href="/" className="text-blue-600 hover:underline">← Back</Link>
          </div>
          {exportError && (
            <p className="text-xs text-red-600">{exportError}</p>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-600">Date Range:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Primary Metrics — 4 cards per AC #1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          label="Total Profit"
          value={formatCurrency(data.totalNetProfit)}
          color={data.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          label="Flips Completed"
          value={String(data.completedDeals)}
        />
        <SummaryCard
          label="Avg Profit / Flip"
          value={formatCurrency(data.avgProfitPerFlip)}
          color={data.avgProfitPerFlip >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          label="Success Rate"
          value={`${data.successRate}%`}
          subtitle={`${data.completedDeals} sold of ${data.items.length} total`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm">
        <SummaryCard label="Total Invested" value={formatCurrency(data.totalInvested)} />
        <SummaryCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <SummaryCard
          label="Overall ROI"
          value={`${data.overallROI}%`}
          color={data.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard label="Avg Days Held" value={String(data.avgDaysHeld)} />
      </div>

      {/* Granularity Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setGranularity('monthly')}
          className={`px-3 py-1 rounded ${granularity === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setGranularity('weekly')}
          className={`px-3 py-1 rounded ${granularity === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Weekly
        </button>
      </div>

      {/* Monthly Trends Line Chart — AC #2 */}
      {data.trends.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📈 Monthly Trends</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(val: number | undefined) => formatCurrency(val ?? 0)} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="costs" stroke="#f59e0b" name="Cost" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 animate-pulse bg-gray-100 rounded" />
          )}
        </section>
      )}

      {/* Profit by Category Bar Chart — AC #2 */}
      {data.categoryBreakdown.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📦 Profit by Category</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.categoryBreakdown} layout="vertical">
                <XAxis type="number" tickFormatter={(v: number) => `$${v}`} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number | undefined) => formatCurrency(val ?? 0)} />
                <Bar dataKey="totalProfit" name="Profit" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 animate-pulse bg-gray-100 rounded" />
          )}
        </section>
      )}

      {/* Platform Performance — AC #2 */}
      {data.platformBreakdown.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">🏪 Platform Performance</h2>
          {mounted ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.platformBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" tickFormatter={(v: string) => v.replace('_MARKETPLACE', '')} />
                <YAxis tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(val: number | undefined, name: string | undefined) =>
                  name === 'totalProfit' ? [formatCurrency(val ?? 0), 'Total Profit'] : [formatCurrency(val ?? 0), 'Avg Profit']
                } />
                <Bar dataKey="totalProfit" name="totalProfit" fill="#3b82f6" />
                <Bar dataKey="avgProfit" name="avgProfit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 animate-pulse bg-gray-100 rounded" />
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Platform</th>
                  <th className="text-right p-2 border">Deals</th>
                  <th className="text-right p-2 border">Total Profit</th>
                  <th className="text-right p-2 border">Avg Profit</th>
                  <th className="text-right p-2 border">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.platformBreakdown.map((p) => (
                  <tr key={p.platform} className="hover:bg-gray-50">
                    <td className="p-2 border">{p.platform.replace('_MARKETPLACE', '')}</td>
                    <td className="p-2 border text-right">{p.count}</td>
                    <td className="p-2 border text-right"><ProfitBadge value={p.totalProfit} /></td>
                    <td className="p-2 border text-right"><ProfitBadge value={p.avgProfit} /></td>
                    <td className="p-2 border text-right">{p.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Best/Worst Deals — AC #2 (best flip card) */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {data.bestDeal && (
          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold text-green-800 mb-2">🏆 Best Deal</h3>
            <p className="font-medium">{data.bestDeal.title}</p>
            <p className="text-sm text-gray-600">{data.bestDeal.platform}</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(data.bestDeal.netProfit)} ({data.bestDeal.roiPercent}% ROI)
            </p>
          </div>
        )}
        {data.worstDeal && (
          <div className="border rounded-lg p-4 bg-red-50">
            <h3 className="font-semibold text-red-800 mb-2">📉 Worst Deal</h3>
            <p className="font-medium">{data.worstDeal.title}</p>
            <p className="text-sm text-gray-600">{data.worstDeal.platform}</p>
            <p className="text-lg font-bold text-red-700">
              {formatCurrency(data.worstDeal.netProfit)} ({data.worstDeal.roiPercent}% ROI)
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      {data.items.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">📋 All Deals ({data.items.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Item</th>
                  <th className="text-left p-2 border">Platform</th>
                  <th className="text-left p-2 border">Status</th>
                  <th className="text-right p-2 border">Bought</th>
                  <th className="text-right p-2 border">Sold</th>
                  <th className="text-right p-2 border">Profit</th>
                  <th className="text-right p-2 border">ROI</th>
                  <th className="text-right p-2 border">Days</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-2 border max-w-xs truncate">{item.title}</td>
                    <td className="p-2 border">{item.platform}</td>
                    <td className="p-2 border">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-2 border text-right">{formatCurrency(item.purchasePrice)}</td>
                    <td className="p-2 border text-right">
                      {item.resalePrice ? formatCurrency(item.resalePrice) : '—'}
                    </td>
                    <td className="p-2 border text-right">
                      <ProfitBadge value={item.netProfit} />
                    </td>
                    <td className="p-2 border text-right">{item.roiPercent}%</td>
                    <td className="p-2 border text-right">{item.daysHeld}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Enhanced Empty State — AC #3 */}
      {data.items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📊</p>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No analytics yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your analytics dashboard will populate as you purchase and sell items.
            Find a deal on the <strong>Opportunities</strong> page and mark it as purchased to get started.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/opportunities"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Opportunities
            </Link>
            <Link
              href="/scraper"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Start Scanning
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
