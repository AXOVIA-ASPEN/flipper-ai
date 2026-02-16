/**
 * Performance Report Generation & Export Service
 * Generates weekly/monthly summaries with CSV export
 * @author Stephen Boyett
 */

export interface ReportOptions {
  userId: string;
  period: 'weekly' | 'monthly' | 'custom';
  startDate?: Date;
  endDate?: Date;
  format?: 'json' | 'csv';
}

export interface ReportSection {
  title: string;
  data: Record<string, string | number | boolean | null>[];
}

export interface PerformanceReport {
  id: string;
  userId: string;
  generatedAt: string;
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalFees: number;
    itemsSold: number;
    itemsPurchased: number;
    avgROI: number;
    winRate: number;
    avgDaysToSell: number;
    bestCategory: string | null;
  };
  sections: ReportSection[];
}

/**
 * Calculate date range for a given period
 */
export function getDateRange(
  period: 'weekly' | 'monthly' | 'custom',
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  const now = new Date();

  if (period === 'custom' && startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  // monthly
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

/**
 * Generate a unique report ID
 */
export function generateReportId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `rpt_${ts}_${rand}`;
}

/**
 * Build performance report from analytics data
 */
export function buildReport(
  userId: string,
  period: 'weekly' | 'monthly' | 'custom',
  dateRange: { start: Date; end: Date },
  items: Array<{
    id: string;
    title: string;
    platform: string;
    category: string | null;
    status: string;
    purchasePrice: number;
    resalePrice: number | null;
    fees: number | null;
    purchaseDate: Date;
    resaleDate: Date | null;
  }>
): PerformanceReport {
  const sold = items.filter(
    (i) => i.status === 'SOLD' && i.resalePrice != null
  );
  const purchased = items.filter(
    (i) => i.purchaseDate >= dateRange.start && i.purchaseDate <= dateRange.end
  );

  const totalRevenue = sold.reduce((s, i) => s + (i.resalePrice ?? 0), 0);
  const totalCost = sold.reduce((s, i) => s + i.purchasePrice, 0);
  const totalFees = sold.reduce((s, i) => s + (i.fees ?? 0), 0);
  const totalProfit = totalRevenue - totalCost - totalFees;

  const profitableDeals = sold.filter(
    (i) => (i.resalePrice ?? 0) - i.purchasePrice - (i.fees ?? 0) > 0
  );
  const winRate = sold.length > 0 ? (profitableDeals.length / sold.length) * 100 : 0;

  const daysToSell = sold
    .filter((i) => i.resaleDate)
    .map((i) => {
      const diff = (i.resaleDate!.getTime() - i.purchaseDate.getTime()) / 86400000;
      return Math.max(0, diff);
    });
  const avgDaysToSell =
    daysToSell.length > 0
      ? daysToSell.reduce((a, b) => a + b, 0) / daysToSell.length
      : 0;

  const avgROI =
    totalCost > 0 ? ((totalRevenue - totalCost - totalFees) / totalCost) * 100 : 0;

  // Category breakdown
  const categoryMap = new Map<string, { count: number; profit: number }>();
  for (const item of sold) {
    const cat = item.category ?? 'Uncategorized';
    const existing = categoryMap.get(cat) ?? { count: 0, profit: 0 };
    existing.count++;
    existing.profit += (item.resalePrice ?? 0) - item.purchasePrice - (item.fees ?? 0);
    categoryMap.set(cat, existing);
  }

  let bestCategory: string | null = null;
  let bestCatProfit = -Infinity;
  for (const [cat, data] of categoryMap) {
    if (data.profit > bestCatProfit) {
      bestCatProfit = data.profit;
      bestCategory = cat;
    }
  }

  const sections: ReportSection[] = [
    {
      title: 'Sold Items',
      data: sold.map((i) => ({
        id: i.id,
        title: i.title,
        platform: i.platform,
        category: i.category,
        purchasePrice: i.purchasePrice,
        resalePrice: i.resalePrice,
        fees: i.fees,
        profit: (i.resalePrice ?? 0) - i.purchasePrice - (i.fees ?? 0),
      })),
    },
    {
      title: 'Category Breakdown',
      data: Array.from(categoryMap.entries()).map(([cat, d]) => ({
        category: cat,
        itemsSold: d.count,
        totalProfit: Math.round(d.profit * 100) / 100,
      })),
    },
  ];

  return {
    id: generateReportId(),
    userId,
    generatedAt: new Date().toISOString(),
    period,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      itemsSold: sold.length,
      itemsPurchased: purchased.length,
      avgROI: Math.round(avgROI * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      avgDaysToSell: Math.round(avgDaysToSell * 10) / 10,
      bestCategory,
    },
    sections,
  };
}

/**
 * Convert report to CSV string
 */
export function reportToCSV(report: PerformanceReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`Performance Report - ${report.period}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Period: ${report.startDate} to ${report.endDate}`);
  lines.push('');

  // Summary
  lines.push('Summary');
  lines.push(`Total Revenue,${report.summary.totalRevenue}`);
  lines.push(`Total Cost,${report.summary.totalCost}`);
  lines.push(`Total Profit,${report.summary.totalProfit}`);
  lines.push(`Total Fees,${report.summary.totalFees}`);
  lines.push(`Items Sold,${report.summary.itemsSold}`);
  lines.push(`Items Purchased,${report.summary.itemsPurchased}`);
  lines.push(`Average ROI,${report.summary.avgROI}%`);
  lines.push(`Win Rate,${report.summary.winRate}%`);
  lines.push(`Avg Days to Sell,${report.summary.avgDaysToSell}`);
  lines.push(`Best Category,${report.summary.bestCategory ?? 'N/A'}`);
  lines.push('');

  // Sections
  for (const section of report.sections) {
    lines.push(section.title);
    if (section.data.length > 0) {
      const headers = Object.keys(section.data[0]);
      lines.push(headers.join(','));
      for (const row of section.data) {
        lines.push(
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return '';
              const str = String(val);
              return str.includes(',') ? `"${str}"` : str;
            })
            .join(',')
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
