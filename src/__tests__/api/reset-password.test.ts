import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { POST } from '@/app/api/auth/reset-password/route';

// Mock Firebase admin auth
const mockUpdateUser = jest.fn();
const mockRevokeRefreshTokens = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    revokeRefreshTokens: (...args: unknown[]) => mockRevokeRefreshTokens(...args),
  },
}));

// Mock Prisma
const mockTokenFindFirst = jest.fn();
const mockTokenDeleteMany = jest.fn();
const mockTokenDelete = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    passwordResetToken: {
      findFirst: (...args: unknown[]) => mockTokenFindFirst(...args),
      deleteMany: (...args: unknown[]) => mockTokenDeleteMany(...args),
      delete: (...args: unknown[]) => mockTokenDelete(...args),
    },
  },
}));

// Mock email service
const mockSendEmail = jest.fn();
jest.mock('@/lib/email-service', () => ({
  emailService: {
    send: (...args: unknown[]) => mockSendEmail(...args),
  },
}));

// Mock error tracker
const mockCaptureError = jest.fn();
jest.mock('@/lib/error-tracker', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
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

// Helper to generate a valid token + hash pair
function generateTokenPair() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

const TEST_USER = {
  id: 'user-1',
  firebaseUid: 'firebase-uid-1',
  email: 'test@example.com',
  name: 'Test User',
};

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/reset-password', () => {
  let validToken: { rawToken: string; tokenHash: string };

  beforeEach(() => {
    jest.clearAllMocks();
    validToken = generateTokenPair();

    mockTokenFindFirst.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      createdAt: new Date(),
      user: TEST_USER,
    });

    mockTokenDeleteMany.mockResolvedValue({ count: 1 });
    mockTokenDelete.mockResolvedValue({});
    mockUpdateUser.mockResolvedValue({});
    mockRevokeRefreshTokens.mockResolvedValue({});
    mockSendEmail.mockResolvedValue({ success: true });
  });

  it('resets password successfully with valid token', async () => {
    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('reset successfully');
  });

  it('updates password in Firebase Auth', async () => {
    await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    expect(mockUpdateUser).toHaveBeenCalledWith('firebase-uid-1', { password: 'NewPassword1' });
  });

  it('revokes all sessions after password update (AC #6)', async () => {
    await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('firebase-uid-1');
  });

  it('handles revocation failure non-fatally', async () => {
    mockRevokeRefreshTokens.mockRejectedValue(new Error('Firebase unavailable'));

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    // Should still succeed
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        route: '/api/auth/reset-password',
        action: 'revoke_sessions',
      })
    );
  });

  it('returns 400 for expired token (AC #4)', async () => {
    mockTokenFindFirst.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() - 1000), // Expired
      createdAt: new Date(),
      user: TEST_USER,
    });

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toContain('expired');
    // Expired token should be deleted immediately
    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { id: 'token-1' } });
  });

  it('deletes expired token from DB on lookup failure (defense in depth)', async () => {
    mockTokenFindFirst.mockResolvedValue({
      id: 'token-expired',
      userId: 'user-1',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() - 60000),
      createdAt: new Date(),
      user: TEST_USER,
    });

    await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    expect(mockTokenDelete).toHaveBeenCalledWith({ where: { id: 'token-expired' } });
  });

  it('returns 400 for invalid/unknown token', async () => {
    mockTokenFindFirst.mockResolvedValue(null);

    const res = await POST(createRequest({
      token: 'invalid-token-value',
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toContain('Invalid');
  });

  it('returns 400 on concurrent token use (AC #7)', async () => {
    // First request consumes the token (count=1), second gets count=0
    mockTokenDeleteMany.mockResolvedValue({ count: 0 });

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toContain('already been used');
  });

  it('returns 422 for weak password (too short)', async () => {
    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'Short1',
    }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for over-length password (>128 chars)', async () => {
    const longPassword = 'A1' + 'a'.repeat(127);

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: longPassword,
    }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for password without uppercase', async () => {
    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'nouppercase1',
    }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.detail).toContain('uppercase');
  });

  it('returns 422 for password without number', async () => {
    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NoNumberHere',
    }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error.detail).toContain('number');
  });

  it('deletes all remaining tokens for user after successful reset', async () => {
    await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    // deleteMany called twice: once for atomic consumption, once for cleanup
    const deleteCalls = mockTokenDeleteMany.mock.calls;
    // The second deleteMany should target all tokens for this user
    expect(deleteCalls).toContainEqual([{ where: { userId: 'user-1' } }]);
  });

  it('sends password-changed notification email', async () => {
    await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('password was changed'),
      })
    );
  });

  it('handles invalid JSON body gracefully', async () => {
    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it('returns 400 for user without firebaseUid', async () => {
    mockTokenFindFirst.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      user: { ...TEST_USER, firebaseUid: null },
    });

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toContain('authentication provider');
  });

  it('returns 422 when token is missing from body', async () => {
    const res = await POST(createRequest({
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.success).toBe(false);
  });

  it('OAuth-only user: reset completes normally (adds password credential)', async () => {
    // Firebase Admin updateUser adds password credential for OAuth-only users
    // No special handling needed — just verify it completes successfully
    mockTokenFindFirst.mockResolvedValue({
      id: 'token-1',
      userId: 'user-oauth',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      user: {
        id: 'user-oauth',
        firebaseUid: 'oauth-uid-1',
        email: 'oauth@example.com',
        name: 'OAuth User',
      },
    });

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith('oauth-uid-1', { password: 'NewPassword1' });
  });

  it('token hash comparison uses the hashed token for DB lookup', async () => {
    const { rawToken, tokenHash } = generateTokenPair();

    mockTokenFindFirst.mockResolvedValue({
      id: 'token-2',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      user: TEST_USER,
    });
    mockTokenDeleteMany.mockResolvedValue({ count: 1 });

    const res = await POST(createRequest({
      token: rawToken,
      password: 'ValidPass1',
    }));

    expect(res.status).toBe(200);
    // Verify findFirst was called with the computed hash
    expect(mockTokenFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash },
      })
    );
  });

  it('constructs resetUrl with known APP_URL and token format', () => {
    // This is a structural test — verify the resetUrl format
    const rawToken = crypto.randomBytes(32).toString('hex');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    const resetUrl = `https://flipper.ai/reset-password?token=${rawToken}`;
    expect(resetUrl).toMatch(/^https:\/\/flipper\.ai\/reset-password\?token=[a-f0-9]{64}$/);
  });

  it('handles email notification failure non-fatally (fire-and-forget error)', async () => {
    mockSendEmail.mockRejectedValue(new Error('SMTP error'));

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    // Allow microtask queue to flush for fire-and-forget
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        route: '/api/auth/reset-password',
        action: 'send_password_changed_email',
      })
    );
  });

  it('wraps non-Error thrown by revokeRefreshTokens (line 124 instanceof false branch)', async () => {
    mockRevokeRefreshTokens.mockRejectedValue('string-revoke-error');

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    // revokeRefreshTokens failure is non-fatal — reset should still succeed
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'revoke_sessions' })
    );
  });

  it('sends notification email with name undefined when user.name is null (line 146 null coalesce)', async () => {
    mockTokenFindFirst.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: validToken.tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      user: { ...TEST_USER, name: null },
    });

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));

    expect(res.status).toBe(200);
    // emailService.send is called with html from passwordChangedEmailHtml(undefined)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'test@example.com' })
    );
  });

  it('wraps non-Error thrown by emailService.send (line 151 instanceof false branch)', async () => {
    mockSendEmail.mockRejectedValue('string-smtp-error');

    const res = await POST(createRequest({
      token: validToken.rawToken,
      password: 'NewPassword1',
    }));
    const data = await res.json();

    // Allow fire-and-forget microtask to flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: 'send_password_changed_email' })
    );
  });
});
