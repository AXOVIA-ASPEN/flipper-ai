import { test, expect } from '@playwright/test';

/**
 * E2E: Reports Generation Flow
 *
 * BDD Scenarios for the /api/reports/generate endpoint.
 * Covers weekly/monthly report generation in JSON and CSV formats,
 * input validation, and custom date range support.
 */

test.describe('Reports Generation', () => {
  test.describe('Given a user wants a performance report', () => {
    test('When they request a weekly JSON report, Then they receive valid report data', async ({
      request,
    }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'weekly',
          format: 'json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      // Report structure validation
      expect(body).toHaveProperty('userId', 'test-user-1');
      expect(body).toHaveProperty('period', 'weekly');
      expect(body).toHaveProperty('dateRange');
      expect(body.dateRange).toHaveProperty('start');
      expect(body.dateRange).toHaveProperty('end');
      expect(body).toHaveProperty('summary');
    });

    test('When they request a monthly JSON report, Then the period is monthly', async ({
      request,
    }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'monthly',
          format: 'json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body).toHaveProperty('period', 'monthly');
    });

    test('When they request a CSV report, Then they receive text/csv content', async ({
      request,
    }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'weekly',
          format: 'csv',
        },
      });

      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);
      // CSV should have header row
      expect(text).toContain(',');
    });

    test('When they use GET with query params, Then it returns a valid report', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/reports/generate?userId=test-user-1&period=weekly&format=json'
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body).toHaveProperty('period', 'weekly');
    });

    test('When they use GET with CSV format, Then it returns CSV', async ({ request }) => {
      const response = await request.get(
        '/api/reports/generate?userId=test-user-1&period=monthly&format=csv'
      );

      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');
    });
  });

  test.describe('Given a user requests a custom date range report', () => {
    test('When they provide valid start and end dates, Then the report covers that range', async ({
      request,
    }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'custom',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          format: 'json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body).toHaveProperty('period', 'custom');
    });

    test('When they omit dates for custom period, Then it returns a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'custom',
          format: 'json',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('startDate');
    });
  });

  test.describe('Given invalid report parameters', () => {
    test('When userId is missing, Then it returns a 400 error', async ({ request }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          period: 'weekly',
          format: 'json',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('userId');
    });

    test('When period is invalid, Then it returns a 400 error', async ({ request }) => {
      const response = await request.post('/api/reports/generate', {
        data: {
          userId: 'test-user-1',
          period: 'biweekly',
          format: 'json',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid period');
    });
  });
});
