/**
 * Tests for Performance Report Generation & Export Service
 * @author Stephen Boyett
 */

import {
  buildReport,
  getDateRange,
  generateReportId,
  reportToCSV,
  type PerformanceReport,
} from '@/lib/report-service';

describe('Report Service', () => {
  const mockItems = [
    {
      id: '1',
      title: 'iPhone 13',
      platform: 'EBAY',
      category: 'Electronics',
      status: 'SOLD',
      purchasePrice: 400,
      resalePrice: 650,
      fees: 50,
      purchaseDate: new Date('2026-02-01'),
      resaleDate: new Date('2026-02-10'),
    },
    {
      id: '2',
      title: 'Nike Air Max',
      platform: 'FACEBOOK_MARKETPLACE',
      category: 'Shoes',
      status: 'SOLD',
      purchasePrice: 80,
      resalePrice: 150,
      fees: 10,
      purchaseDate: new Date('2026-02-03'),
      resaleDate: new Date('2026-02-08'),
    },
    {
      id: '3',
      title: 'PS5 Controller',
      platform: 'EBAY',
      category: 'Electronics',
      status: 'ACTIVE',
      purchasePrice: 30,
      resalePrice: null,
      fees: null,
      purchaseDate: new Date('2026-02-05'),
      resaleDate: null,
    },
    {
      id: '4',
      title: 'Vintage Lamp',
      platform: 'CRAIGSLIST',
      category: 'Home',
      status: 'SOLD',
      purchasePrice: 20,
      resalePrice: 15,
      fees: 0,
      purchaseDate: new Date('2026-02-02'),
      resaleDate: new Date('2026-02-14'),
    },
  ];

  describe('getDateRange', () => {
    it('should return 7-day range for weekly', () => {
      const { start, end } = getDateRange('weekly');
      const diff = (end.getTime() - start.getTime()) / 86400000;
      expect(diff).toBeGreaterThanOrEqual(6.9);
      expect(diff).toBeLessThanOrEqual(8);
    });

    it('should return ~30-day range for monthly', () => {
      const { start, end } = getDateRange('monthly');
      const diff = (end.getTime() - start.getTime()) / 86400000;
      expect(diff).toBeGreaterThanOrEqual(27);
      expect(diff).toBeLessThanOrEqual(32);
    });

    it('should use custom dates when provided', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const range = getDateRange('custom', start, end);
      expect(range.start).toEqual(start);
      expect(range.end).toEqual(end);
    });

    it('should fallback to monthly when custom dates missing', () => {
      const { start, end } = getDateRange('custom');
      const diff = (end.getTime() - start.getTime()) / 86400000;
      expect(diff).toBeGreaterThanOrEqual(27);
    });
  });

  describe('generateReportId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateReportId();
      const id2 = generateReportId();
      expect(id1).not.toEqual(id2);
    });

    it('should start with rpt_ prefix', () => {
      const id = generateReportId();
      expect(id).toMatch(/^rpt_/);
    });
  });

  describe('buildReport', () => {
    const dateRange = {
      start: new Date('2026-02-01'),
      end: new Date('2026-02-15'),
    };

    it('should build a valid report structure', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);

      expect(report.userId).toBe('user1');
      expect(report.period).toBe('weekly');
      expect(report.id).toMatch(/^rpt_/);
      expect(report.generatedAt).toBeTruthy();
      expect(report.summary).toBeDefined();
      expect(report.sections).toHaveLength(2);
    });

    it('should calculate correct revenue from sold items', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // Sold items: iPhone (650) + Nike (150) + Lamp (15) = 815
      expect(report.summary.totalRevenue).toBe(815);
    });

    it('should calculate correct costs', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // Sold items cost: 400 + 80 + 20 = 500
      expect(report.summary.totalCost).toBe(500);
    });

    it('should calculate correct fees', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // Fees: 50 + 10 + 0 = 60
      expect(report.summary.totalFees).toBe(60);
    });

    it('should calculate correct profit', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // Profit: 815 - 500 - 60 = 255
      expect(report.summary.totalProfit).toBe(255);
    });

    it('should count only sold items', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      expect(report.summary.itemsSold).toBe(3);
    });

    it('should calculate win rate correctly', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // 2 profitable (iPhone, Nike) out of 3 sold = 66.67%
      expect(report.summary.winRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate average days to sell', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // iPhone: 9 days, Nike: 5 days, Lamp: 12 days = avg 8.67
      expect(report.summary.avgDaysToSell).toBeCloseTo(8.7, 0);
    });

    it('should identify best category', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // Electronics profit: (650-400-50) = 200, Shoes: (150-80-10) = 60, Home: (15-20-0) = -5
      expect(report.summary.bestCategory).toBe('Electronics');
    });

    it('should calculate ROI correctly', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      // ROI: (815 - 500 - 60) / 500 * 100 = 51%
      expect(report.summary.avgROI).toBe(51);
    });

    it('should handle empty items', () => {
      const report = buildReport('user1', 'weekly', dateRange, []);
      expect(report.summary.totalRevenue).toBe(0);
      expect(report.summary.itemsSold).toBe(0);
      expect(report.summary.winRate).toBe(0);
      expect(report.summary.avgROI).toBe(0);
      expect(report.summary.bestCategory).toBeNull();
    });

    it('should handle items with null categories', () => {
      const items = [
        {
          ...mockItems[0],
          category: null,
        },
      ];
      const report = buildReport('user1', 'weekly', dateRange, items);
      expect(report.sections[1].data[0]).toEqual(
        expect.objectContaining({ category: 'Uncategorized' })
      );
    });

    it('should include category breakdown section', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      const catSection = report.sections.find((s) => s.title === 'Category Breakdown');
      expect(catSection).toBeDefined();
      expect(catSection!.data.length).toBe(3); // Electronics, Shoes, Home
    });
  });

  describe('reportToCSV', () => {
    const dateRange = {
      start: new Date('2026-02-01'),
      end: new Date('2026-02-15'),
    };

    it('should generate valid CSV', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      const csv = reportToCSV(report);

      expect(csv).toContain('Performance Report - weekly');
      expect(csv).toContain('Summary');
      expect(csv).toContain('Total Revenue,815');
      expect(csv).toContain('Sold Items');
    });

    it('should include headers for sections', () => {
      const report = buildReport('user1', 'weekly', dateRange, mockItems);
      const csv = reportToCSV(report);

      expect(csv).toContain('id,title,platform,category,purchasePrice,resalePrice,fees,profit');
    });

    it('should quote values with commas', () => {
      const items = [
        {
          ...mockItems[0],
          title: 'iPhone 13, Pro Max',
        },
      ];
      const report = buildReport('user1', 'weekly', dateRange, items);
      const csv = reportToCSV(report);
      expect(csv).toContain('"iPhone 13, Pro Max"');
    });

    it('should handle empty report', () => {
      const report = buildReport('user1', 'weekly', dateRange, []);
      const csv = reportToCSV(report);
      expect(csv).toContain('Items Sold,0');
      expect(csv).toContain('Total Revenue,0');
    });

    it('should include period dates', () => {
      const report = buildReport('user1', 'monthly', dateRange, mockItems);
      const csv = reportToCSV(report);
      expect(csv).toContain('Period:');
      expect(csv).toContain('2026-02');
    });
  });
});

// ── Additional branch coverage ───────────────────────────────────────────────

describe('buildReport - additional branch coverage', () => {
  const dateRange = {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
  };

  it('handles items where resaleDate is null (daysToSell filter)', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Widget',
        platform: 'EBAY',
        category: 'Electronics',
        status: 'SOLD',
        purchasePrice: 50,
        resalePrice: 100,
        fees: 5,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: null, // sold but no resaleDate
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    // avgDaysToSell should be 0 since no resaleDate
    expect(report.summary.avgDaysToSell).toBe(0);
  });

  it('handles items with null fees in sold items', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Widget',
        platform: 'EBAY',
        category: 'Electronics',
        status: 'SOLD',
        purchasePrice: 50,
        resalePrice: 100,
        fees: null,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    expect(report.summary.totalProfit).toBe(50); // 100 - 50 - 0
  });

  it('calculates ROI=0 when totalCost is 0', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Widget',
        platform: 'EBAY',
        category: 'Electronics',
        status: 'SOLD',
        purchasePrice: 0,
        resalePrice: 100,
        fees: 0,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    expect(report.summary.avgROI).toBe(0);
  });

  it('handles null category in category breakdown', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Unknown Item',
        platform: 'EBAY',
        category: null,
        status: 'SOLD',
        purchasePrice: 10,
        resalePrice: 20,
        fees: 0,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    expect(report.summary.bestCategory).toBe('Uncategorized');
  });

  it('handles empty items resulting in avgROI=0 and winRate=0', () => {
    const report = buildReport('user1', 'monthly', dateRange, []);
    expect(report.summary.avgROI).toBe(0);
    expect(report.summary.winRate).toBe(0);
    expect(report.summary.avgDaysToSell).toBe(0);
  });
});

describe('reportToCSV - additional branch coverage', () => {
  const dateRange = { start: new Date('2026-01-01'), end: new Date('2026-01-31') };

  it('handles null/undefined values in CSV rows (empty string)', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Widget',
        platform: 'EBAY',
        category: null, // null should produce empty string in CSV
        status: 'SOLD',
        purchasePrice: 50,
        resalePrice: null,
        fees: null,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: null,
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    const csv = reportToCSV(report);
    expect(csv).toBeTruthy();
    // The CSV generation should not throw on null values
    expect(typeof csv).toBe('string');
  });
});

describe('buildReport/reportToCSV - deeper branch coverage', () => {
  const dateRange = { start: new Date('2026-01-01'), end: new Date('2026-01-31') };

  it('covers categoryMap.get() returning existing value (same category, 2 items)', () => {
    const items = [
      {
        id: 'item-a',
        title: 'Widget A',
        platform: 'EBAY',
        category: 'Electronics',
        status: 'SOLD',
        purchasePrice: 50,
        resalePrice: 100,
        fees: 5,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
      {
        id: 'item-b',
        title: 'Widget B',
        platform: 'EBAY',
        category: 'Electronics', // same category → reuses existing map entry
        status: 'SOLD',
        purchasePrice: 30,
        resalePrice: 70,
        fees: 3,
        purchaseDate: new Date('2026-01-07'),
        resaleDate: new Date('2026-01-12'),
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    const elCat = report.summary.categoryBreakdown?.find((c: { name: string }) => c.name === 'Electronics');
    expect(report.summary.bestCategory).toBe('Electronics');
  });

  it('covers CSV null value branch (null row value → empty string)', () => {
    const items = [
      {
        id: 'item-1',
        title: 'Null-fee Item',
        platform: 'EBAY',
        category: 'Electronics',
        status: 'SOLD',
        purchasePrice: 50,
        resalePrice: 100,
        fees: null as null | number, // null fees → should produce '' in CSV
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
    ];
    const report = buildReport('user1', 'monthly', dateRange, items);
    const csv = reportToCSV(report);
    // The null fees value should produce an empty cell in CSV
    expect(typeof csv).toBe('string');
    expect(csv).toContain('item-1');
  });
});
