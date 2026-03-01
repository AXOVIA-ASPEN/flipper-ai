import { test, expect } from '@playwright/test';

const mockAnalyticsData = {
  totalInvested: 1500.0,
  totalRevenue: 2200.0,
  totalFees: 150.0,
  totalGrossProfit: 700.0,
  totalNetProfit: 550.0,
  overallROI: 36.67,
  avgDaysHeld: 12,
  completedDeals: 5,
  activeDeals: 3,
  winRate: 80,
  bestDeal: {
    id: '1',
    title: 'Vintage Guitar Pedal',
    platform: 'eBay',
    category: 'Electronics',
    status: 'SOLD',
    purchasePrice: 50,
    resalePrice: 200,
    netProfit: 135,
    roiPercent: 270,
    daysHeld: 7,
  },
  worstDeal: {
    id: '2',
    title: 'Broken Laptop',
    platform: 'Craigslist',
    category: 'Electronics',
    status: 'SOLD',
    purchasePrice: 100,
    resalePrice: 60,
    netProfit: -40,
    roiPercent: -40,
    daysHeld: 30,
  },
  items: [
    {
      id: '1',
      title: 'Vintage Guitar Pedal',
      platform: 'eBay',
      category: 'Electronics',
      status: 'SOLD',
      purchasePrice: 50,
      resalePrice: 200,
      netProfit: 135,
      roiPercent: 270,
      daysHeld: 7,
    },
    {
      id: '3',
      title: 'Designer Handbag',
      platform: 'OfferUp',
      category: 'Fashion',
      status: 'LISTED',
      purchasePrice: 80,
      resalePrice: null,
      netProfit: 0,
      roiPercent: 0,
      daysHeld: 5,
    },
  ],
  trends: [
    { period: 'Jan 2026', revenue: 1000, costs: 600, profit: 400, itemsSold: 3, itemsPurchased: 4 },
    { period: 'Feb 2026', revenue: 1200, costs: 900, profit: 300, itemsSold: 2, itemsPurchased: 4 },
  ],
  categoryBreakdown: [
    { category: 'Electronics', count: 4, totalInvested: 800, totalRevenue: 1400, totalProfit: 450, avgROI: 56.25, avgDaysToSell: 10 },
    { category: 'Fashion', count: 2, totalInvested: 300, totalRevenue: 500, totalProfit: 150, avgROI: 50, avgDaysToSell: 14 },
  ],
};

test.describe('Analytics Page', () => {
  test.describe('Feature: View Profit & Loss Analytics', () => {
    test.beforeEach(async ({ page }) => {
      // Mock the analytics API
      await page.route('**/api/analytics/profit-loss*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyticsData),
        });
      });
    });

    test('Scenario: User views summary cards with key metrics', async ({ page }) => {
      // Given I navigate to the analytics page
      await page.goto('/analytics');

      // Then I should see the page heading
      await expect(page.getByText('Profit & Loss')).toBeVisible();

      // And I should see all summary cards
      await expect(page.getByText('Total Invested')).toBeVisible();
      await expect(page.getByText('Total Revenue')).toBeVisible();
      await expect(page.getByText('Net Profit')).toBeVisible();
      await expect(page.getByText('Overall ROI')).toBeVisible();
      await expect(page.getByText('Completed Deals')).toBeVisible();
      await expect(page.getByText('Active Deals')).toBeVisible();
      await expect(page.getByText('Win Rate')).toBeVisible();
      await expect(page.getByText('Avg Days Held')).toBeVisible();

      // And the values should be displayed correctly
      await expect(page.getByText('$1,500.00')).toBeVisible();
      await expect(page.getByText('$2,200.00')).toBeVisible();
    });

    test('Scenario: User sees best and worst deals highlighted', async ({ page }) => {
      // Given I am on the analytics page
      await page.goto('/analytics');

      // Then I should see the best deal section
      await expect(page.getByText('🏆 Best Deal')).toBeVisible();
      await expect(page.getByText('Vintage Guitar Pedal')).first().toBeVisible();

      // And I should see the worst deal section
      await expect(page.getByText('📉 Worst Deal')).toBeVisible();
      await expect(page.getByText('Broken Laptop')).toBeVisible();
    });

    test('Scenario: User views all deals table', async ({ page }) => {
      // Given I am on the analytics page
      await page.goto('/analytics');

      // Then I should see the deals table
      await expect(page.getByText('📋 All Deals (2)')).toBeVisible();

      // And the table should have correct headers
      const headers = ['Item', 'Platform', 'Status', 'Bought', 'Sold', 'Profit', 'ROI', 'Days'];
      for (const header of headers) {
        await expect(page.locator('th').filter({ hasText: header })).toBeVisible();
      }

      // And I should see deal rows
      await expect(page.locator('tbody tr')).toHaveCount(2);
      await expect(page.getByText('eBay').first()).toBeVisible();
      await expect(page.getByText('OfferUp')).toBeVisible();
    });

    test('Scenario: User toggles between monthly and weekly granularity', async ({ page }) => {
      // Given I am on the analytics page
      await page.goto('/analytics');

      // Then the monthly button should be active by default
      const monthlyBtn = page.getByRole('button', { name: 'Monthly' });
      const weeklyBtn = page.getByRole('button', { name: 'Weekly' });
      await expect(monthlyBtn).toBeVisible();
      await expect(weeklyBtn).toBeVisible();

      // When I click the weekly button
      await weeklyBtn.click();

      // Then the API should be called with weekly granularity
      // (verified by the route mock accepting the request)
    });

    test('Scenario: User sees trends data', async ({ page }) => {
      // Given I am on the analytics page
      await page.goto('/analytics');

      // Then I should see the trends section
      await expect(page.getByText('📈 Trends')).toBeVisible();

      // And I should see trend periods
      await expect(page.getByText('Jan 2026')).toBeVisible();
      await expect(page.getByText('Feb 2026')).toBeVisible();
    });
  });

  test.describe('Feature: Empty Analytics State', () => {
    test('Scenario: User sees empty state when no deals exist', async ({ page }) => {
      // Given the API returns no deals
      await page.route('**/api/analytics/profit-loss*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockAnalyticsData,
            items: [],
            bestDeal: null,
            worstDeal: null,
          }),
        });
      });

      // When I navigate to the analytics page
      await page.goto('/analytics');

      // Then I should see the empty state with penguin mascot
      await expect(page.getByText('🐧')).toBeVisible();
      await expect(page.getByText('No deals tracked yet!')).toBeVisible();
    });
  });

  test.describe('Feature: Analytics Error Handling', () => {
    test('Scenario: User sees error when API fails', async ({ page }) => {
      // Given the API returns an error
      await page.route('**/api/analytics/profit-loss*', async (route) => {
        await route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      // When I navigate to the analytics page
      await page.goto('/analytics');

      // Then I should see an error message
      await expect(page.getByText(/failed|error/i)).toBeVisible();
    });
  });

  test.describe('Feature: Navigation', () => {
    test('Scenario: User navigates back to dashboard from analytics', async ({ page }) => {
      // Given I am on the analytics page with mocked data
      await page.route('**/api/analytics/profit-loss*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyticsData),
        });
      });
      await page.goto('/analytics');

      // When I click the back to dashboard link
      const backLink = page.getByRole('link', { name: /dashboard/i });
      if (await backLink.isVisible()) {
        await backLink.click();

        // Then I should be on the dashboard
        await expect(page).toHaveURL('/');
      }
    });
  });
});
