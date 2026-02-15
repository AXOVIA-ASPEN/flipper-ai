import { test, expect } from '@playwright/test';

test.describe('Scraper Page', () => {
  test.describe('Feature: Configure Scraper Search', () => {
    test('Scenario: User views the scraper configuration form', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // Then I should see the page title
      await expect(page.getByText('Scrape Listings')).toBeVisible();

      // And I should see the platform selector
      await expect(page.getByText('Platform')).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();

      // And I should see the location selector
      await expect(page.getByText('Location')).toBeVisible();

      // And I should see the category selector
      await expect(page.getByText('Category')).toBeVisible();

      // And I should see the keywords input
      await expect(page.getByText('Keywords')).toBeVisible();
      await expect(page.getByPlaceholder('e.g., iPhone, Nintendo, Dyson')).toBeVisible();

      // And I should see price filters
      await expect(page.getByText('Min Price')).toBeVisible();
      await expect(page.getByText('Max Price')).toBeVisible();

      // And I should see the Start Scraping button
      await expect(page.getByRole('button', { name: /Start Scraping/i })).toBeVisible();
    });

    test('Scenario: User selects a location', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // When I select a location
      const locationSelect = page.locator('select').nth(1); // Second select is location
      await locationSelect.selectOption('tampa');

      // Then the location should be selected
      await expect(locationSelect).toHaveValue('tampa');
    });

    test('Scenario: User selects a category', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // When I select a category
      const categorySelect = page.locator('select').nth(2); // Third select is category
      await categorySelect.selectOption('electronics');

      // Then the category should be selected
      await expect(categorySelect).toHaveValue('electronics');
    });

    test('Scenario: User enters search keywords', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // When I enter keywords
      const keywordsInput = page.getByPlaceholder('e.g., iPhone, Nintendo, Dyson');
      await keywordsInput.fill('Apple iPhone');

      // Then the keywords should be entered
      await expect(keywordsInput).toHaveValue('Apple iPhone');
    });

    test('Scenario: User sets price range', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // When I set min price
      const minPriceInput = page.getByLabel('Min Price');
      await minPriceInput.fill('50');

      // And I set max price
      const maxPriceInput = page.getByLabel('Max Price');
      await maxPriceInput.fill('500');

      // Then the prices should be set
      await expect(minPriceInput).toHaveValue('50');
      await expect(maxPriceInput).toHaveValue('500');
    });
  });

  test.describe('Feature: Navigate Back to Dashboard', () => {
    test('Scenario: User returns to dashboard from scraper', async ({ page }) => {
      // Given I am on the scraper page
      await page.goto('/scraper');

      // When I click the back button
      await page.locator("a[href='/']").first().click();

      // Then I should be back on the dashboard
      await expect(page).toHaveURL('/');
      await expect(page.locator('h1')).toContainText('Flipper.ai');
    });
  });

  test.describe('Feature: Start Scraping', () => {
    test('Scenario: User initiates scraping process', async ({ page }) => {
      // Given I am on the scraper page with configured search
      await page.goto('/scraper');

      // And I have selected a location and category
      const locationSelect = page.locator('select').nth(1);
      await locationSelect.selectOption('sarasota');

      const categorySelect = page.locator('select').nth(2);
      await categorySelect.selectOption('electronics');

      // When I click Start Scraping
      const startButton = page.getByRole('button', { name: /Start Scraping/i });
      await startButton.click();

      // Then I should see loading state
      await expect(page.getByText(/Scraping listings/i)).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('Feature: Form Validation', () => {
  test('Scenario: Platform shows correct options', async ({ page }) => {
    // Given I am on the scraper page
    await page.goto('/scraper');

    // Then I should see Craigslist as an option
    const platformSelect = page.locator('select').first();
    await expect(platformSelect.locator("option[value='craigslist']")).toBeAttached();

    // And Facebook Marketplace should be disabled (coming soon)
    await expect(platformSelect.locator("option[value='facebook']")).toBeDisabled();
  });

  test('Scenario: Location dropdown has expected cities', async ({ page }) => {
    // Given I am on the scraper page
    await page.goto('/scraper');

    // Then I should see various location options
    const locationSelect = page.locator('select').nth(1);
    await expect(locationSelect.locator("option[value='sarasota']")).toBeAttached();
    await expect(locationSelect.locator("option[value='tampa']")).toBeAttached();
    await expect(locationSelect.locator("option[value='sfbay']")).toBeAttached();
    await expect(locationSelect.locator("option[value='newyork']")).toBeAttached();
  });

  test('Scenario: Category dropdown has expected options', async ({ page }) => {
    // Given I am on the scraper page
    await page.goto('/scraper');

    // Then I should see various category options
    const categorySelect = page.locator('select').nth(2);
    await expect(categorySelect.locator("option[value='electronics']")).toBeAttached();
    await expect(categorySelect.locator("option[value='furniture']")).toBeAttached();
    await expect(categorySelect.locator("option[value='video_gaming']")).toBeAttached();
    await expect(categorySelect.locator("option[value='music_instr']")).toBeAttached();
  });
});

test.describe('Feature: Scraper Results and History', () => {
  test('Scenario: Successful scrape displays summary and listings preview', async ({ page }) => {
    await page.route('**/api/scraper-jobs**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { jobs: [] } });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    await page.route('**/api/scraper/craigslist', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'Scrape complete',
          savedCount: 2,
          listings: [
            {
              title: 'Nintendo Switch OLED',
              price: '$250',
              location: 'Tampa, FL',
              url: 'https://craigslist.org/item/1',
              imageUrl: 'https://picsum.photos/200',
            },
            {
              title: 'Dyson V11 Vacuum',
              price: '$300',
              location: 'Miami, FL',
              url: 'https://craigslist.org/item/2',
            },
          ],
        },
      });
    });

    await page.goto('/scraper');
    await page.getByRole('button', { name: /Start Scraping/i }).click();

    await expect(page.getByText('Scrape complete')).toBeVisible();
    await expect(page.getByText('2 listings saved to database')).toBeVisible();
    await expect(page.getByText('Found 2 Listings')).toBeVisible();
    await expect(page.getByText('Nintendo Switch OLED')).toBeVisible();
    await expect(page.getByText('Dyson V11 Vacuum')).toBeVisible();
  });

  test('Scenario: Scrape errors display failure message', async ({ page }) => {
    await page.route('**/api/scraper-jobs**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { jobs: [] } });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    await page.route('**/api/scraper/craigslist', async (route) => {
      await route.fulfill({
        status: 500,
        json: {
          success: false,
          message: 'Unable to reach Craigslist',
          error: 'Timed out',
        },
      });
    });

    await page.goto('/scraper');
    await page.getByRole('button', { name: /Start Scraping/i }).click();

    await expect(page.getByText('Unable to reach Craigslist')).toBeVisible();
    await expect(page.getByText('Timed out')).toBeVisible();
  });

  test('Scenario: Job history list renders recent jobs', async ({ page }) => {
    const jobsPayload = {
      jobs: [
        {
          id: 'job-1',
          platform: 'craigslist',
          location: 'tampa',
          category: 'electronics',
          status: 'COMPLETED',
          listingsFound: 12,
          opportunitiesFound: 3,
          errorMessage: null,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: 'job-2',
          platform: 'craigslist',
          location: 'sarasota',
          category: 'furniture',
          status: 'FAILED',
          listingsFound: 0,
          opportunitiesFound: 0,
          errorMessage: 'Blocked by captcha',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await page.route('**/api/scraper-jobs**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: jobsPayload });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    await page.route('**/api/scraper/craigslist', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          message: 'Scrape complete',
        },
      });
    });

    await page.goto('/scraper');
    await expect(page.getByText('Recent Scraper Jobs')).toBeVisible();
    await expect(page.getByText('COMPLETED').first()).toBeVisible();
    await expect(page.getByText('FAILED').first()).toBeVisible();
    await expect(page.getByText('Blocked by captcha')).toBeVisible();
  });
});
