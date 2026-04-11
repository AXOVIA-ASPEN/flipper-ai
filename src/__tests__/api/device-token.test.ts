/**
 * @file src/__tests__/api/device-token.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for POST/DELETE /api/user/device-token (Story 11.1).
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    deviceToken: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';
import { POST, DELETE } from '@/app/api/user/device-token/route';

const mockGetCurrentUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const USER_ID = 'user-abc';
const TOKEN = 'fcm-token-xyz-12345';

function makeRequest(method: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/user/device-token', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// POST tests
// ---------------------------------------------------------------------------

describe('POST /api/user/device-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers token for authenticated user', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);
    (mockPrisma.deviceToken.upsert as jest.Mock).mockResolvedValue({ id: 'dt-1', token: TOKEN });

    const req = makeRequest('POST', { token: TOKEN, userAgent: 'Mozilla/5.0' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('dt-1');
    expect(mockPrisma.deviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_token: { userId: USER_ID, token: TOKEN } },
        create: expect.objectContaining({ userId: USER_ID, token: TOKEN }),
      })
    );
  });

  it('registers token without optional userAgent', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);
    (mockPrisma.deviceToken.upsert as jest.Mock).mockResolvedValue({ id: 'dt-2', token: TOKEN });

    const req = makeRequest('POST', { token: TOKEN });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockPrisma.deviceToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userAgent: null }),
      })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const req = makeRequest('POST', { token: TOKEN });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 422 when token is missing', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);

    const req = makeRequest('POST', {});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
  });

  it('returns 422 when token is empty string', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);

    const req = makeRequest('POST', { token: '' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DELETE tests
// ---------------------------------------------------------------------------

describe('DELETE /api/user/device-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes token for authenticated user', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);
    (mockPrisma.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = makeRequest('DELETE', { token: TOKEN });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, token: TOKEN },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const req = makeRequest('DELETE', { token: TOKEN });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 422 when token is missing', async () => {
    mockGetCurrentUserId.mockResolvedValue(USER_ID);

    const req = makeRequest('DELETE', {});
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.success).toBe(false);
  });
});
