/**
 * @file src/__tests__/api/phone-send-code.test.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for POST /api/user/phone/send-code (Story 11.2, AC-1).
 *
 * @description
 * Covers:
 *   - 401 when unauthenticated.
 *   - 422 ValidationError when phoneNumber missing / wrong format.
 *   - 200 + smsService.send() called with verification code on valid request.
 *   - Rate limit (429) on re-send within 60 seconds.
 *   - OTP is never echoed back in the response body.
 *   - UserSettings row is updated with hashed OTP + expiry + unverified state.
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
    userSettings: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/sms-service', () => ({
  smsService: {
    send: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';
import { smsService } from '@/lib/sms-service';
import { POST } from '@/app/api/user/phone/send-code/route';

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSmsSend = smsService.send as jest.MockedFunction<typeof smsService.send>;

const USER_ID = 'user-abc';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/user/phone/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/user/phone/send-code', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSmsSend.mockResolvedValue({ success: true, messageId: 'sms-1' });
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationSentAt: null,
    });
    (mockPrisma.userSettings.update as jest.Mock).mockResolvedValue({ userId: USER_ID });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUserId.mockResolvedValue(null);

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('returns 422 when phoneNumber is missing', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('returns 422 when phoneNumber is not in E.164 format', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({ phoneNumber: '555-1234' }));

    expect(res.status).toBe(422);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('returns 422 when phoneNumber is not a string', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({ phoneNumber: 12025551234 }));

    expect(res.status).toBe(422);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('returns 422 when UserSettings row does not exist', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(422);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('sends OTP and returns success for a valid E.164 number', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // UserSettings must be updated with hashed OTP + expiry + unverified
    expect(mockPrisma.userSettings.update).toHaveBeenCalledTimes(1);
    const updateArgs = (mockPrisma.userSettings.update as jest.Mock).mock.calls[0][0];
    expect(updateArgs.where).toEqual({ userId: USER_ID });
    expect(updateArgs.data.phoneNumber).toBe('+12025551234');
    expect(updateArgs.data.phoneVerified).toBe(false);
    expect(typeof updateArgs.data.phoneVerificationCode).toBe('string');
    expect(updateArgs.data.phoneVerificationCode.length).toBeGreaterThan(20); // bcrypt hash
    expect(updateArgs.data.phoneVerificationExpiry).toBeInstanceOf(Date);
    expect(updateArgs.data.phoneVerificationSentAt).toBeInstanceOf(Date);

    // SMS must be dispatched with the plaintext code; the plaintext code
    // should be a 6-digit string, but it should NOT appear in the HTTP response.
    expect(mockSmsSend).toHaveBeenCalledTimes(1);
    const [to, smsBody] = mockSmsSend.mock.calls[0];
    expect(to).toBe('+12025551234');
    expect(smsBody).toMatch(/\d{6}/);

    // Response body must NOT contain the plaintext code
    const match = smsBody.match(/\d{6}/);
    expect(match).not.toBeNull();
    const plaintextCode = match![0];
    expect(JSON.stringify(body)).not.toContain(plaintextCode);
  });

  it('returns 429 when re-sending within the cooldown window', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    // sentAt 30 seconds ago → within the 60-second cooldown
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationSentAt: new Date(Date.now() - 30 * 1000),
    });

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(429);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('allows re-send once the cooldown has elapsed', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    // sentAt 90 seconds ago → cooldown passed
    (mockPrisma.userSettings.findUnique as jest.Mock).mockResolvedValue({
      phoneVerificationSentAt: new Date(Date.now() - 90 * 1000),
    });

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(200);
    expect(mockSmsSend).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the handler throws an unexpected error', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    (mockPrisma.userSettings.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    expect(res.status).toBe(500);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('treats malformed JSON body as empty object and returns 422 for missing phoneNumber', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    // Send a request with a non-JSON body so request.json() rejects and the
    // .catch(() => ({})) fallback is exercised, producing an empty body object.
    const req = new NextRequest('http://localhost/api/user/phone/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not-json',
    });

    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(mockSmsSend).not.toHaveBeenCalled();
  });

  it('returns 503 when smsService delivery fails (OTP stored but SMS not sent)', async () => {
    mockGetUserId.mockResolvedValue(USER_ID);
    mockSmsSend.mockResolvedValueOnce({ success: false, error: 'twilio down' });

    const res = await POST(makeRequest({ phoneNumber: '+12025551234' }));

    // OTP was stored so client can retry, but route returns 503 so the UI
    // can show "Unable to send SMS — please try again" rather than "Code sent!"
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    // OTP must NOT be in the response
    expect(JSON.stringify(body)).not.toMatch(/\d{6}/);
  });
});
