/**
 * @file Unit tests for GET/PATCH/DELETE /api/scraper-jobs/[id]
 *
 * Validates auth and ownership checks added in Story 3.7 (Task 4).
 */

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/scraper-jobs/[id]/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

// --- Mocks ---

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    scraperJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/usage-tracker', () => ({
  recordUsage: jest.fn().mockResolvedValue(undefined),
}));

const mockFindUnique = prisma.scraperJob.findUnique as jest.Mock;
const mockUpdate = prisma.scraperJob.update as jest.Mock;
const mockDelete = prisma.scraperJob.delete as jest.Mock;
const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;

// --- Helpers ---

const USER_ID = 'user-abc';
const OTHER_USER_ID = 'user-xyz';
const JOB_ID = 'job-123';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_ID,
    userId: USER_ID,
    platform: 'CRAIGSLIST',
    status: 'RUNNING',
    listingsFound: 0,
    opportunitiesFound: 0,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeParams(id = JOB_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest() {
  return new NextRequest(`http://localhost:3000/api/scraper-jobs/${JOB_ID}`, { method: 'GET' });
}

function makePatchRequest(body: Record<string, unknown> = { status: 'COMPLETED' }) {
  return new NextRequest(`http://localhost:3000/api/scraper-jobs/${JOB_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeDeleteRequest() {
  return new NextRequest(`http://localhost:3000/api/scraper-jobs/${JOB_ID}`, { method: 'DELETE' });
}

// --- Tests ---

describe('GET /api/scraper-jobs/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when job does not exist', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it('returns 403 when job belongs to a different user', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: OTHER_USER_ID }));

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 200 for the owner', async () => {
    const job = makeJob();
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(job);

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(JOB_ID);
  });

  it('returns 200 for a legacy null-userId job (any authenticated user)', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: null }));

    const res = await GET(makeGetRequest(), makeParams());
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/scraper-jobs/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const res = await PATCH(makePatchRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 when job belongs to a different user', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: OTHER_USER_ID }));

    const res = await PATCH(makePatchRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid status value', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob());

    const res = await PATCH(makePatchRequest({ status: 'INVALID' }), makeParams());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid status/);
  });

  it('updates and returns the job for the owner', async () => {
    const updated = makeJob({ status: 'COMPLETED', listingsFound: 10 });
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob());
    mockUpdate.mockResolvedValue(updated);

    const res = await PATCH(makePatchRequest({ status: 'COMPLETED', listingsFound: 10 }), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('COMPLETED');
    expect(data.listingsFound).toBe(10);
  });

  it('parses numeric string fields', async () => {
    const updated = makeJob({ listingsFound: 5, opportunitiesFound: 2 });
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob());
    mockUpdate.mockResolvedValue(updated);

    await PATCH(makePatchRequest({ listingsFound: '5', opportunitiesFound: '2' }), makeParams());

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ listingsFound: 5, opportunitiesFound: 2 }),
      })
    );
  });

  it('allows patching a legacy null-userId job', async () => {
    const updated = makeJob({ userId: null, status: 'COMPLETED' });
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: null }));
    mockUpdate.mockResolvedValue(updated);

    const res = await PATCH(makePatchRequest({ status: 'COMPLETED' }), makeParams());
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/scraper-jobs/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 403 when job belongs to a different user', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: OTHER_USER_ID }));

    const res = await DELETE(makeDeleteRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it('returns 200 and deletes for the owner', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob());
    mockDelete.mockResolvedValue({});

    const res = await DELETE(makeDeleteRequest(), makeParams());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: JOB_ID } });
  });

  it('allows deleting a legacy null-userId job', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeJob({ userId: null }));
    mockDelete.mockResolvedValue({});

    const res = await DELETE(makeDeleteRequest(), makeParams());
    expect(res.status).toBe(200);
  });

  it('returns 404 when job does not exist', async () => {
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    expect(res.status).toBe(404);
  });
});
