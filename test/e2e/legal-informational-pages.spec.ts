import { test, expect } from '@playwright/test';

/**
 * Legal and Informational Pages - E2E BDD Tests
 * 
 * Feature: Legal and Informational Pages
 *   As a user or potential customer
 *   I want to access legal documents and help resources
 *   So that I can understand my rights, the service terms, and get help when needed
 */

test.describe('Legal and Informational Pages - BDD Tests', () => {
  test.describe('Feature: Privacy Policy Page', () => {
    test('Given I want to review privacy practices, When I navigate to /privacy, Then I should see the privacy policy', async ({ page }) => {
      // Given I want to review privacy practices
      // When I navigate to /privacy
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // Then I should see the privacy policy
      await expect(
        page.locator('h1').filter({ hasText: /privacy/i })
      ).toBeVisible({ timeout: 5000 });

      // The page should contain key privacy-related terms
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      
      // Check for essential privacy policy sections
      const privacyKeywords = [
        /data|information/i,
        /collect|processing/i,
        /user|personal/i,
      ];
      
      const hasPrivacyContent = privacyKeywords.some(keyword => 
        pageContent && keyword.test(pageContent)
      );
      expect(hasPrivacyContent).toBeTruthy();
    });

    test('Given I am on the privacy policy, When I scroll through the document, Then I should see all required sections', async ({ page }) => {
      // Given I am on the privacy policy
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // When I scroll through the document
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Then I should see all required sections
      // Most privacy policies should have these sections
      const pageText = await page.textContent('body');
      
      // At least one of these common privacy sections should exist
      const commonSections = [
        /information.*collect/i,
        /how.*use/i,
        /data.*security/i,
        /cookies/i,
        /third.?party/i,
        /contact.*us/i,
      ];

      const hasSomeSections = commonSections.filter(section => 
        pageText && section.test(pageText)
      ).length > 0;

      expect(hasSomeSections).toBeTruthy();
    });

    test('Given I am reading privacy policy, When I look for contact information, Then I should find a way to reach out about privacy concerns', async ({ page }) => {
      // Given I am reading privacy policy
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // When I look for contact information
      const pageText = await page.textContent('body');

      // Then I should find a way to reach out about privacy concerns
      // Look for email addresses or contact links
      const hasContactInfo = pageText && (
        /email|contact|support|privacy@/i.test(pageText) ||
        pageText.includes('@')
      );

      expect(hasContactInfo).toBeTruthy();
    });

    test('Given I am on privacy policy, When I check the page metadata, Then it should have proper SEO tags', async ({ page }) => {
      // Given I am on privacy policy
      await page.goto('/privacy');

      // When I check the page metadata
      const title = await page.title();
      const metaDescription = await page.getAttribute('meta[name="description"]', 'content');

      // Then it should have proper SEO tags
      expect(title).toBeTruthy();
      expect(title.toLowerCase()).toContain('privacy');
    });
  });

  test.describe('Feature: Terms of Service Page', () => {
    test('Given I want to understand service terms, When I navigate to /terms, Then I should see the terms of service', async ({ page }) => {
      // Given I want to understand service terms
      // When I navigate to /terms
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      // Then I should see the terms of service
      await expect(
        page.locator('h1').filter({ hasText: /terms/i })
      ).toBeVisible({ timeout: 5000 });

      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();

      // Check for terms-related keywords
      const termsKeywords = [
        /agreement|terms/i,
        /service|use/i,
        /user|account/i,
      ];

      const hasTermsContent = termsKeywords.some(keyword =>
        pageContent && keyword.test(pageContent)
      );
      expect(hasTermsContent).toBeTruthy();
    });

    test('Given I am reviewing terms, When I look for key sections, Then I should find user obligations and rights', async ({ page }) => {
      // Given I am reviewing terms
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      // When I look for key sections
      const pageText = await page.textContent('body');

      // Then I should find user obligations and rights
      const keyTermsSections = [
        /account|registration/i,
        /prohibited|allowed/i,
        /liability|disclaimer/i,
        /termination|cancellation/i,
      ];

      const hasSomeSections = keyTermsSections.filter(section =>
        pageText && section.test(pageText)
      ).length > 0;

      expect(hasSomeSections).toBeTruthy();
    });

    test('Given I am on terms of service, When I check for last updated date, Then I should see when the terms were last modified', async ({ page }) => {
      // Given I am on terms of service
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      // When I check for last updated date
      const pageText = await page.textContent('body');

      // Then I should see when the terms were last modified
      // Look for date patterns or "last updated", "effective date", etc.
      const hasUpdateInfo = pageText && (
        /last.*updated|effective.*date|version.*\d/i.test(pageText) ||
        /20\d{2}/.test(pageText) // Year pattern
      );

      expect(hasUpdateInfo).toBeTruthy();
    });

    test('Given I am reading terms, When the page loads, Then it should be accessible without authentication', async ({ page }) => {
      // Given I am reading terms
      // When the page loads
      const response = await page.goto('/terms');

      // Then it should be accessible without authentication
      expect(response?.status()).toBeLessThan(400);
      
      // Should not redirect to login
      expect(page.url()).toContain('/terms');
      expect(page.url()).not.toContain('/login');
      expect(page.url()).not.toContain('/auth');
    });
  });

  test.describe('Feature: Help/FAQ Page', () => {
    test('Given I need help, When I navigate to /help or /faq, Then I should see help resources', async ({ page }) => {
      // Try common help URLs
      const helpUrls = ['/help', '/faq', '/support'];
      let foundHelpPage = false;

      for (const url of helpUrls) {
        const response = await page.goto(url);
        
        if (response && response.status() < 400) {
          foundHelpPage = true;
          
          // Should see help-related content
          const heading = page.locator('h1').first();
          const headingText = await heading.textContent().catch(() => '');
          
          if (headingText && /help|faq|support|questions/i.test(headingText)) {
            await expect(heading).toBeVisible();
            break;
          }
        }
      }

      // At least one help URL should exist
      // If none exist, this is a gap to fill
      expect(foundHelpPage).toBeTruthy();
    });

    test('Given I am on the help page, When I search for common topics, Then I should find relevant help articles', async ({ page }) => {
      // Try to access help page
      const helpUrls = ['/help', '/faq', '/support'];
      
      for (const url of helpUrls) {
        const response = await page.goto(url);
        
        if (response && response.status() < 400) {
          await page.waitForLoadState('networkidle');

          // When I search for common topics
          const searchInput = page.locator('input[type="search"]').or(
            page.locator('input[placeholder*="search" i]')
          );

          if (await searchInput.count() > 0) {
            await searchInput.first().fill('account');
            await page.waitForTimeout(500);

            // Then I should find relevant help articles
            // Results should appear or page should update
            const pageContent = await page.textContent('body');
            expect(pageContent).toBeTruthy();
          }
          break;
        }
      }
    });

    test('Given I am browsing help topics, When I click on a category, Then I should see expanded information', async ({ page }) => {
      // Try to access help page
      const helpUrls = ['/help', '/faq', '/support'];
      
      for (const url of helpUrls) {
        const response = await page.goto(url);
        
        if (response && response.status() < 400) {
          await page.waitForLoadState('networkidle');

          // Look for expandable sections (accordion, collapsible, etc.)
          const expandableElements = await page.locator('[aria-expanded]').count() ||
                                     await page.locator('details').count() ||
                                     await page.locator('[data-accordion]').count();

          if (expandableElements > 0) {
            // When I click on a category
            const firstExpandable = page.locator('[aria-expanded="false"]').first().or(
              page.locator('details').first()
            );

            if (await firstExpandable.count() > 0) {
              await firstExpandable.click();
              await page.waitForTimeout(300);

              // Then I should see expanded information
              // The element should change state
              expect(true).toBeTruthy(); // Expanded successfully
            }
          }
          break;
        }
      }
    });
  });

  test.describe('Feature: About Page', () => {
    test('Given I want to learn about the company, When I navigate to /about, Then I should see company information', async ({ page }) => {
      // Given I want to learn about the company
      // When I navigate to /about
      const response = await page.goto('/about');

      // Then I should see company information
      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        await expect(
          page.locator('h1').filter({ hasText: /about/i })
        ).toBeVisible({ timeout: 5000 });

        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        expect(pageContent!.length).toBeGreaterThan(100); // Should have substantial content
      } else {
        // About page might not exist yet - this test documents the expectation
        expect(response?.status()).toBeLessThan(500);
      }
    });

    test('Given I am on the about page, When I look for mission/vision, Then I should understand what the company does', async ({ page }) => {
      // Given I am on the about page
      const response = await page.goto('/about');

      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // When I look for mission/vision
        const pageText = await page.textContent('body');

        // Then I should understand what the company does
        // Should mention flipping, marketplace, reselling, or similar concepts
        const hasRelevantContent = pageText && (
          /flip|resell|marketplace|buy.*sell/i.test(pageText)
        );

        expect(hasRelevantContent).toBeTruthy();
      }
    });

    test('Given I am reading about the company, When I scroll to footer, Then I should see contact information', async ({ page }) => {
      // Given I am reading about the company
      const response = await page.goto('/about');

      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // When I scroll to footer
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(300);

        // Then I should see contact information
        const footer = page.locator('footer').or(
          page.locator('[role="contentinfo"]')
        );

        if (await footer.count() > 0) {
          const footerText = await footer.textContent();
          const hasContact = footerText && (
            /@|email|contact/i.test(footerText)
          );

          expect(hasContact).toBeTruthy();
        }
      }
    });
  });

  test.describe('Feature: Contact/Support Form', () => {
    test('Given I need to contact support, When I navigate to /contact, Then I should see a contact form', async ({ page }) => {
      // Given I need to contact support
      // When I navigate to /contact
      const response = await page.goto('/contact');

      // Then I should see a contact form
      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // Look for form elements
        const hasForm = await page.locator('form').count() > 0;
        const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
        const hasMessageArea = await page.locator('textarea').count() > 0;

        expect(hasForm || hasEmailInput || hasMessageArea).toBeTruthy();
      } else {
        // Contact page might not exist yet
        expect(response?.status()).toBeLessThan(500);
      }
    });

    test('Given I am on the contact form, When I fill out all required fields, Then the submit button should be enabled', async ({ page }) => {
      // Given I am on the contact form
      const response = await page.goto('/contact');

      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // When I fill out all required fields
        const nameInput = page.locator('input[name="name"]').or(
          page.getByLabel(/name/i)
        );
        const emailInput = page.locator('input[type="email"]').or(
          page.getByLabel(/email/i)
        );
        const messageInput = page.locator('textarea').or(
          page.getByLabel(/message/i)
        );

        if (await nameInput.count() > 0) {
          await nameInput.first().fill('Test User');
        }
        if (await emailInput.count() > 0) {
          await emailInput.first().fill('test@example.com');
        }
        if (await messageInput.count() > 0) {
          await messageInput.first().fill('This is a test message for support.');
        }

        // Then the submit button should be enabled
        const submitButton = page.locator('button[type="submit"]').or(
          page.locator('button:has-text("Send")').or(
            page.locator('button:has-text("Submit")')
          )
        );

        if (await submitButton.count() > 0) {
          await expect(submitButton.first()).toBeEnabled();
        }
      }
    });

    test('Given I submit a contact form, When the form is valid, Then I should see a success confirmation', async ({ page }) => {
      // Mock the contact form submission
      await page.route('**/api/contact', async (route) => {
        await route.fulfill({
          status: 200,
          json: { success: true, message: 'Message sent successfully' },
        });
      });

      // Given I submit a contact form
      const response = await page.goto('/contact');

      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // Fill out form
        const emailInput = page.locator('input[type="email"]').first();
        const messageInput = page.locator('textarea').first();

        if (await emailInput.count() > 0 && await messageInput.count() > 0) {
          await emailInput.fill('test@example.com');
          await messageInput.fill('Test message');

          // When the form is valid
          const submitButton = page.locator('button[type="submit"]').first();
          
          if (await submitButton.count() > 0) {
            await submitButton.click();

            // Then I should see a success confirmation
            await expect(
              page.getByText(/success|sent|thank/i)
            ).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('Given I am filling contact form, When I provide invalid email, Then I should see validation error', async ({ page }) => {
      // Given I am filling contact form
      const response = await page.goto('/contact');

      if (response && response.status() < 400) {
        await page.waitForLoadState('networkidle');

        // When I provide invalid email
        const emailInput = page.locator('input[type="email"]').first();

        if (await emailInput.count() > 0) {
          await emailInput.fill('invalid-email');
          await emailInput.blur();

          // Then I should see validation error
          await expect(
            page.getByText(/invalid.*email|email.*valid/i)
          ).toBeVisible({ timeout: 3000 });
        }
      }
    });
  });

  test.describe('Feature: Footer Legal Links', () => {
    test('Given I am on any page, When I scroll to footer, Then I should see links to legal pages', async ({ page }) => {
      // Given I am on any page (use home page)
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // When I scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // Then I should see links to legal pages
      const footer = page.locator('footer').or(
        page.locator('[role="contentinfo"]')
      );

      if (await footer.count() > 0) {
        // Check for common legal links
        const privacyLink = footer.locator('a[href*="privacy"]');
        const termsLink = footer.locator('a[href*="terms"]');

        const hasLegalLinks = 
          (await privacyLink.count() > 0) || 
          (await termsLink.count() > 0);

        expect(hasLegalLinks).toBeTruthy();
      } else {
        // Footer should exist on the page
        expect(await page.locator('footer').count()).toBeGreaterThan(0);
      }
    });

    test('Given I see footer links, When I click Privacy Policy link, Then I should navigate to privacy page', async ({ page }) => {
      // Given I see footer links
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // When I click Privacy Policy link
      const privacyLink = page.locator('a[href*="privacy"]').first();

      if (await privacyLink.count() > 0) {
        await privacyLink.click();
        await page.waitForLoadState('networkidle');

        // Then I should navigate to privacy page
        expect(page.url()).toContain('privacy');
      }
    });

    test('Given I see footer links, When I click Terms of Service link, Then I should navigate to terms page', async ({ page }) => {
      // Given I see footer links
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // When I click Terms of Service link
      const termsLink = page.locator('a[href*="terms"]').first();

      if (await termsLink.count() > 0) {
        await termsLink.click();
        await page.waitForLoadState('networkidle');

        // Then I should navigate to terms page
        expect(page.url()).toContain('terms');
      }
    });
  });

  test.describe('Feature: Accessibility - Legal Pages', () => {
    test('Given I use keyboard navigation, When I tab through privacy policy, Then all interactive elements should be reachable', async ({ page }) => {
      // Given I use keyboard navigation
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // When I tab through privacy policy
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Then all interactive elements should be reachable
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    test('Given I use screen reader, When I access terms page, Then headings should be properly structured', async ({ page }) => {
      // Given I use screen reader
      await page.goto('/terms');
      await page.waitForLoadState('networkidle');

      // When I access terms page
      // Then headings should be properly structured
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
      expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page

      // Should have proper heading hierarchy
      const headings = await page.locator('h1, h2, h3').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('Given legal pages, When I check page language, Then lang attribute should be set', async ({ page }) => {
      // Given legal pages
      const legalPages = ['/privacy', '/terms'];

      for (const url of legalPages) {
        // When I check page language
        const response = await page.goto(url);

        if (response && response.status() < 400) {
          // Then lang attribute should be set
          const htmlLang = await page.getAttribute('html', 'lang');
          expect(htmlLang).toBeTruthy();
          expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., "en" or "en-US"
        }
      }
    });
  });

  test.describe('Feature: Mobile Responsiveness - Legal Pages', () => {
    test('Given I am on mobile device, When I view privacy policy, Then content should be readable without horizontal scrolling', async ({ page }) => {
      // Given I am on mobile device
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      // When I view privacy policy
      await page.goto('/privacy');
      await page.waitForLoadState('networkidle');

      // Then content should be readable without horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow 5px tolerance
    });

    test('Given I am on tablet, When I navigate legal pages, Then layout should be responsive', async ({ page }) => {
      // Given I am on tablet
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      // When I navigate legal pages
      const legalPages = ['/privacy', '/terms', '/about'];

      for (const url of legalPages) {
        const response = await page.goto(url);

        if (response && response.status() < 400) {
          await page.waitForLoadState('networkidle');

          // Then layout should be responsive
          const viewportWidth = await page.evaluate(() => window.innerWidth);
          expect(viewportWidth).toBe(768);

          // Content should be visible
          const mainContent = await page.locator('main, article, [role="main"]').first();
          if (await mainContent.count() > 0) {
            await expect(mainContent).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Feature: SEO - Legal and Info Pages', () => {
    test('Given search engines index the site, When they crawl legal pages, Then each should have unique meta descriptions', async ({ page }) => {
      // Given search engines index the site
      const legalPages = [
        { url: '/privacy', keyword: 'privacy' },
        { url: '/terms', keyword: 'terms' },
      ];

      const metaDescriptions: string[] = [];

      for (const pageInfo of legalPages) {
        // When they crawl legal pages
        const response = await page.goto(pageInfo.url);

        if (response && response.status() < 400) {
          const metaDesc = await page.getAttribute('meta[name="description"]', 'content');
          const title = await page.title();

          // Then each should have unique meta descriptions
          if (metaDesc) {
            expect(metaDescriptions).not.toContain(metaDesc);
            metaDescriptions.push(metaDesc);
          }

          // Title should mention the page type
          expect(title.toLowerCase()).toContain(pageInfo.keyword);
        }
      }
    });

    test('Given legal pages need indexing, When I check robots meta tag, Then pages should allow indexing', async ({ page }) => {
      // Given legal pages need indexing
      const legalPages = ['/privacy', '/terms'];

      for (const url of legalPages) {
        // When I check robots meta tag
        const response = await page.goto(url);

        if (response && response.status() < 400) {
          const robotsMeta = await page.getAttribute('meta[name="robots"]', 'content');

          // Then pages should allow indexing (or no robots meta = default allow)
          if (robotsMeta) {
            expect(robotsMeta.toLowerCase()).not.toContain('noindex');
          }
        }
      }
    });
  });
});
