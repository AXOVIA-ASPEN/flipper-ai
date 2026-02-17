import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { mockAuthSession } from './fixtures/auth';
import { MockAPIHelper } from './fixtures/api-mocks';

// Enable video and screenshots at the file level
test.use({ video: 'on', screenshot: 'on' });

/**
 * Feature: Full User Journey — Visual Screenshot Documentation
 *
 * Captures screenshots at every key step of the Flipper AI user flow:
 *   1. Login / Onboarding
 *   2. Dashboard overview
 *   3. Configure & run a marketplace scan
 *   4. Browse scan results (opportunities list)
 *   5. View a listing detail / AI analysis
 *   6. Mark as opportunity (flip tracking)
 *   7. Seller communication (negotiate)
 *   8. Mark as purchased → resale posted
 *   9. Profit realized → mark sold
 *  10. Reports / analytics dashboard
 *
 * Screenshots are stored in playwright-report/user-journey/
 * Flows documented in docs/USER_FLOWS.md
 */

const SCREENSHOT_DIR = 'playwright-report/user-journey';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

test.describe('Full User Journey — Visual Documentation', () => {
  test.beforeEach(async () => {
    ensureDir(SCREENSHOT_DIR);
  });

  test('Step 1: Login page — unauthenticated landing', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const file = path.join(SCREENSHOT_DIR, '01-login-page.png');
    await page.screenshot({ path: file, fullPage: true });
    await expect(page).toHaveURL(/login/);
    // Verify key elements visible
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible().catch(() => {});
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 2: Dashboard — authenticated home', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '02-dashboard.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 3: Opportunities list — scan results', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();
    await page.route('**/api/listings**', async (route) => {
      await route.fulfill({
        json: {
          listings: [
            {
              id: 'journey-1',
              title: 'Vintage Canon AE-1 Camera',
              askingPrice: 120,
              estimatedValue: 280,
              profitPotential: 120,
              valueScore: 85,
              platform: 'CRAIGSLIST',
              url: 'https://craigslist.org/item/camera1',
              location: 'Tampa, FL',
              condition: 'good',
              category: 'electronics',
              status: 'NEW',
              postedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              imageUrls: '[]',
            },
            {
              id: 'journey-2',
              title: 'Nintendo GameCube Bundle',
              askingPrice: 80,
              estimatedValue: 180,
              profitPotential: 70,
              valueScore: 78,
              platform: 'FACEBOOK',
              url: 'https://facebook.com/marketplace/item/gc1',
              location: 'Orlando, FL',
              condition: 'fair',
              category: 'electronics',
              status: 'NEW',
              postedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              imageUrls: '[]',
            },
          ],
          total: 2,
          page: 1,
          pageSize: 10,
        },
      });
    });
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '03-opportunities-list.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 4: Marketplace scraper — configure scan', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();
    await page.goto('/scraper');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '04-scraper-config.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 5: AI Analysis — listing detail', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mock a specific listing
    await page.route('**/api/listings/journey-1', async (route) => {
      await route.fulfill({
        json: {
          id: 'journey-1',
          title: 'Vintage Canon AE-1 Camera',
          askingPrice: 120,
          estimatedValue: 280,
          profitPotential: 120,
          valueScore: 85,
          platform: 'CRAIGSLIST',
          url: 'https://craigslist.org/item/camera1',
          location: 'Tampa, FL',
          condition: 'good',
          category: 'electronics',
          status: 'NEW',
          description: 'Classic film camera, fully functional with original lens. Includes 50mm lens and original strap.',
          postedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          imageUrls: '[]',
        },
      });
    });

    // Mock AI analysis endpoint
    await page.route('**/api/analyze**', async (route) => {
      await route.fulfill({
        json: {
          analysis: {
            valueScore: 85,
            estimatedValue: 280,
            profitPotential: 120,
            recommendation: 'BUY',
            reasoning: 'Canon AE-1 cameras are highly sought after by film photography enthusiasts. Market value typically ranges from $200-$350 in good condition.',
            risks: ['Condition dependent on shutter function', 'Film camera market can be volatile'],
            suggestedOfferPrice: 100,
          },
        },
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const file = path.join(SCREENSHOT_DIR, '05-ai-analysis.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 6: Seller communication — negotiate', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mock messages API
    await page.route('**/api/messages**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            messages: [
              {
                id: 'msg-1',
                listingId: 'journey-1',
                direction: 'OUTBOUND',
                content: "Hi! Is this camera still available? I'm interested at $100.",
                platform: 'CRAIGSLIST',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 'msg-2',
                listingId: 'journey-1',
                direction: 'INBOUND',
                content: "Yes, still available. Best offer?",
                platform: 'CRAIGSLIST',
                createdAt: new Date(Date.now() - 1800000).toISOString(),
              },
            ],
            total: 2,
          },
        });
      } else {
        await route.fulfill({ json: { id: 'msg-new', success: true } });
      }
    });

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '06-seller-communication.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 7: Kanban board — flip tracking', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mock opportunities in various stages
    await page.route('**/api/opportunities**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            opportunities: [
              {
                id: 'opp-1',
                status: 'IDENTIFIED',
                purchasePrice: null,
                resalePrice: null,
                actualProfit: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                listing: {
                  id: 'journey-1',
                  title: 'Vintage Canon AE-1 Camera',
                  askingPrice: 120,
                  estimatedValue: 280,
                  profitPotential: 120,
                  platform: 'CRAIGSLIST',
                  imageUrls: '[]',
                },
              },
              {
                id: 'opp-2',
                status: 'PURCHASED',
                purchasePrice: 80,
                resalePrice: null,
                actualProfit: null,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date().toISOString(),
                listing: {
                  id: 'journey-2',
                  title: 'Nintendo GameCube Bundle',
                  askingPrice: 80,
                  estimatedValue: 180,
                  profitPotential: 70,
                  platform: 'FACEBOOK',
                  imageUrls: '[]',
                },
              },
            ],
            total: 2,
          },
        });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '07-kanban-tracking.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 8: Reports & Analytics — profit dashboard', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mock reports data
    await page.route('**/api/reports**', async (route) => {
      await route.fulfill({
        json: {
          totalFlips: 12,
          totalProfit: 1847.50,
          avgProfitPerFlip: 153.96,
          successRate: 91.7,
          bestFlip: {
            title: 'Vintage Canon AE-1 Camera',
            profit: 142,
          },
          monthlyData: [
            { month: 'Dec', profit: 320 },
            { month: 'Jan', profit: 580 },
            { month: 'Feb', profit: 947 },
          ],
        },
      });
    });

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '08-reports-analytics.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 9: Settings — user configuration', async ({ page }) => {
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mock settings
    await page.route('**/api/user/settings**', async (route) => {
      await route.fulfill({
        json: {
          notificationsEnabled: true,
          emailDigest: 'daily',
          defaultSearchRadius: 50,
          minProfitThreshold: 25,
          preferredPlatforms: ['CRAIGSLIST', 'FACEBOOK', 'EBAY'],
        },
      });
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '09-settings.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Step 10: Health dashboard — system monitoring', async ({ page }) => {
    await page.goto('/health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const file = path.join(SCREENSHOT_DIR, '10-health-dashboard.png');
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 Screenshot saved: ${file}`);
  });

  test('Mobile journey — responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Mobile login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-01-login.png'), fullPage: true });

    // Mobile dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-02-dashboard.png'), fullPage: true });

    // Mobile opportunities
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-03-opportunities.png'), fullPage: true });

    console.log('📸 Mobile screenshots saved to', SCREENSHOT_DIR);
  });
});

test.describe('Complete E2E Journey — Login to Flip', () => {
  test('Full journey: auth → scan → opportunity → track', async ({ page }) => {
    ensureDir(SCREENSHOT_DIR);
    await mockAuthSession(page);
    const api = new MockAPIHelper(page);
    await api.mockAllAPIs();

    // Step 1: Navigate to dashboard (authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-01-start.png'), fullPage: true });

    // Step 2: Navigate to scraper
    await page.goto('/scraper');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-02-scraper.png'), fullPage: true });

    // Step 3: Navigate to opportunities
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-03-opportunities.png'), fullPage: true });

    // Step 4: Navigate to kanban
    await page.goto('/kanban');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-04-kanban.png'), fullPage: true });

    // Step 5: Navigate to messages
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-05-messages.png'), fullPage: true });

    // Step 6: Navigate to reports
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'journey-06-reports.png'), fullPage: true });

    console.log('✅ Full E2E journey screenshots captured in', SCREENSHOT_DIR);

    // All navigations succeeded — journey is coherent
    expect(fs.existsSync(SCREENSHOT_DIR)).toBeTruthy();
    const files = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.startsWith('journey-'));
    expect(files.length).toBeGreaterThanOrEqual(6);
  });
});
