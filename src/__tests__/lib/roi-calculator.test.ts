/**
 * Tests for ROI & Holding Cost Calculator
 * @author Stephen Boyett
 */

import { calculateROI, calculatePortfolioROI, ROIInput } from '@/lib/roi-calculator';

describe('calculateROI', () => {
  it('calculates ROI for a completed flip', () => {
    const result = calculateROI({
      purchasePrice: 100,
      resalePrice: 200,
      fees: 15,
      purchaseDate: new Date('2026-01-01'),
      resaleDate: new Date('2026-01-11'), // 10 days
    });

    expect(result.isComplete).toBe(true);
    expect(result.daysHeld).toBe(10);
    expect(result.grossProfit).toBe(100);
    expect(result.dailyCarryingCost).toBe(0.1); // 100 * 0.001
    expect(result.totalCarryingCost).toBe(1); // 0.1 * 10
    expect(result.netProfit).toBe(84); // 100 - 15 - 1
    expect(result.roiPercent).toBe(84);
  });

  it('calculates ROI for an active (unsold) item', () => {
    const now = new Date();
    const purchaseDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    const result = calculateROI({
      purchasePrice: 50,
      purchaseDate,
    });

    expect(result.isComplete).toBe(false);
    expect(result.daysHeld).toBeGreaterThanOrEqual(5);
    expect(result.daysHeld).toBeLessThanOrEqual(6);
    expect(result.grossProfit).toBe(-50); // no resale yet
  });

  it('throws on zero purchase price', () => {
    expect(() =>
      calculateROI({
        purchasePrice: 0,
        purchaseDate: new Date(),
      })
    ).toThrow('purchasePrice must be positive');
  });

  it('throws on negative purchase price', () => {
    expect(() =>
      calculateROI({
        purchasePrice: -10,
        purchaseDate: new Date(),
      })
    ).toThrow('purchasePrice must be positive');
  });

  it('handles same-day flip', () => {
    const date = new Date('2026-02-01');
    const result = calculateROI({
      purchasePrice: 50,
      resalePrice: 80,
      fees: 5,
      purchaseDate: date,
      resaleDate: date,
    });

    expect(result.daysHeld).toBe(0);
    expect(result.totalCarryingCost).toBe(0);
    expect(result.netProfit).toBe(25);
  });

  it('handles null fees', () => {
    const result = calculateROI({
      purchasePrice: 100,
      resalePrice: 150,
      fees: null,
      purchaseDate: new Date('2026-01-01'),
      resaleDate: new Date('2026-01-02'),
    });

    expect(result.grossProfit).toBe(50);
    expect(result.netProfit).toBe(49.9); // 50 - 0 - 0.1
  });

  it('uses custom daily carrying cost rate', () => {
    const result = calculateROI({
      purchasePrice: 1000,
      resalePrice: 1200,
      purchaseDate: new Date('2026-01-01'),
      resaleDate: new Date('2026-01-11'),
      dailyCarryingCostRate: 0.005, // 0.5% per day
    });

    expect(result.dailyCarryingCost).toBe(5);
    expect(result.totalCarryingCost).toBe(50);
  });

  it('calculates annualized ROI', () => {
    const result = calculateROI({
      purchasePrice: 100,
      resalePrice: 110,
      purchaseDate: new Date('2026-01-01'),
      resaleDate: new Date('2026-02-01'), // 31 days
    });

    expect(result.annualizedROI).toBeGreaterThan(result.roiPercent);
  });
});

describe('calculatePortfolioROI', () => {
  it('returns zeros for empty portfolio', () => {
    const result = calculatePortfolioROI([]);
    expect(result.totalInvested).toBe(0);
    expect(result.overallROI).toBe(0);
    expect(result.completedCount).toBe(0);
  });

  it('aggregates multiple items', () => {
    const items: ROIInput[] = [
      {
        purchasePrice: 100,
        resalePrice: 200,
        fees: 10,
        purchaseDate: new Date('2026-01-01'),
        resaleDate: new Date('2026-01-11'),
      },
      {
        purchasePrice: 50,
        resalePrice: 80,
        fees: 5,
        purchaseDate: new Date('2026-01-05'),
        resaleDate: new Date('2026-01-10'),
      },
    ];

    const result = calculatePortfolioROI(items);

    expect(result.totalInvested).toBe(150);
    expect(result.totalRevenue).toBe(280);
    expect(result.totalFees).toBe(15);
    expect(result.completedCount).toBe(2);
    expect(result.activeCount).toBe(0);
    expect(result.totalGrossProfit).toBe(130);
    expect(result.overallROI).toBeGreaterThan(0);
  });

  it('tracks active vs completed items', () => {
    const items: ROIInput[] = [
      {
        purchasePrice: 100,
        resalePrice: 150,
        purchaseDate: new Date('2026-01-01'),
        resaleDate: new Date('2026-01-10'),
      },
      {
        purchasePrice: 200,
        purchaseDate: new Date('2026-01-15'),
        // no resaleDate = active
      },
    ];

    const result = calculatePortfolioROI(items);
    expect(result.completedCount).toBe(1);
    expect(result.activeCount).toBe(1);
  });
});
