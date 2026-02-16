/**
 * Analytics Aggregation Service for Flipper AI
 * Provides profit/loss, trends, and category breakdowns
 * @author Stephen Boyett
 */

import prisma from '@/lib/db';
import { calculateROI, ROIInput } from '@/lib/roi-calculator';

export interface ProfitLossItem {
  id: string;
  title: string;
  platform: string;
  category: string | null;
  status: string;
  purchasePrice: number;
  resalePrice: number | null;
  fees: number | null;
  grossProfit: number;
  netProfit: number;
  roiPercent: number;
  daysHeld: number;
  purchaseDate: string;
  resaleDate: string | null;
}

export interface TrendPoint {
  period: string; // YYYY-MM or YYYY-Www
  revenue: number;
  costs: number;
  profit: number;
  itemsSold: number;
  itemsPurchased: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  totalInvested: number;
  totalRevenue: number;
  totalProfit: number;
  avgROI: number;
  avgDaysToSell: number;
}

export interface ProfitLossSummary {
  totalInvested: number;
  totalRevenue: number;
  totalFees: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  overallROI: number;
  avgDaysHeld: number;
  completedDeals: number;
  activeDeals: number;
  winRate: number; // % of completed deals that were profitable
  bestDeal: ProfitLossItem | null;
  worstDeal: ProfitLossItem | null;
  items: ProfitLossItem[];
  trends: TrendPoint[];
  categoryBreakdown: CategoryBreakdown[];
}

function toTrendPeriod(date: Date, granularity: 'weekly' | 'monthly' = 'monthly'): string {
  if (granularity === 'weekly') {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const year = d.getFullYear();
    const weekNum = Math.ceil(
      ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
    );
    return `${year}-W${String(weekNum).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function getProfitLossAnalytics(
  userId?: string | null,
  granularity: 'weekly' | 'monthly' = 'monthly'
): Promise<ProfitLossSummary> {
  const where: Record<string, unknown> = {
    status: { in: ['PURCHASED', 'LISTED', 'SOLD'] },
    purchasePrice: { not: null },
    purchaseDate: { not: null },
  };

  if (userId) {
    where.OR = [{ userId }, { userId: null }];
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: { listing: true },
    orderBy: { purchaseDate: 'desc' },
  });

  const items: ProfitLossItem[] = opportunities
    .filter((opp) => opp.purchasePrice !== null && opp.purchaseDate !== null)
    .map((opp) => {
      const input: ROIInput = {
        purchasePrice: opp.purchasePrice!,
        resalePrice: opp.resalePrice,
        fees: opp.fees,
        purchaseDate: opp.purchaseDate!,
        resaleDate: opp.resaleDate,
      };
      const roi = calculateROI(input);

      return {
        id: opp.id,
        title: opp.listing.title,
        platform: opp.listing.platform,
        category: opp.listing.category,
        status: opp.status,
        purchasePrice: opp.purchasePrice!,
        resalePrice: opp.resalePrice,
        fees: opp.fees,
        grossProfit: roi.grossProfit,
        netProfit: roi.netProfit,
        roiPercent: roi.roiPercent,
        daysHeld: roi.daysHeld,
        purchaseDate: opp.purchaseDate!.toISOString(),
        resaleDate: opp.resaleDate?.toISOString() ?? null,
      };
    });

  // Summary
  const totalInvested = items.reduce((s, i) => s + i.purchasePrice, 0);
  const totalRevenue = items.reduce((s, i) => s + (i.resalePrice ?? 0), 0);
  const totalFees = items.reduce((s, i) => s + (i.fees ?? 0), 0);
  const totalGrossProfit = totalRevenue - totalInvested;
  const totalNetProfit = items.reduce((s, i) => s + i.netProfit, 0);
  const overallROI = totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : 0;
  const avgDaysHeld = items.length > 0
    ? items.reduce((s, i) => s + i.daysHeld, 0) / items.length
    : 0;

  const completedItems = items.filter((i) => i.status === 'SOLD');
  const completedDeals = completedItems.length;
  const activeDeals = items.length - completedDeals;
  const winRate = completedDeals > 0
    ? (completedItems.filter((i) => i.netProfit > 0).length / completedDeals) * 100
    : 0;

  // Best/worst
  const sorted = [...items].sort((a, b) => b.netProfit - a.netProfit);
  const bestDeal = sorted.length > 0 ? sorted[0] : null;
  const worstDeal = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // Trends
  const trendMap = new Map<string, TrendPoint>();
  for (const item of items) {
    const purchasePeriod = toTrendPeriod(new Date(item.purchaseDate), granularity);
    if (!trendMap.has(purchasePeriod)) {
      trendMap.set(purchasePeriod, {
        period: purchasePeriod, revenue: 0, costs: 0, profit: 0,
        itemsSold: 0, itemsPurchased: 0,
      });
    }
    const pt = trendMap.get(purchasePeriod)!;
    pt.costs += item.purchasePrice;
    pt.itemsPurchased += 1;

    if (item.resaleDate) {
      const salePeriod = toTrendPeriod(new Date(item.resaleDate), granularity);
      if (!trendMap.has(salePeriod)) {
        trendMap.set(salePeriod, {
          period: salePeriod, revenue: 0, costs: 0, profit: 0,
          itemsSold: 0, itemsPurchased: 0,
        });
      }
      const sp = trendMap.get(salePeriod)!;
      sp.revenue += item.resalePrice ?? 0;
      sp.profit += item.netProfit;
      sp.itemsSold += 1;
    }
  }
  const trends = [...trendMap.values()].sort((a, b) => a.period.localeCompare(b.period));

  // Category breakdown
  const catMap = new Map<string, { items: ProfitLossItem[] }>();
  for (const item of items) {
    const cat = item.category || 'Uncategorized';
    if (!catMap.has(cat)) catMap.set(cat, { items: [] });
    catMap.get(cat)!.items.push(item);
  }
  const categoryBreakdown: CategoryBreakdown[] = [...catMap.entries()].map(([cat, data]) => {
    const catItems = data.items;
    const invested = catItems.reduce((s, i) => s + i.purchasePrice, 0);
    const revenue = catItems.reduce((s, i) => s + (i.resalePrice ?? 0), 0);
    const profit = catItems.reduce((s, i) => s + i.netProfit, 0);
    const avgROI = invested > 0 ? (profit / invested) * 100 : 0;
    const soldItems = catItems.filter((i) => i.status === 'SOLD');
    const avgDays = soldItems.length > 0
      ? soldItems.reduce((s, i) => s + i.daysHeld, 0) / soldItems.length
      : 0;
    return {
      category: cat,
      count: catItems.length,
      totalInvested: Math.round(invested * 100) / 100,
      totalRevenue: Math.round(revenue * 100) / 100,
      totalProfit: Math.round(profit * 100) / 100,
      avgROI: Math.round(avgROI * 100) / 100,
      avgDaysToSell: Math.round(avgDays),
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
    totalNetProfit: Math.round(totalNetProfit * 100) / 100,
    overallROI: Math.round(overallROI * 100) / 100,
    avgDaysHeld: Math.round(avgDaysHeld),
    completedDeals,
    activeDeals,
    winRate: Math.round(winRate * 100) / 100,
    bestDeal,
    worstDeal,
    items,
    trends,
    categoryBreakdown,
  };
}
