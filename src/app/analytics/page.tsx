'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProfitLossItem {
  id: string;
  title: string;
  platform: string;
  category: string | null;
  status: string;
  purchasePrice: number;
  resalePrice: number | null;
  netProfit: number;
  roiPercent: number;
  daysHeld: number;
}

interface TrendPoint {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
  itemsSold: number;
  itemsPurchased: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  totalInvested: number;
  totalRevenue: number;
  totalProfit: number;
  avgROI: number;
  avgDaysToSell: number;
}

interface Analytics {
  totalInvested: number;
  totalRevenue: number;
  totalFees: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  overallROI: number;
  avgDaysHeld: number;
  completedDeals: number;
  activeDeals: number;
  winRate: number;
  bestDeal: ProfitLossItem | null;
  worstDeal: ProfitLossItem | null;
  items: ProfitLossItem[];
  trends: TrendPoint[];
  categoryBreakdown: CategoryBreakdown[];
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function ProfitBadge({ value }: { value: number }) {
  const color = value >= 0 ? 'text-green-600' : 'text-red-600';
  return <span className={`font-semibold ${color}`}>{formatCurrency(value)}</span>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<'monthly' | 'weekly'>('monthly');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/profit-loss?granularity=${granularity}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load analytics');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [granularity]);

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
        <Link href="/" className="text-blue-600 hover:underline">← Back</Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Total Invested" value={formatCurrency(data.totalInvested)} />
        <SummaryCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} />
        <SummaryCard
          label="Net Profit"
          value={formatCurrency(data.totalNetProfit)}
          color={data.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard
          label="Overall ROI"
          value={`${data.overallROI}%`}
          color={data.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <SummaryCard label="Completed Deals" value={String(data.completedDeals)} />
        <SummaryCard label="Active Deals" value={String(data.activeDeals)} />
        <SummaryCard label="Win Rate" value={`${data.winRate}%`} />
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

      {/* Trends Table */}
      {data.trends.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📈 Trends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Period</th>
                  <th className="text-right p-2 border">Purchased</th>
                  <th className="text-right p-2 border">Sold</th>
                  <th className="text-right p-2 border">Costs</th>
                  <th className="text-right p-2 border">Revenue</th>
                  <th className="text-right p-2 border">Profit</th>
                </tr>
              </thead>
              <tbody>
                {data.trends.map((t) => (
                  <tr key={t.period} className="hover:bg-gray-50">
                    <td className="p-2 border font-mono">{t.period}</td>
                    <td className="p-2 border text-right">{t.itemsPurchased}</td>
                    <td className="p-2 border text-right">{t.itemsSold}</td>
                    <td className="p-2 border text-right">{formatCurrency(t.costs)}</td>
                    <td className="p-2 border text-right">{formatCurrency(t.revenue)}</td>
                    <td className="p-2 border text-right">
                      <ProfitBadge value={t.profit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📦 Category Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border">Category</th>
                  <th className="text-right p-2 border">Items</th>
                  <th className="text-right p-2 border">Invested</th>
                  <th className="text-right p-2 border">Revenue</th>
                  <th className="text-right p-2 border">Profit</th>
                  <th className="text-right p-2 border">Avg ROI</th>
                  <th className="text-right p-2 border">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryBreakdown.map((c) => (
                  <tr key={c.category} className="hover:bg-gray-50">
                    <td className="p-2 border">{c.category}</td>
                    <td className="p-2 border text-right">{c.count}</td>
                    <td className="p-2 border text-right">{formatCurrency(c.totalInvested)}</td>
                    <td className="p-2 border text-right">{formatCurrency(c.totalRevenue)}</td>
                    <td className="p-2 border text-right">
                      <ProfitBadge value={c.totalProfit} />
                    </td>
                    <td className="p-2 border text-right">{c.avgROI}%</td>
                    <td className="p-2 border text-right">{c.avgDaysToSell}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Best/Worst Deals */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {data.bestDeal && (
          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="font-semibold text-green-800 mb-2">🏆 Best Deal</h3>
            <p className="font-medium">{data.bestDeal.title}</p>
            <p className="text-sm text-gray-600">{data.bestDeal.platform}</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(data.bestDeal.netProfit)} ({data.bestDeal.roiPercent}% ROI)</p>
          </div>
        )}
        {data.worstDeal && (
          <div className="border rounded-lg p-4 bg-red-50">
            <h3 className="font-semibold text-red-800 mb-2">📉 Worst Deal</h3>
            <p className="font-medium">{data.worstDeal.title}</p>
            <p className="text-sm text-gray-600">{data.worstDeal.platform}</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(data.worstDeal.netProfit)} ({data.worstDeal.roiPercent}% ROI)</p>
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

      {data.items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">🐧</p>
          <p className="text-lg">No deals tracked yet!</p>
          <p>Purchase items from your opportunities to see analytics here.</p>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
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
