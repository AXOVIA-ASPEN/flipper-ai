import { type Page } from '@playwright/test';
import {
  type MockListing,
  type MockOpportunity,
  type MockScraperJob,
  createMockListingsResponse,
  createMockOpportunitiesResponse,
} from './test-data';

export class MockAPIHelper {
  constructor(private readonly page: Page) {}

  async mockListingsAPI(listings?: MockListing[]) {
    const response = createMockListingsResponse(listings);
    await this.page.route('**/api/listings**', async (route) => {
      await route.fulfill({ json: response });
    });
  }

  async mockOpportunitiesAPI(opportunities?: MockOpportunity[]) {
    const response = createMockOpportunitiesResponse(opportunities);
    await this.page.route('**/api/opportunities**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: response });
      } else if (request.method() === 'PATCH') {
        await route.fulfill({ json: { success: true } });
      } else if (request.method() === 'DELETE') {
        await route.fulfill({ json: { success: true } });
      } else if (request.method() === 'POST') {
        await route.fulfill({ json: { id: 'opp-created' } });
      } else {
        await route.continue();
      }
    });
  }

  async mockScraperAPI(result?: {
    success: boolean;
    message: string;
    savedCount?: number;
    listings?: unknown[];
  }) {
    const scraperResult = result ?? {
      success: true,
      message: 'Scrape complete',
      savedCount: 0,
      listings: [],
    };
    await this.page.route('**/api/scraper/craigslist', async (route) => {
      await route.fulfill({ json: scraperResult });
    });
  }

  async mockScraperJobsAPI(jobs?: MockScraperJob[]) {
    await this.page.route('**/api/scraper-jobs**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { jobs: jobs ?? [] } });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });
  }

  async mockAuthAPI() {
    await this.page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: { name: 'Test User', email: 'test@flipper.ai', image: null },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });
  }

  async mockAllAPIs() {
    await this.mockListingsAPI();
    await this.mockOpportunitiesAPI();
    await this.mockScraperAPI();
    await this.mockScraperJobsAPI();
    await this.mockAuthAPI();
  }
}
