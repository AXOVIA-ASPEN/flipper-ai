import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST } from '@/app/api/auth/forgot-password/route';

// Mock Firebase admin auth
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
    updateUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  },
}));

// Mock Prisma
const mockUserFindUnique = jest.fn();
const mockTokenCount = jest.fn();
const mockTokenDeleteMany = jest.fn();
const mockTokenCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    passwordResetToken: {
      count: (...args: unknown[]) => mockTokenCount(...args),
      deleteMany: (...args: unknown[]) => mockTokenDeleteMany(...args),
      create: (...args: unknown[]) => mockTokenCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Mock email service
const mockSendPasswordReset = jest.fn();
jest.mock('@/lib/email-service', () => ({
  emailService: {
    sendPasswordReset: (...args: unknown[]) => mockSendPasswordReset(...args),
  },
}));

// Mock error tracker
const mockCaptureError = jest.fn();
jest.mock('@/lib/error-tracker', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

// Mock rate limiter
const mockRateLimit = jest.fn();
jest.mock('@/lib/rate-limiter', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const TEST_USER = {
  id: 'user-1',
  firebaseUid: 'firebase-uid-1',
  email: 'test@example.com',
  name: 'Test User',
};

function createRequest(body: object, ip = '127.0.0.1') {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockReturnValue({ allowed: true, remaining: 4, limit: 5, resetAt: Date.now() + 900000 });
    mockUserFindUnique.mockResolvedValue(TEST_USER);
    mockTokenCount.mockResolvedValue(0);
    mockTokenCreate.mockResolvedValue({ id: 'token-1', userId: TEST_USER.id });
    mockTokenDeleteMany.mockResolvedValue({ count: 0 });
    mockSendPasswordReset.mockResolvedValue({ success: true, messageId: 'msg-1' });
  });

  it('returns success for valid email with existing user', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('If an account exists');
  });

  it('returns same success response for unknown email (AC #5)', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ email: 'unknown@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('If an account exists');
    // Should NOT have called $transaction (no token created)
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('normalizes email to lowercase and trims', async () => {
    await POST(createRequest({ email: '  TEST@Example.COM  ' }));

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('generates a token and stores its SHA-256 hash', async () => {
    await POST(createRequest({ email: 'test@example.com' }));

    expect(mockTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER.id,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      })
    );
  });

  it('constructs resetUrl from NEXT_PUBLIC_APP_URL env var', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://flipper.ai';

    await POST(createRequest({ email: 'test@example.com' }));

    expect(mockSendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        resetUrl: expect.stringMatching(/^https:\/\/flipper\.ai\/reset-password\?token=[a-f0-9]{64}$/),
      })
    );

    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it('sends email with correct parameters', async () => {
    await POST(createRequest({ email: 'test@example.com' }));

    expect(mockSendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test User',
        email: 'test@example.com',
        expiresInMinutes: 60,
      })
    );
  });

  it('returns 200 even when email send fails but logs error', async () => {
    mockSendPasswordReset.mockResolvedValue({ success: false, error: 'SMTP failure' });

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        route: '/api/auth/forgot-password',
        action: 'send_reset_email',
      })
    );
  });

  it('returns 429 on DB-backed rate limit (3 per email per 15 min)', async () => {
    mockTokenCount.mockResolvedValue(3);

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('RATE_LIMITED');
  });

  it('returns 429 on IP-based rate limit', async () => {
    mockRateLimit.mockReturnValue({ allowed: false, remaining: 0, limit: 5, resetAt: Date.now() + 60000 });

    const res = await POST(createRequest({ email: 'test@example.com' }, '10.0.0.99'));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('RATE_LIMITED');
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('returns success for invalid email format (no enumeration)', async () => {
    const res = await POST(createRequest({ email: 'not-an-email' }));
    const data = await res.json();

    // Invalid email format still returns success to prevent enumeration
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('performs opportunistic expired token cleanup', async () => {
    // The cleanup fires as fire-and-forget, just verify no crash
    mockTokenDeleteMany.mockResolvedValue({ count: 5 });

    const res = await POST(createRequest({ email: 'test@example.com' }));
    expect(res.status).toBe(200);
  });

  it('handles invalid JSON body gracefully', async () => {
    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: 'not-json',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it('uses token with 1-hour expiry', async () => {
    const beforeCall = Date.now();

    await POST(createRequest({ email: 'test@example.com' }));

    expect(mockTokenCreate).toHaveBeenCalled();
    const callArgs = mockTokenCreate.mock.calls[0][0] as { data: { expiresAt: Date } };
    const expiresAt = callArgs.data.expiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + 59 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 61 * 60 * 1000);
  });

  it('creates token without deleting existing ones (enables DB rate limit accumulation)', async () => {
    await POST(createRequest({ email: 'test@example.com' }));

    // Token should be created directly — old tokens are NOT deleted on each request
    // so the DB-backed count can accumulate and trigger the rate limit
    expect(mockTokenCreate).toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('handles cleanup failure gracefully (fire-and-forget error does not affect response)', async () => {
    mockTokenDeleteMany.mockRejectedValue(new Error('DB timeout'));

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    // Allow microtask queue to flush for fire-and-forget
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('uses 127.0.0.1 when x-forwarded-for header is absent (line 37 fallback)', async () => {
    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
      // Intentionally no x-forwarded-for header
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // rateLimit should have been called (IP would be '127.0.0.1')
    expect(mockRateLimit).toHaveBeenCalledWith('127.0.0.1', '/api/auth/forgot-password');
  });

  it('sends email with name undefined when user has no name (line 108 null coalesce)', async () => {
    mockUserFindUnique.mockResolvedValue({ ...TEST_USER, name: null });

    await POST(createRequest({ email: 'test@example.com' }));

    expect(mockSendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ name: undefined })
    );
  });

  it('logs warning when cleanup deletion fails with non-Error (line 127 logger.warn)', async () => {
    // Throw a non-Error to cover the `String(err)` branch inside the catch
    mockTokenDeleteMany.mockRejectedValue('string-rejection');

    await POST(createRequest({ email: 'test@example.com' }));
    // Flush the fire-and-forget microtask
    await new Promise((resolve) => setImmediate(resolve));

    const { logger } = await import('@/lib/logger');
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to clean up expired reset tokens',
      expect.objectContaining({ error: 'string-rejection' })
    );
  });
});
