import { test, expect } from '@playwright/test';

test.describe('Performance & Core Web Vitals', () => {
  test.describe('Feature: Page Load Performance', () => {
    test('Scenario: Given a user visits the homepage, When the page loads, Then it renders within acceptable time', async ({
      page,
    }) => {
      // Given I measure the start time
      const startTime = Date.now();

      // When I navigate to the homepage
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Then the page should load within 5 seconds
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);

      // And the response should be successful
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
    });

    test('Scenario: Given a user visits the login page, When the page loads, Then it renders within acceptable time', async ({
      page,
    }) => {
      const startTime = Date.now();
      const response = await page.goto('/login', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
    });

    test('Scenario: Given a user visits the register page, When the page loads, Then it renders within acceptable time', async ({
      page,
    }) => {
      const startTime = Date.now();
      const response = await page.goto('/register', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
    });
  });

  test.describe('Feature: No Console Errors on Critical Pages', () => {
    const criticalPages = ['/', '/login', '/register'];

    for (const pagePath of criticalPages) {
      test(`Scenario: Given a user visits ${pagePath}, When the page loads, Then no JavaScript errors appear in console`, async ({
        page,
      }) => {
        const consoleErrors: string[] = [];

        // Given I listen for console errors
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        // When I navigate to the page
        await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Then there should be no JavaScript errors (excluding expected network errors from API mocks)
        const unexpectedErrors = consoleErrors.filter(
          (err) =>
            !err.includes('Failed to fetch') &&
            !err.includes('NetworkError') &&
            !err.includes('net::ERR') &&
            !err.includes('404') &&
            !err.includes('401')
        );
        expect(unexpectedErrors).toEqual([]);
      });
    }
  });

  test.describe('Feature: No Uncaught Page Errors', () => {
    test('Scenario: Given a user visits the homepage, When the page loads, Then no uncaught exceptions occur', async ({
      page,
    }) => {
      const pageErrors: string[] = [];

      // Given I listen for page errors (uncaught exceptions)
      page.on('pageerror', (err) => {
        pageErrors.push(err.message);
      });

      // When I navigate to the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Then there should be no uncaught exceptions
      expect(pageErrors).toEqual([]);
    });
  });

  test.describe('Feature: Resource Loading Performance', () => {
    test('Scenario: Given a user visits the homepage, When resources load, Then no requests take longer than 10 seconds', async ({
      page,
    }) => {
      const slowRequests: { url: string; duration: number }[] = [];

      // Given I track request timings
      const requestTimings = new Map<string, number>();

      page.on('request', (request) => {
        requestTimings.set(request.url(), Date.now());
      });

      page.on('response', (response) => {
        const startTime = requestTimings.get(response.url());
        if (startTime) {
          const duration = Date.now() - startTime;
          if (duration > 10000) {
            slowRequests.push({ url: response.url(), duration });
          }
        }
      });

      // When I navigate to the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Then no requests should take more than 10 seconds
      expect(slowRequests).toEqual([]);
    });

    test('Scenario: Given a user visits the homepage, When resources load, Then no failed resource requests occur', async ({
      page,
    }) => {
      const failedRequests: { url: string; status: number }[] = [];

      // Given I track failed responses
      page.on('response', (response) => {
        const status = response.status();
        const url = response.url();
        // Ignore API calls that may 401/404 without auth, and favicon
        if (
          status >= 500 &&
          !url.includes('/api/') &&
          !url.includes('favicon')
        ) {
          failedRequests.push({ url, status });
        }
      });

      // When I navigate to the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Then there should be no server errors for static resources
      expect(failedRequests).toEqual([]);
    });
  });

  test.describe('Feature: Layout Stability', () => {
    test('Scenario: Given a user visits the homepage, When the page finishes loading, Then the layout dimensions remain stable', async ({
      page,
    }) => {
      // Given I navigate to the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // When I measure the body dimensions
      const firstMeasure = await page.evaluate(() => ({
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
      }));

      // And wait a moment for any delayed renders
      await page.waitForTimeout(1500);

      const secondMeasure = await page.evaluate(() => ({
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
      }));

      // Then the width should not change (no horizontal layout shift)
      expect(secondMeasure.width).toBe(firstMeasure.width);

      // And height should not change dramatically (allow small shifts from async data)
      const heightDiff = Math.abs(secondMeasure.height - firstMeasure.height);
      expect(heightDiff).toBeLessThan(500);
    });
  });

  test.describe('Feature: Memory and DOM Size', () => {
    test('Scenario: Given a user visits the homepage, When the page loads, Then the DOM is not excessively large', async ({
      page,
    }) => {
      // Given I navigate to the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // When I count DOM elements
      const domCount = await page.evaluate(() => document.querySelectorAll('*').length);

      // Then the DOM should have fewer than 5000 elements (reasonable for a SPA)
      expect(domCount).toBeLessThan(5000);
    });
  });

  test.describe('Feature: Navigation Performance', () => {
    test('Scenario: Given a user is on the homepage, When they navigate to another page, Then the transition is fast', async ({
      page,
    }) => {
      // Given I am on the homepage
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      // When I click on a navigation link to login
      const startTime = Date.now();
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      const navTime = Date.now() - startTime;

      // Then the navigation should complete within 3 seconds
      expect(navTime).toBeLessThan(3000);
    });
  });
});
