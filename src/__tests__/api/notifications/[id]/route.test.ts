import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/notifications/[id]/route';

// Mock auth
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
jest.mock('@/lib/auth', () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...(args as [])),
}));

// Mock Prisma
jest.mock('@/lib/db', () => {
  const db = {
    notificationEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return { __esModule: true, default: db, prisma: db };
});

import db from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;
const mockFindUnique: jest.Mock = mockDb.notificationEvent.findUnique;
const mockUpdate: jest.Mock = mockDb.notificationEvent.update;

const makeRequest = (body: unknown) =>
  new NextRequest(new URL('http://localhost:3000/api/notifications/evt-1'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

const sampleEvent = {
  id: 'evt-1',
  userId: 'user-1',
  listingId: 'lst-1',
  eventType: 'listing.sold',
  status: 'PENDING',
  processedAt: null,
};

describe('PATCH /api/notifications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: 'PROCESSED' }), makeContext('evt-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when event not found', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ status: 'PROCESSED' }), makeContext('evt-1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s event', async () => {
    mockFindUnique.mockResolvedValueOnce({ ...sampleEvent, userId: 'other-user' });
    const res = await PATCH(makeRequest({ status: 'PROCESSED' }), makeContext('evt-1'));
    expect(res.status).toBe(403);
  });

  it('returns 422 for invalid status value', async () => {
    mockFindUnique.mockResolvedValueOnce(sampleEvent);
    const res = await PATCH(makeRequest({ status: 'PENDING' }), makeContext('evt-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 for missing status field', async () => {
    mockFindUnique.mockResolvedValueOnce(sampleEvent);
    const res = await PATCH(makeRequest({}), makeContext('evt-1'));
    expect(res.status).toBe(422);
  });

  it('marks event as PROCESSED and sets processedAt', async () => {
    const processedAt = new Date('2026-04-09T12:00:00.000Z');
    mockFindUnique.mockResolvedValueOnce(sampleEvent);
    mockUpdate.mockResolvedValueOnce({ id: 'evt-1', status: 'PROCESSED', processedAt });

    const res = await PATCH(makeRequest({ status: 'PROCESSED' }), makeContext('evt-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PROCESSED');
    expect(body.data.id).toBe('evt-1');
  });

  it('treats malformed JSON body as empty and returns 422 for missing status', async () => {
    mockFindUnique.mockResolvedValueOnce(sampleEvent);
    // Send a non-JSON body so request.json() rejects and .catch(() => ({})) fires,
    // producing an empty body that fails the status schema.
    const req = new NextRequest(new URL('http://localhost:3000/api/notifications/evt-1'), {
      method: 'PATCH',
      body: 'not-valid-json',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await PATCH(req, makeContext('evt-1'));
    expect(res.status).toBe(422);
  });

  it('calls prisma.notificationEvent.update with correct args', async () => {
    mockFindUnique.mockResolvedValueOnce(sampleEvent);
    mockUpdate.mockResolvedValueOnce({ id: 'evt-1', status: 'PROCESSED', processedAt: new Date() });

    await PATCH(makeRequest({ status: 'PROCESSED' }), makeContext('evt-1'));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: expect.objectContaining({ status: 'PROCESSED', processedAt: expect.any(Date) }),
      })
    );
  });
});
