/**
 * ROI & Holding Cost Calculator for Flipper AI
 * @author Stephen Boyett
 */

export interface ROIInput {
  purchasePrice: number;
  resalePrice?: number | null;
  fees?: number | null;
  purchaseDate: Date;
  resaleDate?: Date | null;
  dailyCarryingCostRate?: number; // default 0.1% per day
}

export interface ROIResult {
  daysHeld: number;
  totalCarryingCost: number;
  dailyCarryingCost: number;
  grossProfit: number;
  netProfit: number;
  roiPercent: number;
  annualizedROI: number;
  isComplete: boolean; // true if item has been sold
}

const DEFAULT_DAILY_RATE = 0.001; // 0.1% per day (~36.5% annual)

/**
 * Calculate ROI and holding costs for a flipped item.
 */
export function calculateROI(input: ROIInput): ROIResult {
  const {
    purchasePrice,
    resalePrice,
    fees = 0,
    purchaseDate,
    resaleDate,
    dailyCarryingCostRate = DEFAULT_DAILY_RATE,
  } = input;

  if (purchasePrice <= 0) {
    throw new Error('purchasePrice must be positive');
  }

  const endDate = resaleDate ?? new Date();
  const isComplete = resaleDate !== null && resaleDate !== undefined;

  const msHeld = endDate.getTime() - purchaseDate.getTime();
  const daysHeld = Math.max(Math.ceil(msHeld / (1000 * 60 * 60 * 24)), 0);

  const dailyCarryingCost = purchasePrice * dailyCarryingCostRate;
  const totalCarryingCost = dailyCarryingCost * daysHeld;

  const effectiveResale = resalePrice ?? 0;
  const effectiveFees = fees ?? 0;

  const grossProfit = effectiveResale - purchasePrice;
  const netProfit = grossProfit - effectiveFees - totalCarryingCost;

  const roiPercent = (netProfit / purchasePrice) * 100;

  // Annualized ROI (avoid division by zero)
  const annualizedROI = daysHeld > 0
    ? ((1 + netProfit / purchasePrice) ** (365 / daysHeld) - 1) * 100
    : roiPercent;

  return {
    daysHeld,
    totalCarryingCost: Math.round(totalCarryingCost * 100) / 100,
    dailyCarryingCost: Math.round(dailyCarryingCost * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    roiPercent: Math.round(roiPercent * 100) / 100,
    annualizedROI: Math.round(annualizedROI * 100) / 100,
    isComplete,
  };
}

/**
 * Calculate aggregate ROI stats across multiple items.
 */
export function calculatePortfolioROI(items: ROIInput[]): {
  totalInvested: number;
  totalRevenue: number;
  totalFees: number;
  totalCarryingCosts: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  overallROI: number;
  avgDaysHeld: number;
  completedCount: number;
  activeCount: number;
} {
  if (items.length === 0) {
    return {
      totalInvested: 0,
      totalRevenue: 0,
      totalFees: 0,
      totalCarryingCosts: 0,
      totalGrossProfit: 0,
      totalNetProfit: 0,
      overallROI: 0,
      avgDaysHeld: 0,
      completedCount: 0,
      activeCount: 0,
    };
  }

  const results = items.map((item) => ({
    input: item,
    result: calculateROI(item),
  }));

  const totalInvested = items.reduce((sum, i) => sum + i.purchasePrice, 0);
  const totalRevenue = items.reduce((sum, i) => sum + (i.resalePrice ?? 0), 0);
  const totalFees = items.reduce((sum, i) => sum + (i.fees ?? 0), 0);
  const totalCarryingCosts = results.reduce((sum, r) => sum + r.result.totalCarryingCost, 0);
  const totalGrossProfit = totalRevenue - totalInvested;
  const totalNetProfit = totalGrossProfit - totalFees - totalCarryingCosts;
  const overallROI = totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : /* istanbul ignore next */ 0;
  const avgDaysHeld = results.reduce((sum, r) => sum + r.result.daysHeld, 0) / results.length;
  const completedCount = results.filter((r) => r.result.isComplete).length;
  const activeCount = results.length - completedCount;

  return {
    totalInvested: Math.round(totalInvested * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalCarryingCosts: Math.round(totalCarryingCosts * 100) / 100,
    totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
    totalNetProfit: Math.round(totalNetProfit * 100) / 100,
    overallROI: Math.round(overallROI * 100) / 100,
    avgDaysHeld: Math.round(avgDaysHeld),
    completedCount,
    activeCount,
  };
}
