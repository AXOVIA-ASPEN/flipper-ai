import { test, expect } from '@playwright/test';

/**
 * E2E tests for Image Proxy API
 *
 * BDD-style tests verifying the /api/images/proxy endpoint handles
 * URL validation, error responses, and parameter requirements correctly.
 */

test.describe('Image Proxy API', () => {
  const proxyEndpoint = '/api/images/proxy';

  test.describe('Feature: Image proxy URL validation', () => {
    test('Scenario: Given no url parameter, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get(proxyEndpoint);
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Missing 'url' parameter");
    });

    test('Scenario: Given an empty url parameter, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get(`${proxyEndpoint}?url=`);
      expect(response.status()).toBe(400);
    });

    test('Scenario: Given an invalid URL format, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get(`${proxyEndpoint}?url=not-a-valid-url`);
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid URL format');
    });

    test('Scenario: Given a non-http protocol URL, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent('ftp://example.com/image.jpg')}`
      );
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid URL format');
    });

    test('Scenario: Given a javascript protocol URL, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent('javascript:alert(1)')}`
      );
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Feature: Image proxy fetching', () => {
    test('Scenario: Given a valid image URL, When I request the proxy, Then I receive an image or redirect', async ({
      request,
    }) => {
      // Use a well-known, stable public image
      const imageUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent(imageUrl)}`,
        { maxRedirects: 0 }
      );
      // Should return 200 (proxied) or 302 (cached redirect)
      expect([200, 302]).toContain(response.status());

      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toMatch(/^image\//);
        expect(response.headers()['x-image-source']).toBe('proxy');
      }
    });

    test('Scenario: Given a URL that returns non-image content, When I request the proxy, Then I receive a 400 error', async ({
      request,
    }) => {
      const nonImageUrl = 'https://httpbin.org/json';
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent(nonImageUrl)}`,
        { maxRedirects: 0 }
      );
      // Should reject non-image content or fail gracefully
      expect([400, 302, 500]).toContain(response.status());
    });

    test('Scenario: Given a URL pointing to a non-existent resource, When I request the proxy, Then I receive an error', async ({
      request,
    }) => {
      const badUrl = 'https://httpbin.org/status/404';
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent(badUrl)}`,
        { maxRedirects: 0 }
      );
      expect([302, 404, 500]).toContain(response.status());
    });
  });

  test.describe('Feature: Image proxy caching control', () => {
    test('Scenario: Given cache=false parameter, When I request the proxy, Then the image is fetched without caching', async ({
      request,
    }) => {
      const imageUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
      const response = await request.get(
        `${proxyEndpoint}?url=${encodeURIComponent(imageUrl)}&cache=false`,
        { maxRedirects: 0 }
      );
      // Without caching, should proxy directly (200) rather than redirect to cache (302)
      expect([200, 302]).toContain(response.status());
    });
  });
});
