import { test as base, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { ScraperPage } from '../pages/ScraperPage';
import { OpportunitiesPage } from '../pages/OpportunitiesPage';
import { AuthPage } from '../pages/AuthPage';
import { SettingsPage } from '../pages/SettingsPage';
import { MessagesPage } from '../pages/MessagesPage';
import { ResaleListingPage } from '../pages/ResaleListingPage';
import { MockAPIHelper } from './api-mocks';

type Fixtures = {
  dashboardPage: DashboardPage;
  scraperPage: ScraperPage;
  opportunitiesPage: OpportunitiesPage;
  authPage: AuthPage;
  settingsPage: SettingsPage;
  messagesPage: MessagesPage;
  resaleListingPage: ResaleListingPage;
  mockAPI: MockAPIHelper;
};

export const test = base.extend<Fixtures>({
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  scraperPage: async ({ page }, use) => {
    await use(new ScraperPage(page));
  },
  opportunitiesPage: async ({ page }, use) => {
    await use(new OpportunitiesPage(page));
  },
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  messagesPage: async ({ page }, use) => {
    await use(new MessagesPage(page));
  },
  resaleListingPage: async ({ page }, use) => {
    await use(new ResaleListingPage(page));
  },
  mockAPI: async ({ page }, use) => {
    await use(new MockAPIHelper(page));
  },
});

export { expect };
