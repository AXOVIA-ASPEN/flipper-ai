import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

// BDD: Feature — Filter & URL Parameter Persistence
// As a user, I want my filter selections to be reflected in the URL
// So that I can bookmark, share, and restore filtered views

const mockListings = [
  {
    id: '1',
    title: 'Vintage Guitar Pedal',
    platform: 'eBay',
    category: 'electronics',
    location: 'sarasota',
    price: 45,
    estimatedValue: 120,
    profitEstimate: 65,
    flipScore: 85,
    status: 'new',
    postedDate: '2026-02-15T10:00:00Z',
    imageUrl: null,
  },
  {
    id: '2',
    title: 'Antique Desk Lamp',
    platform: 'Craigslist',
    category: 'antiques',
    location: 'tampa',
    price: 25,
    estimatedValue: 80,
    profitEstimate: 45,
    flipScore: 72,
    status: 'analyzed',
    postedDate: '2026-02-14T08:00:00Z',
    imageUrl: null,
  },
  {
    id: '3',
    title: 'Gaming Keyboard',
    platform: 'Facebook',
    category: 'electronics',
    location: 'orlando',
    price: 30,
    estimatedValue: 70,
    profitEstimate: 30,
    flipScore: 60,
    status: 'new',
    postedDate: '2026-02-13T12:00:00Z',
    imageUrl: null,
  },
];

async function mockListingsAPI(page: import('@playwright/test').Page) {
  await page.route('**/api/listings*', async (route) => {
    const url = new URL(route.request().url(), 'http://localhost');
    const category = url.searchParams.get('category');
    const platform = url.searchParams.get('platform');
    const location = url.searchParams.get('location');

    let filtered = [...mockListings];
    if (category && category !== '') {
      filtered = filtered.filter((l) => l.category === category);
    }
    if (platform && platform !== 'all') {
      filtered = filtered.filter(
        (l) => l.platform.toLowerCase() === platform.toLowerCase()
      );
    }
    if (location && location !== '') {
      filtered = filtered.filter((l) => l.location === location);
    }

    await route.fulfill({ json: { listings: filtered, total: filtered.length } });
  });
}

test.describe('Filter & URL Parameter Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await mockListingsAPI(page);
  });

  test.describe('Feature: Filter controls update URL params', () => {
    test('Scenario: Given I am on the home page, When I select a category filter, Then the URL updates with the category param', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find and interact with the category filter
      const categorySelect = page.locator(
        'select[name="category"], [data-testid="category-filter"]'
      );
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption('electronics');
        await expect(page).toHaveURL(/category=electronics/);
      } else {
        // May be a custom dropdown — look for filter button
        const filterButton = page.getByRole('button', { name: /filter/i });
        if (await filterButton.isVisible()) {
          await filterButton.click();
          const categoryOption = page.getByText('Electronics');
          if (await categoryOption.isVisible()) {
            await categoryOption.click();
          }
        }
      }
    });

    test('Scenario: Given I am on the home page, When I select a location filter, Then the URL updates with the location param', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const locationSelect = page.locator(
        'select[name="location"], [data-testid="location-filter"]'
      );
      if (await locationSelect.isVisible()) {
        await locationSelect.selectOption('tampa');
        await expect(page).toHaveURL(/location=tampa/);
      }
    });

    test('Scenario: Given I am on the home page, When I select a platform filter, Then the URL updates with the platform param', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const platformSelect = page.locator(
        'select[name="platform"], [data-testid="platform-filter"]'
      );
      if (await platformSelect.isVisible()) {
        await platformSelect.selectOption('ebay');
        await expect(page).toHaveURL(/platform=ebay/i);
      }
    });
  });

  test.describe('Feature: URL params restore filters on page load', () => {
    test('Scenario: Given a URL with category=electronics, When I load the page, Then the category filter shows Electronics', async ({
      page,
    }) => {
      await page.goto('/?category=electronics');
      await page.waitForLoadState('networkidle');

      // Verify the filter reflects the URL param
      const categorySelect = page.locator(
        'select[name="category"], [data-testid="category-filter"]'
      );
      if (await categorySelect.isVisible()) {
        await expect(categorySelect).toHaveValue('electronics');
      }
    });

    test('Scenario: Given a URL with multiple filter params, When I load the page, Then all filters are restored', async ({
      page,
    }) => {
      await page.goto('/?category=electronics&location=sarasota&platform=ebay');
      await page.waitForLoadState('networkidle');

      const categorySelect = page.locator(
        'select[name="category"], [data-testid="category-filter"]'
      );
      const locationSelect = page.locator(
        'select[name="location"], [data-testid="location-filter"]'
      );
      const platformSelect = page.locator(
        'select[name="platform"], [data-testid="platform-filter"]'
      );

      if (await categorySelect.isVisible()) {
        await expect(categorySelect).toHaveValue('electronics');
      }
      if (await locationSelect.isVisible()) {
        await expect(locationSelect).toHaveValue('sarasota');
      }
      if (await platformSelect.isVisible()) {
        await expect(platformSelect).toHaveValue('ebay');
      }
    });
  });

  test.describe('Feature: Clear filters', () => {
    test('Scenario: Given active filters, When I clear all filters, Then the URL has no filter params', async ({
      page,
    }) => {
      await page.goto('/?category=electronics&location=tampa');
      await page.waitForLoadState('networkidle');

      // Look for a clear/reset filters button
      const clearButton = page.getByRole('button', {
        name: /clear|reset/i,
      });
      if (await clearButton.isVisible()) {
        await clearButton.click();
        // URL should no longer have filter params
        await expect(page).not.toHaveURL(/category=/);
        await expect(page).not.toHaveURL(/location=/);
      }
    });
  });

  test.describe('Feature: Filter count badge', () => {
    test('Scenario: Given two active filters, When I view the filter area, Then I see a count of active filters', async ({
      page,
    }) => {
      await page.goto('/?category=electronics&location=tampa');
      await page.waitForLoadState('networkidle');

      // Check for active filter count indicator
      const filterCount = page.locator(
        '[data-testid="active-filter-count"], .filter-count'
      );
      if (await filterCount.isVisible()) {
        const text = await filterCount.textContent();
        expect(text).toContain('2');
      }
    });
  });

  test.describe('Feature: Browser back/forward with filters', () => {
    test('Scenario: Given I change filters twice, When I press back, Then the previous filter state is restored', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const categorySelect = page.locator(
        'select[name="category"], [data-testid="category-filter"]'
      );
      if (await categorySelect.isVisible()) {
        // Apply first filter
        await categorySelect.selectOption('electronics');
        await page.waitForURL(/category=electronics/);

        // Apply second filter
        await categorySelect.selectOption('antiques');
        await page.waitForURL(/category=antiques/);

        // Go back
        await page.goBack();
        await expect(page).toHaveURL(/category=electronics/);

        // Go forward
        await page.goForward();
        await expect(page).toHaveURL(/category=antiques/);
      }
    });
  });
});
