/**
 * @file src/__tests__/api/phone-verify.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for POST /api/user/phone/verify (Story 11.2, AC-1).
 *
 * @description
 * Covers:
 *   - 401 when unauthenticated.
 *   - 422 on malformed code input.
 *   - 422 when no pending OTP exists for the user.
 *   - 422 when the OTP has expired.
 *   - 422 when the code does not match the stored bcrypt hash.
 *   - 200 + phoneVerified=true + UserSettings updated on success.
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    userSettings: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';
import { POST } from '@/app/api/user/phone/verify/route';

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const USER_ID = 'user-xyz';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/user/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/user/phone/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.userSettings.update as jest.Mock).mockResolvedValue({ userId: USER_ID });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUserId.mockResolvedValue(null);

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(401);
  });

  it('returns 422 when code is missing', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(422);
  });

  it('returns 422 when code is not a 6-digit string', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({ code: 'abc123' }));

    expect(res.status).toBe(422);
  });

  it('returns 422 when code is numeric but wrong length', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({ code: '12345' }));

    expect(res.status).toBe(422);
  });

  it('returns 422 when no pending OTP exists (null fields)', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationCode: null,
      phoneVerificationExpiry: null,
    });

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(422);
    expect(mockPrisma.userSettings.update).not.toHaveBeenCalled();
  });

  it('returns 422 when UserSettings row does not exist (null settings)', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(422);
    expect(mockPrisma.userSettings.update).not.toHaveBeenCalled();
  });

  it('returns 422 when OTP has expired', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    const hash = await bcrypt.hash('123456', 10);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationCode: hash,
      phoneVerificationExpiry: new Date(Date.now() - 60_000),
    });

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(422);
    expect(mockPrisma.userSettings.update).not.toHaveBeenCalled();
  });

  it('returns 422 and invalidates OTP when code does not match', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    const hash = await bcrypt.hash('654321', 10);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationCode: hash,
      phoneVerificationExpiry: new Date(Date.now() + 5 * 60_000),
    });

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(422);
    // OTP must be cleared immediately on a wrong guess (single-use semantics)
    expect(mockPrisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: { phoneVerificationCode: null, phoneVerificationExpiry: null },
    });
  });

  it('verifies the phone and clears OTP fields on success', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    const hash = await bcrypt.hash('123456', 10);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationCode: hash,
      phoneVerificationExpiry: new Date(Date.now() + 5 * 60_000),
    });

    const res = await POST(makeRequest({ code: '123456' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.phoneVerified).toBe(true);

    expect(mockPrisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
      },
    });
  });
});
