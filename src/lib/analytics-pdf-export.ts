/**
 * @file src/lib/analytics-pdf-export.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Client-side PDF export for the analytics Profit & Loss report.
 *
 * @description
 * Generates a downloadable performance report (summary stats, trends table,
 * category breakdown, transaction table) via jsPDF + jspdf-autotable. Browser-only —
 * must be invoked via dynamic `import()` from a Client Component.
 * Satisfies Story 6.5 AC #2 (FR-DASH-08).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProfitLossSummary } from '@/lib/analytics-service';

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

export function generateAnalyticsPdf(data: ProfitLossSummary, granularity: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Flipper AI — Performance Report', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${today}  |  Period: ${granularity}`, 14, 28);

  // Summary stats
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, 40);
  autoTable(doc, {
    startY: 44,
    head: [['Metric', 'Value']],
    body: [
      ['Total Invested', formatCurrency(data.totalInvested)],
      ['Total Revenue', formatCurrency(data.totalRevenue)],
      ['Net Profit', formatCurrency(data.totalNetProfit)],
      ['Overall ROI', `${data.overallROI}%`],
      ['Completed Deals', String(data.completedDeals)],
      ['Active Deals', String(data.activeDeals)],
      ['Win Rate', `${data.winRate}%`],
      ['Avg Days Held', String(data.avgDaysHeld)],
    ],
    theme: 'striped',
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60 } },
    margin: { left: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSummary = (doc as any).lastAutoTable.finalY + 10;

  // Trends table
  if (data.trends.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Trends', 14, afterSummary);
    autoTable(doc, {
      startY: afterSummary + 4,
      head: [['Period', 'Purchased', 'Sold', 'Costs', 'Revenue', 'Profit']],
      body: data.trends.map((t) => [
        t.period,
        String(t.itemsPurchased),
        String(t.itemsSold),
        formatCurrency(t.costs),
        formatCurrency(t.revenue),
        formatCurrency(t.profit),
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      margin: { left: 14 },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTrends = (doc as any).lastAutoTable.finalY + 10;

  // Category breakdown
  if (data.categoryBreakdown.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Category Breakdown', 14, afterTrends);
    autoTable(doc, {
      startY: afterTrends + 4,
      head: [['Category', 'Items', 'Invested', 'Revenue', 'Profit', 'Avg ROI']],
      body: data.categoryBreakdown.map((c) => [
        c.category,
        String(c.count),
        formatCurrency(c.totalInvested),
        formatCurrency(c.totalRevenue),
        formatCurrency(c.totalProfit),
        `${c.avgROI}%`,
      ]),
      theme: 'striped',
      styles: { fontSize: 8 },
      margin: { left: 14 },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterCategories = (doc as any).lastAutoTable.finalY + 10;

  // Transaction table
  if (data.items.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('All Transactions', 14, afterCategories);
    autoTable(doc, {
      startY: afterCategories + 4,
      head: [['Title', 'Platform', 'Status', 'Bought', 'Sold', 'Profit', 'ROI']],
      body: data.items.map((item) => [
        item.title.slice(0, 30) + (item.title.length > 30 ? '…' : ''),
        item.platform,
        item.status,
        formatCurrency(item.purchasePrice),
        item.resalePrice ? formatCurrency(item.resalePrice) : '—',
        formatCurrency(item.netProfit),
        `${item.roiPercent}%`,
      ]),
      theme: 'striped',
      styles: { fontSize: 7 },
      margin: { left: 14 },
    });
  }

  const filename = `flipper-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
