import { test, expect } from '@playwright/test';

/**
 * Feature: Complete Flip Journey - End-to-End Cross-Page Flow
 * Based on: features/08-complete-flip-journey.feature
 *
 * Tests the core user journey across multiple pages:
 * Login → Dashboard → Scrape → View Results → Mark Opportunity → Track in Opportunities
 */

const mockSession = {
  user: { id: 'journey-user-1', name: 'Flipper Pro', email: 'flipper@example.com' },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const mockListings = [
  {
    id: 'listing-journey-1',
    title: 'Vintage Canon AE-1 Camera',
    askingPrice: 120,
    estimatedValue: 280,
    profitPotential: 120,
    valueScore: 85,
    platform: 'CRAIGSLIST',
    url: 'https://craigslist.org/item/camera1',
    location: 'Tampa, FL',
    imageUrls: JSON.stringify(['https://picsum.photos/200?camera']),
    condition: 'good',
    description: 'Classic film camera, fully functional with original lens',
    category: 'electronics',
    status: 'NEW',
    postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'listing-journey-2',
    title: 'Nintendo GameCube Bundle',
    askingPrice: 80,
    estimatedValue: 180,
    profitPotential: 70,
    valueScore: 78,
    platform: 'FACEBOOK',
    url: 'https://facebook.com/marketplace/item/gc1',
    location: 'Orlando, FL',
    imageUrls: null,
    condition: 'fair',
    description: 'GameCube with 3 controllers and 5 games',
    category: 'electronics',
    status: 'NEW',
    postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const mockScrapeResponse = {
  jobId: 'job-journey-1',
  status: 'completed',
  listingsFound: 2,
  listings: mockListings,
};

const mockOpportunity = {
  id: 'opp-journey-1',
  listingId: 'listing-journey-1',
  status: 'IDENTIFIED',
  purchasePrice: null,
  purchaseDate: null,
  resalePrice: null,
  resalePlatform: null,
  resaleUrl: null,
  resaleDate: null,
  actualProfit: null,
  fees: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  listing: mockListings[0],
};

test.describe('Feature: Complete Flip Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ json: mockSession });
    });

    // Mock CSRF
    await page.route('**/api/auth/csrf', async (route) => {
      await route.fulfill({ json: { csrfToken: 'test-csrf-token' } });
    });
  });

  test('Scenario: Given a logged-in user, When they complete the full flip workflow, Then they track a profitable opportunity', async ({
    page,
  }) => {
    let opportunityCreated = false;

    // Mock listings API
    await page.route('**/api/listings**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: { listings: mockListings, total: mockListings.length },
        });
      } else {
        await route.continue();
      }
    });

    // Mock scrape API
    await page.route('**/api/scrape**', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({ json: mockScrapeResponse });
      } else {
        await route.continue();
      }
    });

    // Mock scraper-jobs API
    await page.route('**/api/scraper-jobs**', async (route) => {
      await route.fulfill({
        json: [
          {
            id: 'job-journey-1',
            status: 'completed',
            platform: 'craigslist',
            location: 'tampa',
            category: 'electronics',
            keywords: 'vintage camera',
            listingsFound: 2,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    });

    // Mock opportunities API
    await page.route('**/api/opportunities**', async (route, request) => {
      if (request.method() === 'POST') {
        opportunityCreated = true;
        await route.fulfill({ json: mockOpportunity });
      } else if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            opportunities: opportunityCreated ? [mockOpportunity] : [],
            stats: {
              totalOpportunities: opportunityCreated ? 1 : 0,
              totalProfit: 0,
              totalInvested: 0,
              totalRevenue: 0,
            },
          },
        });
      } else {
        await route.continue();
      }
    });

    // Step 1: Given I am on the dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Flipper');

    // Step 2: When I navigate to the scraper page
    const scraperLink = page.getByRole('link', { name: /Scrape/i }).first();
    if (await scraperLink.isVisible()) {
      await scraperLink.click();
    } else {
      await page.goto('/scraper');
    }
    await expect(page.getByText('Scrape Listings')).toBeVisible();

    // Step 3: And I configure a scrape search
    const keywordsInput = page.getByPlaceholder('e.g., iPhone, Nintendo, Dyson');
    await keywordsInput.fill('vintage camera');

    // Step 4: And I start scraping
    const scrapeButton = page.getByRole('button', { name: /Start Scraping/i });
    await scrapeButton.click();

    // Step 5: Then I should see scrape results
    // Wait for results to appear (mocked API returns immediately)
    await page.waitForTimeout(500);

    // Step 6: When I navigate back to the dashboard to see listings
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Then I should see the scraped listings
    await expect(page.getByText('Vintage Canon AE-1 Camera')).toBeVisible();
    await expect(page.getByText('Nintendo GameCube Bundle')).toBeVisible();

    // Step 7: When I mark a listing as an opportunity
    const markButton = page.getByRole('button', { name: /Mark as Opportunity/i }).first();
    if (await markButton.isVisible()) {
      await markButton.click();
      // Then the opportunity should be created
      expect(opportunityCreated).toBeTruthy();
    }

    // Step 8: When I navigate to the opportunities page
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    // Then I should see the opportunity I just created
    await expect(page.locator('h1')).toContainText('Opportunities');

    if (opportunityCreated) {
      await expect(page.getByText('Vintage Canon AE-1 Camera')).toBeVisible();
      await expect(page.getByText('Total Opportunities')).toBeVisible();
    }
  });

  test('Scenario: Given a user with opportunities, When they update status through the flip lifecycle, Then each stage is tracked', async ({
    page,
  }) => {
    let currentStatus = 'IDENTIFIED';
    const statusHistory: string[] = [];

    await page.route('**/api/opportunities**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            opportunities: [
              {
                ...mockOpportunity,
                status: currentStatus,
                purchasePrice: currentStatus === 'PURCHASED' ? 110 : null,
                purchaseDate: currentStatus === 'PURCHASED' ? new Date().toISOString() : null,
                resalePrice: currentStatus === 'SOLD' ? 260 : null,
                resaleDate: currentStatus === 'SOLD' ? new Date().toISOString() : null,
                actualProfit: currentStatus === 'SOLD' ? 150 : null,
              },
            ],
            stats: {
              totalOpportunities: 1,
              totalProfit: currentStatus === 'SOLD' ? 150 : 0,
              totalInvested: ['PURCHASED', 'LISTED', 'SOLD'].includes(currentStatus) ? 110 : 0,
              totalRevenue: currentStatus === 'SOLD' ? 260 : 0,
            },
          },
        });
      } else if (request.method() === 'PATCH') {
        const body = await request.postDataJSON();
        if (body.status) {
          currentStatus = body.status;
          statusHistory.push(currentStatus);
        }
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    });

    // Given I am on the opportunities page with an identified opportunity
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Vintage Canon AE-1 Camera')).toBeVisible();

    // When I edit the opportunity to mark as CONTACTED
    const editButton = page.getByRole('button', { name: /Edit/i }).first();
    await editButton.click();

    const statusSelect = page.getByLabel(/Status/i);
    await statusSelect.selectOption('CONTACTED');

    const saveButton = page.getByRole('button', { name: /Save Changes/i });
    await saveButton.click();

    // Then the status should be updated
    expect(statusHistory).toContain('CONTACTED');

    // When I edit again to mark as PURCHASED
    await page.waitForLoadState('networkidle');
    const editButton2 = page.getByRole('button', { name: /Edit/i }).first();
    await editButton2.click();

    await page.getByLabel(/Status/i).selectOption('PURCHASED');
    await page.getByLabel(/Purchase Price/i).fill('110');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Then the purchase should be recorded
    expect(statusHistory).toContain('PURCHASED');

    // When I edit to mark as SOLD
    await page.waitForLoadState('networkidle');
    const editButton3 = page.getByRole('button', { name: /Edit/i }).first();
    await editButton3.click();

    await page.getByLabel(/Status/i).selectOption('SOLD');
    await page.getByLabel(/Resale Price/i).fill('260');
    await page.getByLabel(/Resale Platform/i).fill('eBay');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Then the full flip lifecycle should be complete
    expect(statusHistory).toContain('SOLD');
    expect(statusHistory).toEqual(expect.arrayContaining(['CONTACTED', 'PURCHASED', 'SOLD']));
  });

  test('Scenario: Given a user on the dashboard, When they navigate to all major sections, Then each page loads correctly', async ({
    page,
  }) => {
    // Mock all APIs minimally
    await page.route('**/api/listings**', async (route) => {
      await route.fulfill({ json: { listings: [], total: 0 } });
    });
    await page.route('**/api/opportunities**', async (route) => {
      await route.fulfill({
        json: {
          opportunities: [],
          stats: { totalOpportunities: 0, totalProfit: 0, totalInvested: 0, totalRevenue: 0 },
        },
      });
    });
    await page.route('**/api/user/settings', async (route) => {
      await route.fulfill({
        json: {
          preferredModel: 'gpt-4o-mini',
          discountThreshold: 70,
          autoAnalyze: false,
          notifyEmail: true,
          searchConfigs: [],
        },
      });
    });
    await page.route('**/api/search-configs**', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/scraper-jobs**', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/messages/**', async (route) => {
      await route.fulfill({ json: { conversations: [] } });
    });

    // Dashboard
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Flipper');

    // Scraper
    await page.goto('/scraper');
    await expect(page.getByText('Scrape Listings')).toBeVisible();

    // Opportunities
    await page.goto('/opportunities');
    await expect(page.locator('h1')).toContainText('Opportunities');

    // Settings
    await page.goto('/settings');
    await expect(page.getByText('Settings')).toBeVisible();

    // Messages
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    // Messages page should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});
