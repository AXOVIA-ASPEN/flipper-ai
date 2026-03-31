import { buildCsvContent, escapeCsvField } from '@/lib/analytics-export';
import type { ProfitLossItem } from '@/lib/analytics-service';

const baseItem: ProfitLossItem = {
  id: '1',
  title: 'Test Item',
  platform: 'EBAY',
  category: 'electronics',
  status: 'SOLD',
  purchasePrice: 100,
  resalePrice: 150,
  fees: 10,
  grossProfit: 50,
  netProfit: 40,
  roiPercent: 40,
  daysHeld: 14,
  purchaseDate: '2026-01-01T00:00:00.000Z',
  resaleDate: '2026-01-15T00:00:00.000Z',
};

describe('escapeCsvField', () => {
  it('returns empty string for null', () => {
    expect(escapeCsvField(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('wraps field in quotes when it contains a comma', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  it('escapes double-quotes by doubling them', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps field in quotes when it contains a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('returns plain string for simple values', () => {
    expect(escapeCsvField('simple')).toBe('simple');
  });

  it('converts numbers to strings without formula prefix (numbers are safe)', () => {
    expect(escapeCsvField(42)).toBe('42');
    expect(escapeCsvField(3.14)).toBe('3.14');
    expect(escapeCsvField(-50)).toBe('-50');
  });

  describe('CSV injection protection', () => {
    it('prefixes "=" strings with tab to prevent formula injection', () => {
      const result = escapeCsvField('=HYPERLINK("http://evil.com","click")');
      expect(result).toMatch(/^"\t=/);
    });

    it('prefixes "+" strings with tab', () => {
      const result = escapeCsvField('+1-800-FRAUD');
      expect(result).toMatch(/^"\t\+/);
    });

    it('prefixes "-" strings with tab', () => {
      const result = escapeCsvField('-cmd formula');
      expect(result).toMatch(/^"\t-/);
    });

    it('prefixes "@" strings with tab', () => {
      const result = escapeCsvField('@SUM(1+1)');
      expect(result).toMatch(/^"\t@/);
    });

    it('does NOT prefix safe strings that happen to contain = later', () => {
      expect(escapeCsvField('price=100')).toBe('price=100');
    });
  });
});

describe('buildCsvContent', () => {
  it('returns header row only for empty items array', () => {
    const result = buildCsvContent([]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      'Title,Platform,Category,Status,Purchase Price,Sale Price,Fees,Gross Profit,Net Profit,ROI %,Days Held,Purchase Date,Sale Date'
    );
  });

  it('produces correct header columns', () => {
    const csv = buildCsvContent([]);
    expect(csv.split('\n')[0]).toContain('Title');
    expect(csv.split('\n')[0]).toContain('Platform');
    expect(csv.split('\n')[0]).toContain('Sale Date');
  });

  it('outputs 13 columns for a standard item', () => {
    const csv = buildCsvContent([baseItem]);
    const dataRow = csv.split('\n')[1];
    expect(dataRow.split(',').length).toBeGreaterThanOrEqual(13);
  });

  it('formats purchase date as YYYY-MM-DD', () => {
    const csv = buildCsvContent([baseItem]);
    expect(csv).toContain('2026-01-01');
  });

  it('formats resale date as YYYY-MM-DD', () => {
    const csv = buildCsvContent([baseItem]);
    expect(csv).toContain('2026-01-15');
  });

  it('leaves sale date empty when resaleDate is null', () => {
    const item = { ...baseItem, resalePrice: null, resaleDate: null };
    const csv = buildCsvContent([item]);
    const dataRow = csv.split('\n')[1];
    // Last column (Sale Date) should be empty — row ends with comma
    expect(dataRow.endsWith(',')).toBe(true);
  });

  it('wraps title with comma in quotes', () => {
    const item = { ...baseItem, title: 'Laptop, Used' };
    const csv = buildCsvContent([item]);
    expect(csv).toContain('"Laptop, Used"');
  });

  it('escapes double-quote in title', () => {
    const item = { ...baseItem, title: 'Brand "New"' };
    const csv = buildCsvContent([item]);
    expect(csv).toContain('"Brand ""New"""');
  });

  it('handles null category', () => {
    const item = { ...baseItem, category: null };
    const csv = buildCsvContent([item]);
    // category column should be empty string
    const dataRow = csv.split('\n')[1];
    // Platform,,(empty),Status — two commas adjacent means empty category
    expect(dataRow).toContain('EBAY,,SOLD');
  });

  it('handles multiple items producing multiple data rows', () => {
    const items = [baseItem, { ...baseItem, id: '2', title: 'Second Item' }];
    const csv = buildCsvContent(items);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
  });
});
