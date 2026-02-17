import { test, expect } from '@playwright/test';

/**
 * Feature: Scraper Jobs CRUD Management (BDD)
 *
 * Tests the full lifecycle of scraper jobs via the API:
 * creating, listing, reading, updating status, and deleting jobs.
 */

test.describe('Scraper Jobs CRUD', () => {
  let createdJobId: string;

  test.describe('Given the scraper jobs API is available', () => {
    test('When I create a new scraper job, Then it returns 201 with job data', async ({
      request,
    }) => {
      const response = await request.post('/api/scraper-jobs', {
        data: {
          platform: 'craigslist',
          location: 'tampa',
          category: 'electronics',
        },
      });

      expect(response.status()).toBe(201);
      const job = await response.json();

      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('platform', 'craigslist');
      expect(job).toHaveProperty('location', 'tampa');
      expect(job).toHaveProperty('category', 'electronics');
      expect(job).toHaveProperty('status', 'PENDING');
      expect(job).toHaveProperty('createdAt');

      createdJobId = job.id;
    });

    test('When I create a job with only platform, Then optional fields are null', async ({
      request,
    }) => {
      const response = await request.post('/api/scraper-jobs', {
        data: {
          platform: 'ebay',
        },
      });

      expect(response.status()).toBe(201);
      const job = await response.json();

      expect(job.platform).toBe('ebay');
      expect(job.location).toBeNull();
      expect(job.category).toBeNull();
      expect(job.status).toBe('PENDING');

      // Clean up
      await request.delete(`/api/scraper-jobs/${job.id}`);
    });

    test('When I create a job with invalid data, Then it returns 400', async ({ request }) => {
      const response = await request.post('/api/scraper-jobs', {
        data: {},
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });

  test.describe('Given a scraper job exists', () => {
    let jobId: string;

    test.beforeAll(async ({ request }) => {
      const response = await request.post('/api/scraper-jobs', {
        data: {
          platform: 'facebook',
          location: 'orlando',
          category: 'furniture',
        },
      });
      const job = await response.json();
      jobId = job.id;
    });

    test.afterAll(async ({ request }) => {
      if (jobId) {
        await request.delete(`/api/scraper-jobs/${jobId}`);
      }
    });

    test('When I list all scraper jobs, Then the created job appears in the list', async ({
      request,
    }) => {
      const response = await request.get('/api/scraper-jobs');

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body).toHaveProperty('jobs');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.jobs)).toBeTruthy();

      const found = body.jobs.find((j: { id: string }) => j.id === jobId);
      expect(found).toBeTruthy();
      expect(found.platform).toBe('facebook');
    });

    test('When I list jobs filtered by platform, Then only matching jobs return', async ({
      request,
    }) => {
      const response = await request.get('/api/scraper-jobs?platform=facebook');

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const job of body.jobs) {
        expect(job.platform).toBe('facebook');
      }
    });

    test('When I list jobs filtered by status, Then only matching jobs return', async ({
      request,
    }) => {
      const response = await request.get('/api/scraper-jobs?status=PENDING');

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      for (const job of body.jobs) {
        expect(job.status).toBe('PENDING');
      }
    });

    test('When I list jobs with a limit, Then at most that many return', async ({ request }) => {
      const response = await request.get('/api/scraper-jobs?limit=2');

      expect(response.ok()).toBeTruthy();
      const body = await response.json();

      expect(body.jobs.length).toBeLessThanOrEqual(2);
    });

    test('When I get the job by ID, Then it returns the correct job', async ({ request }) => {
      const response = await request.get(`/api/scraper-jobs/${jobId}`);

      expect(response.ok()).toBeTruthy();
      const job = await response.json();

      expect(job.id).toBe(jobId);
      expect(job.platform).toBe('facebook');
      expect(job.location).toBe('orlando');
      expect(job.category).toBe('furniture');
    });

    test('When I get a non-existent job, Then it returns 404', async ({ request }) => {
      const response = await request.get('/api/scraper-jobs/non-existent-id-xyz');

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test('When I update the job status to RUNNING, Then it reflects the change', async ({
      request,
    }) => {
      const response = await request.patch(`/api/scraper-jobs/${jobId}`, {
        data: {
          status: 'RUNNING',
          startedAt: new Date().toISOString(),
        },
      });

      expect(response.ok()).toBeTruthy();
      const job = await response.json();

      expect(job.status).toBe('RUNNING');
      expect(job.startedAt).toBeTruthy();
    });

    test('When I update the job with results, Then listingsFound and opportunitiesFound are set', async ({
      request,
    }) => {
      const response = await request.patch(`/api/scraper-jobs/${jobId}`, {
        data: {
          status: 'COMPLETED',
          listingsFound: 42,
          opportunitiesFound: 7,
          completedAt: new Date().toISOString(),
        },
      });

      expect(response.ok()).toBeTruthy();
      const job = await response.json();

      expect(job.status).toBe('COMPLETED');
      expect(job.listingsFound).toBe(42);
      expect(job.opportunitiesFound).toBe(7);
      expect(job.completedAt).toBeTruthy();
    });

    test('When I update with an invalid status, Then it returns 400', async ({ request }) => {
      const response = await request.patch(`/api/scraper-jobs/${jobId}`, {
        data: {
          status: 'INVALID_STATUS',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid status');
    });

    test('When I update with a FAILED status and error message, Then it stores the error', async ({
      request,
    }) => {
      const response = await request.patch(`/api/scraper-jobs/${jobId}`, {
        data: {
          status: 'FAILED',
          errorMessage: 'Connection timeout after 30s',
        },
      });

      expect(response.ok()).toBeTruthy();
      const job = await response.json();

      expect(job.status).toBe('FAILED');
      expect(job.errorMessage).toBe('Connection timeout after 30s');
    });
  });

  test.describe('Given I want to delete a scraper job', () => {
    test('When I delete an existing job, Then it returns success', async ({ request }) => {
      // Create a job to delete
      const createResponse = await request.post('/api/scraper-jobs', {
        data: {
          platform: 'mercari',
          location: 'miami',
          category: 'clothing',
        },
      });
      const job = await createResponse.json();

      const deleteResponse = await request.delete(`/api/scraper-jobs/${job.id}`);

      expect(deleteResponse.ok()).toBeTruthy();
      const body = await deleteResponse.json();
      expect(body).toHaveProperty('success', true);

      // Verify it's gone
      const getResponse = await request.get(`/api/scraper-jobs/${job.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Given the full scraper job lifecycle', () => {
    test('When a job goes through PENDING → RUNNING → COMPLETED, Then each transition works', async ({
      request,
    }) => {
      // Create
      const createRes = await request.post('/api/scraper-jobs', {
        data: { platform: 'offerup', location: 'jacksonville', category: 'tools' },
      });
      expect(createRes.status()).toBe(201);
      const job = await createRes.json();
      expect(job.status).toBe('PENDING');

      // Start running
      const runRes = await request.patch(`/api/scraper-jobs/${job.id}`, {
        data: { status: 'RUNNING', startedAt: new Date().toISOString() },
      });
      expect(runRes.ok()).toBeTruthy();
      const running = await runRes.json();
      expect(running.status).toBe('RUNNING');

      // Complete
      const completeRes = await request.patch(`/api/scraper-jobs/${job.id}`, {
        data: {
          status: 'COMPLETED',
          listingsFound: 15,
          opportunitiesFound: 3,
          completedAt: new Date().toISOString(),
        },
      });
      expect(completeRes.ok()).toBeTruthy();
      const completed = await completeRes.json();
      expect(completed.status).toBe('COMPLETED');
      expect(completed.listingsFound).toBe(15);
      expect(completed.opportunitiesFound).toBe(3);

      // Clean up
      await request.delete(`/api/scraper-jobs/${job.id}`);
    });
  });
});
