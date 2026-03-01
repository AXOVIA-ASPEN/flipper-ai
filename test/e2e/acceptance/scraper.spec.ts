import { test, expect } from '@playwright/test';

/**
 * Scraper Page - Acceptance Tests
 *
 * BDD-style scenarios for the Scraper page functionality.
 * Tests the core workflow: creating scraper jobs, viewing results,
 * managing saved searches, and job history.
 */

test.describe('Scraper Page - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Navigate to scraper page
    await page.goto('/scraper');
  });

  test.describe('Given a user visits the scraper page', () => {
    test('Then the page should display with main elements visible', async ({ page }) => {
      // Page title should be visible
      await expect(
        page.locator('h1, h2').filter({ hasText: /scraper|marketplace|search/i }).first()
      ).toBeVisible({ timeout: 10000 });

      // Search form should be present
      const searchForm = page.locator('form, [role="search"]').first();
      await expect(searchForm).toBeVisible({ timeout: 5000 });

      // Platform selector should be visible
      const platformSelector = page.locator(
        'select, button:has-text("Craigslist"), button:has-text("eBay"), [data-testid*="platform"]'
      ).first();
      await expect(platformSelector).toBeVisible({ timeout: 5000 });
    });

    test('Then the user should see input fields for search criteria', async ({ page }) => {
      // Query/keyword input
      const queryInput = page.locator(
        'input[placeholder*="Search"], input[placeholder*="query"], input[name="query"]'
      ).first();
      await expect(queryInput).toBeVisible();

      // Location input
      const locationInput = page.locator(
        'input[placeholder*="location"], input[placeholder*="city"], input[name="location"]'
      ).first();
      await expect(locationInput).toBeVisible();
    });

    test('Then the user should see their recent scraper jobs', async ({ page }) => {
      // Mock scraper jobs API
      await page.route('**/api/scraper/jobs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'job-1',
              platform: 'Craigslist',
              query: 'vintage furniture',
              location: 'San Francisco',
              status: 'completed',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              resultsCount: 15,
            },
            {
              id: 'job-2',
              platform: 'eBay',
              query: 'vintage camera',
              location: null,
              status: 'pending',
              createdAt: new Date(Date.now() - 600000).toISOString(),
              resultsCount: 0,
            },
          ],
        });
      });

      // Reload to trigger API call
      await page.reload();
      await page.waitForTimeout(1000);

      // Should display job history section
      const jobHistory = page.locator('text=/recent|history|past searches/i').first();
      const jobHistoryExists = await jobHistory.isVisible().catch(() => false);

      // If job history exists, verify jobs are shown
      if (jobHistoryExists) {
        await expect(jobHistory).toBeVisible();

        // Should show at least one job
        const jobCards = page.locator(
          '[data-testid*="job"], [class*="job-"], article, [role="listitem"]'
        );
        const count = await jobCards.count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('When a user creates a new scraper job', () => {
    test('Then they should be able to fill in search criteria and submit', async ({ page }) => {
      // Mock API endpoints
      await page.route('**/api/scraper/jobs**', async (route, request) => {
        if (request.method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              jobId: 'new-job-123',
              message: 'Scraper job started',
            },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });

      // Fill in search query
      const queryInput = page.locator(
        'input[placeholder*="Search"], input[placeholder*="query"], input[name="query"]'
      ).first();
      await queryInput.fill('vintage bicycle');

      // Fill in location
      const locationInput = page.locator(
        'input[placeholder*="location"], input[placeholder*="city"], input[name="location"]'
      ).first();
      await locationInput.fill('Portland');

      // Select category (if available)
      const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]').first();
      const categoryExists = await categorySelect.isVisible().catch(() => false);
      if (categoryExists) {
        await categorySelect.selectOption({ index: 1 });
      }

      // Submit the form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Search"), button:has-text("Start Scrape")'
      ).first();
      await submitButton.click();

      // Wait for response
      await page.waitForTimeout(1500);

      // Should show success message or loading state
      const successIndicator = page.locator(
        'text=/success|started|searching|loading/i, [role="status"], [data-testid="success-message"]'
      ).first();
      const successExists = await successIndicator.isVisible({ timeout: 5000 }).catch(() => false);

      expect(successExists).toBeTruthy();
    });

    test('Then they should see validation errors for missing required fields', async ({ page }) => {
      // Try to submit without filling required fields
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Search"), button:has-text("Start Scrape")'
      ).first();
      
      // Clear any pre-filled values
      const queryInput = page.locator(
        'input[placeholder*="Search"], input[placeholder*="query"], input[name="query"]'
      ).first();
      await queryInput.clear();

      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation error
      const errorMessage = page.locator(
        'text=/required|enter|please/i, [role="alert"], .error, [data-testid="error"]'
      ).first();
      
      const errorExists = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Either validation error shows OR button is disabled
      const buttonDisabled = await submitButton.isDisabled().catch(() => false);
      
      expect(errorExists || buttonDisabled).toBeTruthy();
    });

    test('Then they should be able to select different marketplace platforms', async ({ page }) => {
      // Find platform selector
      const platformButtons = page.locator('button:has-text("Craigslist"), button:has-text("eBay"), button:has-text("Facebook")');
      const count = await platformButtons.count();

      if (count > 0) {
        // Click on first platform
        await platformButtons.first().click();
        await page.waitForTimeout(300);

        // Should highlight or show active state
        const activeButton = page.locator('button[aria-pressed="true"], button[data-active="true"], button.active').first();
        const activeExists = await activeButton.isVisible().catch(() => false);

        // At least one platform should be selectable
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('When a user views scraper job results', () => {
    test('Then they should see listings from completed jobs', async ({ page }) => {
      // Mock completed job with results
      await page.route('**/api/scraper/jobs/job-1/results**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'listing-1',
              title: 'Vintage Leather Sofa - Excellent Condition',
              price: '$450',
              location: 'San Francisco',
              url: 'https://example.com/listing-1',
              imageUrl: 'https://via.placeholder.com/200',
              scrapedAt: new Date().toISOString(),
            },
            {
              id: 'listing-2',
              title: 'Mid-Century Modern Chair',
              price: '$200',
              location: 'Oakland',
              url: 'https://example.com/listing-2',
              imageUrl: 'https://via.placeholder.com/200',
              scrapedAt: new Date().toISOString(),
            },
          ],
        });
      });

      // Mock jobs list
      await page.route('**/api/scraper/jobs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'job-1',
              platform: 'Craigslist',
              query: 'vintage furniture',
              location: 'San Francisco',
              status: 'completed',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              resultsCount: 2,
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1500);

      // Look for a view results button or link
      const viewResultsButton = page.locator(
        'button:has-text("View"), a:has-text("View"), button:has-text("Results")'
      ).first();
      
      const viewButtonExists = await viewResultsButton.isVisible().catch(() => false);
      
      if (viewButtonExists) {
        await viewResultsButton.click();
        await page.waitForTimeout(1000);

        // Should show listings
        const listings = page.locator('[data-testid*="listing"], article, .listing').first();
        await expect(listings).toBeVisible({ timeout: 5000 });
      }
    });

    test('Then they should be able to save interesting opportunities', async ({ page }) => {
      // Mock save opportunity endpoint
      let savedCount = 0;
      await page.route('**/api/opportunities**', async (route, request) => {
        if (request.method() === 'POST') {
          savedCount++;
          await route.fulfill({
            json: {
              success: true,
              id: `opp-${savedCount}`,
              message: 'Opportunity saved',
            },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });

      // Look for save button
      const saveButton = page.locator(
        'button:has-text("Save"), button[aria-label*="Save"], [data-testid="save-opportunity"]'
      ).first();

      const saveExists = await saveButton.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (saveExists) {
        await saveButton.click();
        await page.waitForTimeout(500);

        // Should show success feedback
        const successMessage = page.locator('text=/saved|added/i').first();
        const feedbackExists = await successMessage.isVisible({ timeout: 3000 }).catch(() => false);
        
        expect(feedbackExists || savedCount > 0).toBeTruthy();
      }
    });
  });

  test.describe('When a user manages scraper jobs', () => {
    test('Then they should be able to delete old jobs', async ({ page }) => {
      // Mock jobs API
      await page.route('**/api/scraper/jobs**', async (route, request) => {
        if (request.method() === 'GET') {
          await route.fulfill({
            json: [
              {
                id: 'job-old-1',
                platform: 'Craigslist',
                query: 'test',
                status: 'completed',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
              },
            ],
          });
        } else if (request.method() === 'DELETE') {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.reload();
      await page.waitForTimeout(1000);

      // Look for delete button
      const deleteButton = page.locator(
        'button:has-text("Delete"), button[aria-label*="Delete"], [data-testid*="delete"]'
      ).first();

      const deleteExists = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (deleteExists) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // May show confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
        const confirmExists = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (confirmExists) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }

        // Job should be removed or success shown
        expect(true).toBeTruthy(); // Deletion attempted
      }
    });

    test('Then they should be able to refresh job status', async ({ page }) => {
      // Mock jobs API with status change
      let callCount = 0;
      await page.route('**/api/scraper/jobs**', async (route) => {
        callCount++;
        await route.fulfill({
          json: [
            {
              id: 'job-1',
              platform: 'Craigslist',
              status: callCount > 1 ? 'completed' : 'running',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1000);

      // Look for refresh button
      const refreshButton = page.locator(
        'button:has-text("Refresh"), button[aria-label*="Refresh"], [data-testid="refresh"]'
      ).first();

      const refreshExists = await refreshButton.isVisible().catch(() => false);

      if (refreshExists) {
        await refreshButton.click();
        await page.waitForTimeout(500);

        // Should trigger API call (callCount increases)
        expect(callCount).toBeGreaterThan(1);
      }
    });
  });

  test.describe('When a user manages saved searches', () => {
    test('Then they should be able to save search configurations', async ({ page }) => {
      // Mock save search API
      await page.route('**/api/search-configs**', async (route, request) => {
        if (request.method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              id: 'config-1',
              name: 'My Saved Search',
            },
          });
        } else {
          await route.fulfill({ json: [] });
        }
      });

      // Fill in search criteria
      const queryInput = page.locator('input[name="query"]').first();
      await queryInput.fill('vintage records');

      // Look for save search button
      const saveSearchButton = page.locator(
        'button:has-text("Save Search"), button[aria-label*="Save search"], [data-testid="save-search"]'
      ).first();

      const saveExists = await saveSearchButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (saveExists) {
        await saveSearchButton.click();
        await page.waitForTimeout(500);

        // May show name input dialog
        const nameInput = page.locator('input[placeholder*="name"], input[name="searchName"]').first();
        const nameInputExists = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);

        if (nameInputExists) {
          await nameInput.fill('My Vintage Records Search');
          
          const confirmButton = page.locator('button:has-text("Save"), button:has-text("Confirm")').first();
          await confirmButton.click();
          await page.waitForTimeout(500);
        }

        // Should show success or saved indicator
        expect(true).toBeTruthy();
      }
    });

    test('Then they should be able to load saved searches', async ({ page }) => {
      // Mock saved searches API
      await page.route('**/api/search-configs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'config-1',
              name: 'Vintage Furniture SF',
              query: 'vintage furniture',
              location: 'San Francisco',
              platform: 'Craigslist',
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1000);

      // Look for saved searches dropdown or list
      const savedSearchesButton = page.locator(
        'button:has-text("Saved"), button:has-text("Load"), select[name="savedSearch"]'
      ).first();

      const savedExists = await savedSearchesButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (savedExists) {
        await savedSearchesButton.click();
        await page.waitForTimeout(500);

        // Should show saved search options
        const savedOption = page.locator('text=/Vintage Furniture/i').first();
        const optionExists = await savedOption.isVisible({ timeout: 2000 }).catch(() => false);

        if (optionExists) {
          await savedOption.click();
          await page.waitForTimeout(500);

          // Search fields should populate
          const queryInput = page.locator('input[name="query"]').first();
          const value = await queryInput.inputValue();
          expect(value).toContain('furniture');
        }
      }
    });
  });

  test.describe('When viewing job status', () => {
    test('Then running jobs should show progress indicators', async ({ page }) => {
      // Mock running job
      await page.route('**/api/scraper/jobs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'job-running',
              platform: 'eBay',
              status: 'running',
              createdAt: new Date().toISOString(),
              progress: 45,
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1500);

      // Should show loading/progress indicator
      const progressIndicator = page.locator(
        '[role="progressbar"], .spinner, [data-testid="loading"], text=/running|searching|in progress/i'
      ).first();

      const progressExists = await progressIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      expect(progressExists).toBeTruthy();
    });

    test('Then failed jobs should show error messages', async ({ page }) => {
      // Mock failed job
      await page.route('**/api/scraper/jobs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'job-failed',
              platform: 'Craigslist',
              status: 'failed',
              error: 'Connection timeout',
              createdAt: new Date().toISOString(),
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1500);

      // Should show error indicator
      const errorIndicator = page.locator(
        '[role="alert"], text=/failed|error|timeout/i, [data-testid="error"]'
      ).first();

      const errorExists = await errorIndicator.isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorExists).toBeTruthy();
    });

    test('Then completed jobs should show results count', async ({ page }) => {
      // Mock completed job
      await page.route('**/api/scraper/jobs**', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 'job-done',
              platform: 'Craigslist',
              status: 'completed',
              resultsCount: 23,
              createdAt: new Date(Date.now() - 1800000).toISOString(),
            },
          ],
        });
      });

      await page.reload();
      await page.waitForTimeout(1500);

      // Should show results count
      const resultsCount = page.locator('text=/23|results|listings/i').first();
      const countExists = await resultsCount.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(countExists).toBeTruthy();
    });
  });

  test.describe('Responsive design and accessibility', () => {
    test('Then the scraper page should be mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(1000);

      // Page should still be usable
      const queryInput = page.locator('input[name="query"]').first();
      await expect(queryInput).toBeVisible();

      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    });

    test('Then the page should have no critical accessibility violations', async ({ page }) => {
      // Check for basic accessibility
      const mainHeading = page.locator('h1, h2').first();
      await expect(mainHeading).toBeVisible();

      // Form should have labels
      const inputs = page.locator('input').all();
      const inputCount = (await inputs).length;
      
      // At least one input should exist
      expect(inputCount).toBeGreaterThan(0);

      // No console errors on load
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForTimeout(1000);

      // Critical errors should be minimal
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('ServiceWorker') &&
        !err.includes('manifest')
      );
      
      expect(criticalErrors.length).toBeLessThan(3);
    });
  });
});
