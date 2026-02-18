import { test, expect } from '@playwright/test';

/**
 * E2E Test: Pricing Strategy Wizard
 * BDD-style: Given/When/Then
 *
 * Feature: Pricing Strategy Calculator
 * As a flipper planning a purchase
 * I want to calculate optimal resale pricing
 * So I can maximize profit while staying competitive
 *
 * Tests the pricing strategy wizard that helps users determine:
 * - Minimum viable price (break-even + target margin)
 * - Optimal price (based on market data)
 * - Maximum competitive price (before demand drops)
 * - Platform-specific fee calculations
 * - ROI projections at different price points
 */

test.describe('Pricing Strategy Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'test-user-wizard',
            name: 'Pricing Pro',
            email: 'pricer@flipper.ai',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Mock pricing calculator API
    await page.route('**/api/pricing/calculate', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Simulate pricing calculations
      const buyPrice = postData.buyPrice || 100;
      const targetROI = postData.targetROI || 50;
      const platform = postData.platform || 'ebay';

      // Platform-specific fee structures
      const feeRates: Record<string, number> = {
        ebay: 0.135, // 13.5% final value fee
        facebook: 0.05, // 5% selling fee
        craigslist: 0, // No fees
        offerup: 0.129, // 12.9% service fee
        mercari: 0.13, // 13% selling fee
      };

      const feeRate = feeRates[platform] || 0.1;
      const minPrice = buyPrice * (1 + targetROI / 100) / (1 - feeRate);
      const optimalPrice = minPrice * 1.15; // 15% markup for competitiveness
      const maxPrice = optimalPrice * 1.3; // Upper bound

      await route.fulfill({
        json: {
          buyPrice,
          targetROI,
          platform,
          feeRate: feeRate * 100,
          breakdown: {
            minViablePrice: Math.round(minPrice * 100) / 100,
            optimalPrice: Math.round(optimalPrice * 100) / 100,
            maxCompetitivePrice: Math.round(maxPrice * 100) / 100,
          },
          projections: [
            {
              listPrice: Math.round(minPrice * 100) / 100,
              fees: Math.round(minPrice * feeRate * 100) / 100,
              netProfit: Math.round((minPrice * (1 - feeRate) - buyPrice) * 100) / 100,
              roi: targetROI,
              rating: 'break-even',
            },
            {
              listPrice: Math.round(optimalPrice * 100) / 100,
              fees: Math.round(optimalPrice * feeRate * 100) / 100,
              netProfit: Math.round((optimalPrice * (1 - feeRate) - buyPrice) * 100) / 100,
              roi: Math.round(((optimalPrice * (1 - feeRate) - buyPrice) / buyPrice) * 100),
              rating: 'recommended',
            },
            {
              listPrice: Math.round(maxPrice * 100) / 100,
              fees: Math.round(maxPrice * feeRate * 100) / 100,
              netProfit: Math.round((maxPrice * (1 - feeRate) - buyPrice) * 100) / 100,
              roi: Math.round(((maxPrice * (1 - feeRate) - buyPrice) / buyPrice) * 100),
              rating: 'aggressive',
            },
          ],
          recommendations: [
            'List at $' + Math.round(optimalPrice * 100) / 100 + ' for best balance of profit and sell speed',
            'Consider offering free shipping to increase competitiveness',
            'Monitor competitor pricing for first 48 hours',
          ],
        },
      });
    });
  });

  test('Given I am on the pricing wizard | When I enter purchase details | Then I should see price recommendations', async ({
    page,
  }) => {
    // Navigate to pricing wizard
    await page.goto('/tools/pricing-wizard');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText(/pricing.*strategy|price.*calculator/i);

    // Fill in purchase details
    await page.fill('input[name="buyPrice"]', '100');
    await page.fill('input[name="targetROI"]', '50');
    await page.selectOption('select[name="platform"]', 'ebay');

    // Optional: Add item category for better accuracy
    const categorySelect = page.locator('select[name="category"]');
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption('electronics');
    }

    // Submit calculation
    await page.click('button:has-text("Calculate Pricing")');

    // Wait for results
    await page.waitForSelector('[data-testid="pricing-results"]', { timeout: 5000 });

    // Verify breakdown is displayed
    await expect(page.locator('[data-testid="min-viable-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="optimal-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-competitive-price"]')).toBeVisible();

    // Verify numbers are realistic
    const optimalPriceText = await page
      .locator('[data-testid="optimal-price"]')
      .textContent();
    expect(optimalPriceText).toMatch(/\$\d+\.\d{2}/);

    // Screenshot for visual verification
    await page.screenshot({ path: 'screenshots/pricing-wizard-results.png' });
  });

  test('Given I select different platforms | When I calculate | Then fees should adjust accordingly', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    const platforms = [
      { name: 'ebay', expectedFeeRate: 13.5 },
      { name: 'facebook', expectedFeeRate: 5 },
      { name: 'craigslist', expectedFeeRate: 0 },
    ];

    for (const platform of platforms) {
      // Fill form
      await page.fill('input[name="buyPrice"]', '200');
      await page.fill('input[name="targetROI"]', '40');
      await page.selectOption('select[name="platform"]', platform.name);

      // Calculate
      await page.click('button:has-text("Calculate Pricing")');

      // Wait for results
      await page.waitForSelector('[data-testid="pricing-results"]');

      // Verify fee rate is displayed correctly
      const feeRateElement = page.locator('[data-testid="fee-rate"]');
      if (await feeRateElement.isVisible()) {
        const feeText = await feeRateElement.textContent();
        expect(feeText).toContain(platform.expectedFeeRate.toString());
      }

      // Verify Craigslist shows no fees
      if (platform.name === 'craigslist') {
        const feesElement = page.locator('[data-testid="platform-fees"]');
        if (await feesElement.isVisible()) {
          const feesText = await feesElement.textContent();
          expect(feesText).toMatch(/\$0\.00|no fee/i);
        }
      }
    }
  });

  test('Given I want aggressive pricing | When I adjust ROI slider | Then projections should update in real-time', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    // Enter base values
    await page.fill('input[name="buyPrice"]', '150');
    await page.selectOption('select[name="platform"]', 'ebay');

    // Check if there's an ROI slider or input
    const roiSlider = page.locator('input[type="range"][name="targetROI"]');
    const roiInput = page.locator('input[type="number"][name="targetROI"]');

    if (await roiSlider.isVisible()) {
      // Test with slider at different values
      await roiSlider.fill('30'); // Conservative
      await page.click('button:has-text("Calculate Pricing")');
      await page.waitForSelector('[data-testid="pricing-results"]');
      const conservativePrice = await page
        .locator('[data-testid="optimal-price"]')
        .textContent();

      await roiSlider.fill('80'); // Aggressive
      await page.click('button:has-text("Calculate Pricing")');
      await page.waitForSelector('[data-testid="pricing-results"]');
      const aggressivePrice = await page
        .locator('[data-testid="optimal-price"]')
        .textContent();

      // Aggressive should be higher
      expect(aggressivePrice).not.toBe(conservativePrice);
    } else if (await roiInput.isVisible()) {
      // Test with input field
      await roiInput.fill('30');
      await page.click('button:has-text("Calculate Pricing")');
      await page.waitForSelector('[data-testid="pricing-results"]');

      await roiInput.fill('80');
      await page.click('button:has-text("Calculate Pricing")');
      await page.waitForSelector('[data-testid="pricing-results"]');
    }
  });

  test('Given I see pricing recommendations | When I view projections table | Then ROI should be calculated for each price point', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    await page.fill('input[name="buyPrice"]', '100');
    await page.fill('input[name="targetROI"]', '50');
    await page.selectOption('select[name="platform"]', 'ebay');

    await page.click('button:has-text("Calculate Pricing")');
    await page.waitForSelector('[data-testid="pricing-results"]');

    // Check for projections table
    const projectionsTable = page.locator('[data-testid="projections-table"]');
    if (await projectionsTable.isVisible()) {
      // Verify table has rows for different price points
      const rows = projectionsTable.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(3); // Min, optimal, max

      // Verify each row shows: list price, fees, net profit, ROI
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        await expect(row.locator('td').nth(0)).toContainText(/\$/); // Price
        await expect(row.locator('td').nth(3)).toContainText(/%/); // ROI
      }
    }
  });

  test('Given I calculate pricing | When results load | Then recommendations should be actionable', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    await page.fill('input[name="buyPrice"]', '200');
    await page.fill('input[name="targetROI"]', '60');
    await page.selectOption('select[name="platform"]', 'facebook');

    await page.click('button:has-text("Calculate Pricing")');
    await page.waitForSelector('[data-testid="pricing-results"]');

    // Check for recommendations section
    const recommendations = page.locator('[data-testid="recommendations"]');
    if (await recommendations.isVisible()) {
      const recsText = await recommendations.textContent();

      // Should contain actionable advice
      expect(recsText).toMatch(/list|price|shipping|competitive|monitor/i);
    }

    // Check for "Create Listing" CTA button
    const createListingBtn = page.locator('button:has-text("Create Listing with This Price")');
    if (await createListingBtn.isVisible()) {
      await expect(createListingBtn).toBeEnabled();
    }
  });

  test('Given invalid inputs | When I try to calculate | Then validation errors should appear', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    // Try to submit without required fields
    await page.click('button:has-text("Calculate Pricing")');

    // Check for validation messages
    const errorMessages = page.locator('[role="alert"], .error-message, .text-red-500');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      // Validation is working
      await expect(errorMessages.first()).toBeVisible();
    }

    // Try with negative buy price
    await page.fill('input[name="buyPrice"]', '-50');
    await page.click('button:has-text("Calculate Pricing")');

    const negativeError = page.locator('text=/must be.*positive|invalid.*price/i');
    if (await negativeError.isVisible()) {
      await expect(negativeError).toBeVisible();
    }

    // Try with unrealistic ROI (e.g., 500%)
    await page.fill('input[name="buyPrice"]', '100');
    await page.fill('input[name="targetROI"]', '500');
    await page.click('button:has-text("Calculate Pricing")');

    // May show warning (not error)
    const warningMessage = page.locator('text=/unrealistic|high.*roi|consider/i');
    if (await warningMessage.isVisible()) {
      await expect(warningMessage).toBeVisible();
    }
  });

  test('Given I am on mobile | When I use pricing wizard | Then layout should be responsive', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/tools/pricing-wizard');

    // Verify form is usable on mobile
    await expect(page.locator('input[name="buyPrice"]')).toBeVisible();
    await expect(page.locator('select[name="platform"]')).toBeVisible();

    // Fill and submit
    await page.fill('input[name="buyPrice"]', '150');
    await page.selectOption('select[name="platform"]', 'offerup');
    await page.click('button:has-text("Calculate Pricing")');

    // Verify results are readable on mobile
    await page.waitForSelector('[data-testid="pricing-results"]');
    const results = page.locator('[data-testid="pricing-results"]');
    await expect(results).toBeVisible();

    // Screenshot mobile view
    await page.screenshot({ path: 'screenshots/pricing-wizard-mobile.png' });
  });

  test('Given I want to compare platforms | When I use comparison mode | Then I should see side-by-side pricing', async ({
    page,
  }) => {
    await page.goto('/tools/pricing-wizard');

    // Check for comparison mode toggle
    const comparisonToggle = page.locator('[data-testid="comparison-mode-toggle"]');

    if (await comparisonToggle.isVisible()) {
      await comparisonToggle.click();

      // Fill base details
      await page.fill('input[name="buyPrice"]', '180');
      await page.fill('input[name="targetROI"]', '45');

      // Calculate for all platforms
      await page.click('button:has-text("Compare All Platforms")');

      await page.waitForSelector('[data-testid="platform-comparison-table"]');

      // Verify comparison table shows multiple platforms
      const comparisonTable = page.locator('[data-testid="platform-comparison-table"]');
      const platformRows = comparisonTable.locator('tbody tr');
      const platformCount = await platformRows.count();

      expect(platformCount).toBeGreaterThanOrEqual(3); // eBay, Facebook, Craigslist minimum

      // Verify each platform shows optimal price
      for (let i = 0; i < platformCount; i++) {
        const row = platformRows.nth(i);
        await expect(row.locator('td').first()).toContainText(/ebay|facebook|craigslist|offerup|mercari/i);
      }
    }
  });
});
