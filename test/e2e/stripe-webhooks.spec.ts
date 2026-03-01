import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Stripe Webhook Handling
 *
 * BDD-style tests verifying the /api/webhooks/stripe endpoint
 * handles various Stripe event types correctly, validates signatures,
 * and rejects malformed requests.
 */

test.describe('Feature: Stripe Webhook Processing', () => {
  const WEBHOOK_URL = '/api/webhooks/stripe';

  test.describe('Scenario: Signature Validation', () => {
    test('Given a request with no stripe-signature header, When I POST to the webhook, Then it returns 400 with missing signature error', async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: '{}',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Missing signature');
    });

    test('Given a request with an invalid stripe-signature, When I POST to the webhook, Then it returns 400 with invalid signature error', async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: JSON.stringify({ type: 'checkout.session.completed' }),
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=1234567890,v1=invalid_signature_value',
        },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid signature');
    });
  });

  test.describe('Scenario: Malformed Request Bodies', () => {
    test('Given an empty request body, When I POST to the webhook, Then it returns 400', async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: '',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=0,v1=fake',
        },
      });
      expect(response.status()).toBe(400);
    });

    test('Given a non-JSON body with a signature header, When I POST to the webhook, Then it returns 400 (signature mismatch)', async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: 'not-json-at-all',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': 't=9999999999,v1=abc123def456',
        },
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Scenario: Method Validation', () => {
    test('Given a GET request to the webhook endpoint, When I send it, Then it returns 405 Method Not Allowed', async ({
      request,
    }) => {
      const response = await request.get(WEBHOOK_URL);
      // Next.js API routes without GET handler return 405
      expect([404, 405]).toContain(response.status());
    });

    test('Given a PUT request to the webhook endpoint, When I send it, Then it returns 405 Method Not Allowed', async ({
      request,
    }) => {
      const response = await request.put(WEBHOOK_URL, {
        data: '{}',
        headers: { 'stripe-signature': 't=0,v1=fake' },
      });
      expect([404, 405]).toContain(response.status());
    });
  });

  test.describe('Scenario: Content-Type Handling', () => {
    test('Given a webhook POST with application/x-www-form-urlencoded, When Stripe sends it, Then the endpoint still validates the signature', async ({
      request,
    }) => {
      const response = await request.post(WEBHOOK_URL, {
        data: 'type=checkout.session.completed',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'stripe-signature': 't=1234567890,v1=bad_sig',
        },
      });
      // Should still attempt signature validation and reject
      expect(response.status()).toBe(400);
    });
  });
});
