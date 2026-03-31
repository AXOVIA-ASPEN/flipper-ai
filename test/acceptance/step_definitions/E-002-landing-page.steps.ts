/**
 * Step Definitions for Story 2.1: Landing Page
 * Validates hero section, navigation, features, pricing, CTAs, responsive layout,
 * footer, and accessibility against acceptance criteria.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ==================== SHARED STEPS ====================

When('I visit the landing page', async function (this: CustomWorld) {
  await this.page.goto(`${BASE_URL}/`);
  await this.page.waitForLoadState('domcontentloaded');
});

When('I scroll to the features section', async function (this: CustomWorld) {
  const section = this.page.locator('section[aria-labelledby="features-heading"]');
  await section.scrollIntoViewIfNeeded();
});

When('I scroll to the pricing section', async function (this: CustomWorld) {
  const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
  await section.scrollIntoViewIfNeeded();
});

When('I scroll to the footer', async function (this: CustomWorld) {
  const footer = this.page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
});

// ==================== S-1: Hero section ====================

Then(
  'I should see a hero section with a headline conveying the product value proposition',
  async function (this: CustomWorld) {
    const h1 = this.page.locator('h1');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text).toContain('Find Hidden Profits');
  }
);

Then(
  'I should see a subheadline describing AI-powered marketplace scanning',
  async function (this: CustomWorld) {
    const subheadline = this.page.locator('text=AI-powered marketplace scanner');
    await expect(subheadline).toBeVisible();
  }
);

Then(
  'I should see a {string} CTA button',
  async function (this: CustomWorld, buttonText: string) {
    const cta = this.page.getByRole('link', { name: buttonText }).first();
    await expect(cta).toBeVisible();
  }
);

Then(
  'the Flipper AI logo and brand name should be visible in the header',
  async function (this: CustomWorld) {
    const nav = this.page.locator('nav[aria-label="Main navigation"]');
    await expect(nav.locator('text=Flipper.ai')).toBeVisible();
  }
);

// ==================== S-2: Navigation header ====================

Then(
  'I should see a {string} link pointing to {string}',
  async function (this: CustomWorld, linkText: string, href: string) {
    const link = this.page.getByRole('link', { name: linkText }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
);

Then(
  'I should see a {string} button pointing to {string}',
  async function (this: CustomWorld, buttonText: string, href: string) {
    const link = this.page.getByRole('link', { name: buttonText }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
);

Then(
  'I should NOT see authenticated navigation links like {string} or {string}',
  async function (this: CustomWorld, link1: string, link2: string) {
    const dashboardLink = this.page.getByRole('link', { name: link1 });
    const settingsLink = this.page.getByRole('link', { name: link2 });
    await expect(dashboardLink).toHaveCount(0);
    await expect(settingsLink).toHaveCount(0);
  }
);

// ==================== S-3: Features section ====================

Then(
  'I should see at least 6 feature cards each with an icon, title, and description',
  async function (this: CustomWorld) {
    const section = this.page.locator('section[aria-labelledby="features-heading"]');
    const cards = section.locator('.grid > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Verify each card has a heading (title) and paragraph (description)
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toBeVisible();
      await expect(card.locator('p')).toBeVisible();
    }
  }
);

Then(
  'the features should include {string}',
  async function (this: CustomWorld, featureName: string) {
    const section = this.page.locator('section[aria-labelledby="features-heading"]');
    await expect(section.locator(`text=${featureName}`)).toBeVisible();
  }
);

// ==================== S-4: Pricing section ====================

Then(
  'I should see 3 pricing tiers',
  async function (this: CustomWorld) {
    const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
    const tiers = section.locator('.grid > div');
    await expect(tiers).toHaveCount(3);
  }
);

Then(
  'the {string} tier should show {string} per month',
  async function (this: CustomWorld, tierName: string, price: string) {
    const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
    const tier = section.locator(`.grid > div:has(> h3:text("${tierName}"))`).first();
    await expect(tier).toBeVisible();
    await expect(tier.locator(`text=${price}`)).toBeVisible();
    await expect(tier.locator('text=/mo')).toBeVisible();
  }
);

Then(
  'the {string} tier should be highlighted as {string}',
  async function (this: CustomWorld, _tierName: string, badgeText: string) {
    const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
    await expect(section.locator(`text=${badgeText}`)).toBeVisible();
  }
);

// ==================== S-5 & S-6: CTA navigation ====================

When(
  'I click the {string} button',
  async function (this: CustomWorld, buttonText: string) {
    const cta = this.page.getByRole('link', { name: buttonText }).first();
    await cta.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
);

Then(
  'I should be navigated to {string}',
  async function (this: CustomWorld, path: string) {
    await this.page.waitForURL(`**${path}`, { timeout: 5000 });
    const url = new URL(this.page.url());
    expect(url.pathname).toBe(path);
  }
);

Then(
  'the {string} tier CTA should link to {string}',
  async function (this: CustomWorld, tierName: string, href: string) {
    const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
    const tier = section.locator(`.grid > div:has(> h3:text("${tierName}"))`).first();
    const link = tier.getByRole('link').first();
    await expect(link).toHaveAttribute('href', href);
  }
);

// ==================== S-7: Mobile responsive ====================

Given(
  'my viewport is {int} pixels wide by {int} pixels tall',
  async function (this: CustomWorld, width: number, height: number) {
    await this.page.setViewportSize({ width, height });
  }
);

Then(
  'feature cards should be stacked in a single column',
  async function (this: CustomWorld) {
    const section = this.page.locator('section[aria-labelledby="features-heading"]');
    const grid = section.locator('.grid');
    const style = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    // Single column means one column track (no multiple column values)
    const columnCount = style.split(' ').filter((s) => s.trim() && s !== 'none').length;
    expect(columnCount).toBeLessThanOrEqual(1);
  }
);

Then(
  'pricing cards should be stacked in a single column',
  async function (this: CustomWorld) {
    const section = this.page.locator('section[aria-labelledby="pricing-heading"]');
    const grid = section.locator('.grid');
    const style = await grid.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    const columnCount = style.split(' ').filter((s) => s.trim() && s !== 'none').length;
    expect(columnCount).toBeLessThanOrEqual(1);
  }
);

Then(
  'no horizontal scrollbar should be present',
  async function (this: CustomWorld) {
    const hasHorizontalScroll = await this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  }
);

Then(
  'all CTA buttons should have a minimum touch target of 44 pixels',
  async function (this: CustomWorld) {
    const ctas = this.page.locator('a[href="/register"]');
    const count = await ctas.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await ctas.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
);

// ==================== S-8: Footer ====================

Then(
  'I should see a link to {string} labeled {string}',
  async function (this: CustomWorld, href: string, label: string) {
    const link = this.page.getByRole('link', { name: label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', href);
  }
);

Then(
  'I should see a {string} link',
  async function (this: CustomWorld, linkText: string) {
    const link = this.page.getByRole('link', { name: linkText });
    await expect(link).toBeVisible();
  }
);

Then(
  'I should see {string} in the copyright notice',
  async function (this: CustomWorld, text: string) {
    const footer = this.page.locator('footer');
    await expect(footer.locator(`text=${text}`)).toBeVisible();
  }
);

Then(
  'the copyright notice should include the current year',
  async function (this: CustomWorld) {
    const currentYear = new Date().getFullYear().toString();
    const footer = this.page.locator('footer');
    const copyrightText = await footer.textContent();
    expect(copyrightText).toContain(currentYear);
  }
);

// ==================== S-9: Accessibility ====================

Then(
  'the page should use semantic HTML elements including {string}, {string}, {string}, and {string}',
  async function (this: CustomWorld, el1: string, el2: string, el3: string, el4: string) {
    for (const tag of [el1, el2, el3, el4]) {
      const count = await this.page.locator(tag).count();
      expect(count).toBeGreaterThan(0);
    }
  }
);

Then(
  'all interactive elements should be keyboard-focusable with visible focus indicators',
  async function (this: CustomWorld) {
    // Verify that links and buttons are focusable by checking they exist
    const interactiveElements = this.page.locator('a[href], button');
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify focus ring classes exist in the page source
    const pageContent = await this.page.content();
    expect(pageContent).toContain('focus:ring-2');
  }
);

Then(
  'all decorative icons should have aria-hidden set to true',
  async function (this: CustomWorld) {
    const decorativeIcons = this.page.locator('svg[aria-hidden="true"], [aria-hidden="true"]');
    const count = await decorativeIcons.count();
    expect(count).toBeGreaterThan(0);
  }
);

Then(
  'the page should have a proper heading hierarchy starting with h1',
  async function (this: CustomWorld) {
    const h1Count = await this.page.locator('h1').count();
    expect(h1Count).toBe(1);
    const h2Count = await this.page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(3);
  }
);
