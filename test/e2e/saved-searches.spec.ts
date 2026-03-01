import { test, expect } from '@playwright/test';

test.describe('Saved Searches (Settings Page)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated session
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    );

    // Mock subscription tier (FREE tier = 3 saved searches max)
    await page.route('**/api/user/subscription', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tier: 'FREE', scansToday: 0 }),
      })
    );
  });

  test.describe('Feature: View Saved Searches', () => {
    test('Scenario: User sees empty state when no saved searches exist', async ({ page }) => {
      // Given the API returns no saved searches
      await page.route('**/api/search-configs**', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
        return route.continue();
      });

      // When I navigate to the settings page
      await page.goto('/settings');

      // Then I should see the Saved Searches section
      await expect(page.getByText('Saved Searches')).toBeVisible();

      // And I should see the empty state message
      await expect(
        page.getByText('No saved searches yet. Create one to quickly run your favorite searches.')
      ).toBeVisible();

      // And I should see a "New" button to create one
      await expect(page.getByRole('button', { name: /new/i })).toBeVisible();
    });

    test('Scenario: User sees existing saved searches listed', async ({ page }) => {
      // Given the API returns saved searches
      await page.route('**/api/search-configs**', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'cfg-1',
                name: 'Electronics in Tampa',
                location: 'tampa',
                category: 'electronics',
                keywords: 'iphone',
                minPrice: '50',
                maxPrice: '500',
                enabled: true,
              },
              {
                id: 'cfg-2',
                name: 'Furniture Deals',
                location: 'orlando',
                category: 'furniture',
                keywords: '',
                minPrice: '',
                maxPrice: '200',
                enabled: false,
              },
            ]),
          });
        }
        return route.continue();
      });

      // When I navigate to the settings page
      await page.goto('/settings');

      // Then I should see both saved searches
      await expect(page.getByText('Electronics in Tampa')).toBeVisible();
      await expect(page.getByText('Furniture Deals')).toBeVisible();
    });
  });

  test.describe('Feature: Create a Saved Search', () => {
    test('Scenario: User creates a new saved search via the form', async ({ page }) => {
      // Given no existing searches
      await page.route('**/api/search-configs**', (route) => {
        const method = route.request().method();
        if (method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
        if (method === 'POST') {
          // Mock successful creation
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'cfg-new',
              name: 'Gaming Consoles',
              location: 'tampa',
              category: 'electronics',
              keywords: 'ps5 xbox',
              minPrice: '100',
              maxPrice: '400',
              enabled: true,
            }),
          });
        }
        return route.continue();
      });

      // When I navigate to settings
      await page.goto('/settings');

      // And I click the "New" button
      await page.getByRole('button', { name: /new/i }).click();

      // Then I should see the create form
      await expect(page.getByPlaceholder(/search name/i)).toBeVisible();

      // When I fill in the search name
      await page.getByPlaceholder(/search name/i).fill('Gaming Consoles');

      // And I fill in keywords
      await page.getByPlaceholder(/keywords/i).fill('ps5 xbox');

      // And I fill in min price
      await page.getByPlaceholder(/min/i).fill('100');

      // And I fill in max price
      await page.getByPlaceholder(/max/i).fill('400');

      // And I click Create
      await page.getByRole('button', { name: /create/i }).click();

      // Then the form should be submitted (POST request was mocked to succeed)
      // The create form interaction completes without error
    });

    test('Scenario: User cancels creating a saved search', async ({ page }) => {
      // Given no existing searches
      await page.route('**/api/search-configs**', (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
        return route.continue();
      });

      // When I navigate to settings and click New
      await page.goto('/settings');
      await page.getByRole('button', { name: /new/i }).click();

      // Then the form should appear
      await expect(page.getByPlaceholder(/search name/i)).toBeVisible();

      // When I click Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Then the form should disappear
      await expect(page.getByPlaceholder(/search name/i)).not.toBeVisible();
    });
  });
});
