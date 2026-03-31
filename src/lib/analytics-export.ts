import type { ProfitLossItem } from '@/lib/analytics-service';

const CSV_HEADERS = [
  'Title', 'Platform', 'Category', 'Status',
  'Purchase Price', 'Sale Price', 'Fees', 'Gross Profit', 'Net Profit',
  'ROI %', 'Days Held', 'Purchase Date', 'Sale Date',
];

export function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  // Numbers are safe from formula injection — write directly
  if (typeof value === 'number') return String(value);
  const str = String(value);
  // Prefix with tab to neutralise CSV formula injection (OWASP: =, +, -, @, |, %)
  const safe = /^[=+\-@|%]/.test(str) ? `\t${str}` : str;
  if (/[,"\n\r\t]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export function buildCsvContent(items: ProfitLossItem[]): string {
  const rows = [
    CSV_HEADERS.join(','),
    ...items.map((item) =>
      [
        escapeCsvField(item.title),
        escapeCsvField(item.platform),
        escapeCsvField(item.category),
        escapeCsvField(item.status),
        escapeCsvField(item.purchasePrice),
        escapeCsvField(item.resalePrice),
        escapeCsvField(item.fees),
        escapeCsvField(item.grossProfit),
        escapeCsvField(item.netProfit),
        escapeCsvField(item.roiPercent),
        escapeCsvField(item.daysHeld),
        escapeCsvField(item.purchaseDate.slice(0, 10)),
        escapeCsvField(item.resaleDate ? item.resaleDate.slice(0, 10) : null),
      ].join(',')
    ),
  ];
  return rows.join('\n');
}
