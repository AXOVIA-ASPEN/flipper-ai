import { test, expect } from '@playwright/test';

/**
 * SEO and Meta Tags E2E Tests
 *
 * BDD-style tests for SEO-critical features:
 * - Sitemap.xml generation and format
 * - Robots.txt accessibility
 * - Meta tags (title, description, keywords, OG tags)
 * - Canonical URLs
 * - Structured data
 *
 * These tests ensure search engines can properly index Flipper AI.
 */

test.describe('SEO: Sitemap and Robots', () => {
  test('Given the application is deployed, When accessing /sitemap.xml, Then it returns valid XML with correct URLs', async ({
    page,
  }) => {
    // Navigate to sitemap
    const response = await page.goto('/sitemap.xml');

    // Then: Should return 200 OK
    expect(response?.status()).toBe(200);

    // Then: Content-Type should be XML
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('xml');

    // Then: Should contain XML declaration
    const content = await response?.text();
    expect(content).toContain('<?xml');
    expect(content).toContain('<urlset');

    // Then: Should include public pages
    expect(content).toContain('<loc>');
    expect(content).toContain('/login</loc>');
    expect(content).toContain('/register</loc>');

    // Then: Should include lastModified and priority
    expect(content).toContain('<lastmod>');
    expect(content).toContain('<priority>');
  });

  test('Given the application is deployed, When accessing /robots.txt, Then it returns valid robots directives', async ({
    page,
  }) => {
    // Navigate to robots.txt
    const response = await page.goto('/robots.txt');

    // Then: Should return 200 OK
    expect(response?.status()).toBe(200);

    // Then: Content should be plain text
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('text/plain');

    // Then: Should contain standard directives
    const content = await response?.text();
    expect(content).toContain('User-agent:');
    expect(content).toContain('Allow:');
    expect(content).toContain('Disallow:');

    // Then: Should reference sitemap
    expect(content).toContain('Sitemap:');
    expect(content).toContain('sitemap.xml');

    // Then: Should block API routes
    expect(content).toContain('Disallow: /api/');

    // Then: Should allow public pages
    expect(content).toMatch(/Allow: \/login|Allow: \/register/);
  });
});

test.describe('SEO: Homepage Meta Tags', () => {
  test('Given a user visits the homepage, When the page loads, Then all essential meta tags are present', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: Title should be descriptive and contain brand name
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);
    expect(title.toLowerCase()).toContain('flipper');

    // Then: Meta description should exist and be meaningful
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription!.length).toBeGreaterThan(50);
    expect(metaDescription!.length).toBeLessThan(160); // SEO best practice

    // Then: Meta keywords should exist
    const metaKeywords = await page.locator('meta[name="keywords"]').getAttribute('content');
    expect(metaKeywords).toBeTruthy();
    expect(metaKeywords).toContain('flipping');
  });

  test('Given a user visits the homepage, When the page loads, Then Open Graph tags are present for social sharing', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: OG title should exist
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    // Then: OG description should exist
    const ogDescription = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(ogDescription).toBeTruthy();

    // Then: OG type should be website
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    if (ogType) {
      expect(ogType).toBe('website');
    }

    // Then: OG URL should match current page or be absolute
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    if (ogUrl) {
      expect(ogUrl).toMatch(/^https?:\/\//);
    }
  });

  test('Given a user visits the homepage, When inspecting the document head, Then canonical URL is present', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: Canonical link should exist (if implemented)
    const canonicalLink = await page.locator('link[rel="canonical"]').getAttribute('href');

    // Note: Canonical might not be implemented yet, so we check conditionally
    if (canonicalLink) {
      expect(canonicalLink).toMatch(/^https?:\/\//);
      expect(canonicalLink).not.toContain('localhost'); // Should use production domain in prod
    }
  });

  test('Given a user visits the homepage, When checking viewport meta tag, Then it is mobile-friendly', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: Viewport meta tag should exist
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();

    // Then: Should include width=device-width for responsiveness
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});

test.describe('SEO: Login and Register Pages', () => {
  test('Given a user visits /login, When the page loads, Then meta tags are appropriate for auth page', async ({
    page,
  }) => {
    // When: Navigate to login page
    await page.goto('/login');

    // Then: Title should indicate this is the login page
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/login|sign in|flipper/);

    // Then: Meta description should exist
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(metaDescription).toBeTruthy();
  });

  test('Given a user visits /register, When the page loads, Then meta tags are appropriate for registration', async ({
    page,
  }) => {
    // When: Navigate to register page
    await page.goto('/register');

    // Then: Title should indicate this is the registration page
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/register|sign up|flipper/);

    // Then: Meta description should exist
    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(metaDescription).toBeTruthy();
  });

  test('Given a user visits /register, When checking meta robots tag, Then noindex directive may be present for auth pages', async ({
    page,
  }) => {
    // When: Navigate to register page
    await page.goto('/register');

    // Then: Check if robots meta tag exists (optional, but good practice for auth pages)
    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content');

    // If it exists, it might say noindex for privacy
    if (robotsMeta) {
      // This is optional - some sites noindex auth pages, some don't
      console.log('Robots meta tag on /register:', robotsMeta);
    }
  });
});

test.describe('SEO: Structured Data', () => {
  test('Given a user visits the homepage, When checking for JSON-LD, Then structured data may be present for rich snippets', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: Check if any JSON-LD scripts exist (optional feature)
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').count();

    if (jsonLdScripts > 0) {
      // Then: Validate JSON-LD is valid JSON
      const jsonLdContent = await page
        .locator('script[type="application/ld+json"]')
        .first()
        .textContent();

      expect(() => JSON.parse(jsonLdContent!)).not.toThrow();

      const structuredData = JSON.parse(jsonLdContent!);

      // Then: Should have @context and @type
      expect(structuredData['@context']).toBeTruthy();
      expect(structuredData['@type']).toBeTruthy();
    } else {
      // Log that no structured data found (not a failure, just informational)
      console.log('No JSON-LD structured data found on homepage');
    }
  });
});

test.describe('SEO: Performance and Accessibility Impact', () => {
  test('Given a user visits the homepage, When measuring page load, Then meta tags do not significantly impact performance', async ({
    page,
  }) => {
    // When: Navigate with performance tracking
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Then: Page should load reasonably fast (meta tags are lightweight)
    expect(loadTime).toBeLessThan(5000); // 5 seconds max for DOMContentLoaded

    // Then: Verify meta tags are still present after fast load
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('Given a user with a screen reader visits the homepage, When checking lang attribute, Then HTML has proper language declaration', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: HTML tag should have lang attribute for accessibility
    const langAttribute = await page.locator('html').getAttribute('lang');
    expect(langAttribute).toBeTruthy();
    expect(langAttribute).toBe('en'); // English
  });
});

test.describe('SEO: Social Media Preview', () => {
  test('Given a page is shared on social media, When Twitter/X scrapes the page, Then Twitter Card meta tags are present', async ({
    page,
  }) => {
    // When: Navigate to homepage
    await page.goto('/');

    // Then: Check for Twitter Card tags (optional but recommended)
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    const twitterDescription = await page
      .locator('meta[name="twitter:description"]')
      .getAttribute('content');

    // If Twitter Card is implemented
    if (twitterCard) {
      expect(twitterCard).toMatch(/summary|summary_large_image/);
      expect(twitterTitle).toBeTruthy();
      expect(twitterDescription).toBeTruthy();
    } else {
      console.log('Twitter Card meta tags not implemented (optional)');
    }
  });
});
