import { test, expect } from '@playwright/test';

test.describe('Landing Page - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section with branding', async ({ page }) => {
    // Verify logo and branding
    await expect(page.getByText('🐧')).toBeVisible();
    await expect(page.getByText('Flipper.ai')).toBeVisible();

    // Verify hero headline
    await expect(
      page.getByText('Find Hidden Profits in Every Marketplace')
    ).toBeVisible();

    // Verify tagline
    await expect(
      page.getByText(/AI-powered marketplace scanner/i)
    ).toBeVisible();
  });

  test('should display CTA buttons in header', async ({ page }) => {
    // Primary CTA
    const getStartedBtn = page.getByRole('button', { name: /get started/i });
    await expect(getStartedBtn).toBeVisible();
    await expect(getStartedBtn).toBeEnabled();

    // Login link
    const loginLink = page.getByRole('link', { name: /log in/i });
    await expect(loginLink).toBeVisible();
  });

  test('should navigate to signup page when clicking Get Started', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /get started/i }).first().click();

    // Should navigate to signup
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should navigate to login page when clicking Log In', async ({
    page,
  }) => {
    await page.getByRole('link', { name: /log in/i }).first().click();

    // Should navigate to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should display all 6 feature cards', async ({ page }) => {
    const features = [
      'Multi-Platform Scanning',
      'AI Value Detection',
      'Profit Calculator',
      'Real-Time Alerts',
      'Market Insights',
      'Scam Detection',
    ];

    for (const feature of features) {
      await expect(page.getByText(feature)).toBeVisible();
    }
  });

  test('should display pricing tiers', async ({ page }) => {
    // Free tier
    await expect(page.getByText('$0')).toBeVisible();
    await expect(page.getByText('5 scans per day')).toBeVisible();

    // Pro tier
    await expect(page.getByText('$29')).toBeVisible();
    await expect(page.getByText('Unlimited scans')).toBeVisible();
    await expect(page.getByText('MOST POPULAR')).toBeVisible();

    // Business tier
    await expect(page.getByText('$99')).toBeVisible();
    await expect(page.getByText('API access')).toBeVisible();
  });

  test('should have working email capture in hero CTA', async ({ page }) => {
    const emailInput = page
      .getByPlaceholder(/enter your email/i)
      .first();
    await expect(emailInput).toBeVisible();

    // Type email
    await emailInput.fill('test@example.com');

    // Click CTA button next to it
    const ctaButton = page.getByRole('button', { name: /start free/i }).first();
    await ctaButton.click();

    // Should navigate to signup
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should display footer with links', async ({ page }) => {
    // Footer branding
    await expect(page.locator('footer').getByText('🐧')).toBeVisible();
    await expect(page.locator('footer').getByText('Flipper.ai')).toBeVisible();

    // Footer links
    await expect(page.getByRole('link', { name: /privacy/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /terms/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /contact/i })).toBeVisible();

    // Copyright
    await expect(
      page.getByText(/© 2026 Flipper\.ai by Axovia AI/i)
    ).toBeVisible();
  });

  test('should have responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify hero is still visible
    await expect(page.getByText('Find Hidden Profits')).toBeVisible();

    // Verify CTA is visible
    await expect(page.getByRole('button', { name: /get started/i }).first()).toBeVisible();

    // Verify pricing cards stack vertically (check grid layout)
    const pricingCards = page.locator('[class*="grid"]').filter({ hasText: '$0' });
    await expect(pricingCards).toBeVisible();
  });

  test('should have all CTA buttons that navigate to signup', async ({
    page,
  }) => {
    // Count all "Get Started" / "Start Free" buttons
    const ctaButtons = page.getByRole('button', {
      name: /get started|start free|start pro trial/i,
    });

    const count = await ctaButtons.count();
    expect(count).toBeGreaterThan(3); // Hero, pricing tiers, bottom CTA

    // Click the bottom CTA
    await page
      .getByRole('button', { name: /start your free trial/i })
      .click();

    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Flipper\.ai/i);

    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute(
      'content',
      /marketplace|flipping|AI/i
    );
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have no console errors
    expect(consoleErrors.length).toBe(0);
  });

  test('should have animated gradient orbs in background', async ({ page }) => {
    // Check for gradient orb elements (they have specific classes)
    const orbs = page.locator('[class*="blob"]');
    const orbCount = await orbs.count();

    expect(orbCount).toBeGreaterThanOrEqual(3); // Should have 3 animated orbs
  });

  test('should have hover effects on pricing cards', async ({ page }) => {
    const proCard = page.locator('text=Pro').locator('..');

    // Get initial border color
    const initialBorder = await proCard.evaluate((el) =>
      window.getComputedStyle(el).border
    );

    // Hover over card
    await proCard.hover();

    // Border should change on hover (has hover:scale-105 or similar)
    const hoveredTransform = await proCard.evaluate((el) =>
      window.getComputedStyle(el).transform
    );

    expect(hoveredTransform).not.toBe('none'); // Should have transform on hover
  });
});
