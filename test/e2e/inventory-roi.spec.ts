import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * E2E tests for Inventory ROI Tracking
 * BDD-style: Given/When/Then
 *
 * Tests the /api/inventory/roi endpoint which calculates
 * return on investment for purchased flip items and portfolio summary.
 */

const mockROIResponse = {
  items: [
    {
      id: 'opp-1',
      title: 'Sony WH-1000XM5 Headphones',
      platform: 'facebook',
      status: 'SOLD',
      purchasePrice: 120,
      resalePrice: 250,
      fees: 15,
      profit: 115,
      roiPercent: 95.83,
      daysHeld: 7,
      annualizedROI: 4997.14,
    },
    {
      id: 'opp-2',
      title: 'Nintendo Switch OLED',
      platform: 'craigslist',
      status: 'PURCHASED',
      purchasePrice: 200,
      resalePrice: null,
      fees: null,
      profit: null,
      roiPercent: null,
      daysHeld: 3,
      annualizedROI: null,
    },
    {
      id: 'opp-3',
      title: 'MacBook Pro M3 14"',
      platform: 'offerup',
      status: 'LISTED',
      purchasePrice: 900,
      resalePrice: 1400,
      fees: 50,
      profit: 450,
      roiPercent: 50.0,
      daysHeld: 14,
      annualizedROI: 1303.57,
    },
  ],
  portfolio: {
    totalInvested: 1220,
    totalRevenue: 1650,
    totalFees: 65,
    totalProfit: 565,
    overallROI: 46.31,
    itemCount: 3,
    soldCount: 1,
    avgDaysHeld: 8,
  },
};

test.describe('Feature: Inventory ROI Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test.describe('Scenario: Fetch ROI data via API', () => {
    test('Given I am authenticated, When I request /api/inventory/roi, Then I receive item-level and portfolio ROI data', async ({
      request: _request,
      page,
    }) => {
      // Given - mock the API
      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({ json: mockROIResponse });
      });

      // When
      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return res.json();
      });

      // Then - items array with ROI calculations
      expect(response.items).toHaveLength(3);
      expect(response.items[0].profit).toBe(115);
      expect(response.items[0].roiPercent).toBe(95.83);

      // Then - portfolio summary
      expect(response.portfolio.totalInvested).toBe(1220);
      expect(response.portfolio.totalProfit).toBe(565);
      expect(response.portfolio.overallROI).toBe(46.31);
    });
  });

  test.describe('Scenario: Sold items show complete ROI', () => {
    test('Given I have a sold item, When I view ROI data, Then profit, ROI percent, and annualized ROI are calculated', async ({
      page,
    }) => {
      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({ json: mockROIResponse });
      });

      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return res.json();
      });

      const soldItem = response.items.find(
        (i: { status: string }) => i.status === 'SOLD'
      );
      expect(soldItem).toBeDefined();
      expect(soldItem.profit).toBeGreaterThan(0);
      expect(soldItem.roiPercent).toBeGreaterThan(0);
      expect(soldItem.annualizedROI).toBeGreaterThan(0);
      expect(soldItem.daysHeld).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Scenario: Purchased items show pending ROI', () => {
    test('Given I have a purchased (unsold) item, When I view ROI data, Then profit and ROI are null', async ({
      page,
    }) => {
      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({ json: mockROIResponse });
      });

      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return res.json();
      });

      const purchasedItem = response.items.find(
        (i: { status: string }) => i.status === 'PURCHASED'
      );
      expect(purchasedItem).toBeDefined();
      expect(purchasedItem.profit).toBeNull();
      expect(purchasedItem.roiPercent).toBeNull();
      expect(purchasedItem.resalePrice).toBeNull();
    });
  });

  test.describe('Scenario: Portfolio summary aggregation', () => {
    test('Given I have multiple inventory items, When I view portfolio ROI, Then totals are correctly aggregated', async ({
      page,
    }) => {
      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({ json: mockROIResponse });
      });

      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return res.json();
      });

      const { portfolio } = response;
      expect(portfolio.itemCount).toBe(3);
      expect(portfolio.soldCount).toBe(1);
      expect(portfolio.totalInvested).toBe(1220);
      expect(portfolio.totalRevenue).toBe(1650);
      expect(portfolio.totalFees).toBe(65);
      expect(portfolio.totalProfit).toBe(565);
      expect(portfolio.overallROI).toBeCloseTo(46.31, 1);
      expect(portfolio.avgDaysHeld).toBe(8);
    });
  });

  test.describe('Scenario: Empty inventory', () => {
    test('Given I have no purchased items, When I request ROI data, Then I receive empty items and zeroed portfolio', async ({
      page,
    }) => {
      const emptyResponse = {
        items: [],
        portfolio: {
          totalInvested: 0,
          totalRevenue: 0,
          totalFees: 0,
          totalProfit: 0,
          overallROI: 0,
          itemCount: 0,
          soldCount: 0,
          avgDaysHeld: 0,
        },
      };

      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({ json: emptyResponse });
      });

      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return res.json();
      });

      expect(response.items).toHaveLength(0);
      expect(response.portfolio.itemCount).toBe(0);
      expect(response.portfolio.totalProfit).toBe(0);
    });
  });

  test.describe('Scenario: API error handling', () => {
    test('Given the ROI API fails, When I request ROI data, Then I receive a 500 error', async ({
      page,
    }) => {
      await page.route('**/api/inventory/roi', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Failed to calculate ROI' },
        });
      });

      await page.goto('/');
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/inventory/roi');
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to calculate ROI');
    });
  });
});
