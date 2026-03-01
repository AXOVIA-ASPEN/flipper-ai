/**
 * Tests for POST /api/auth/session
 * Exchanges Firebase ID token for HttpOnly session cookie, upserts Prisma user.
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

// Mock Firebase admin auth
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

// Mock Firebase session helpers
const mockCreateSessionCookie = jest.fn();
jest.mock('@/lib/firebase/session', () => ({
  createSessionCookie: (...args: unknown[]) => mockCreateSessionCookie(...args),
  SESSION_COOKIE_NAME: '__session',
  SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 5, // 5 days
}));

// Mock Prisma
const mockUserUpsert = jest.fn();
const mockUserSettingsFindUnique = jest.fn();
const mockUserSettingsCreate = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
    },
    userSettings: {
      findUnique: (...args: unknown[]) => mockUserSettingsFindUnique(...args),
      create: (...args: unknown[]) => mockUserSettingsCreate(...args),
    },
  },
}));

import { POST } from '@/app/api/auth/session/route';

const DECODED_TOKEN = {
  uid: 'firebase-uid-abc',
  email: 'session@example.com',
  name: 'Session User',
  picture: 'https://example.com/photo.jpg',
};

const PRISMA_USER = {
  id: 'prisma-user-1',
  email: 'session@example.com',
  name: 'Session User',
  firebaseUid: 'firebase-uid-abc',
};

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/session', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue(DECODED_TOKEN);
    mockUserUpsert.mockResolvedValue(PRISMA_USER);
    mockUserSettingsFindUnique.mockResolvedValue(null);
    mockUserSettingsCreate.mockResolvedValue({});
    mockCreateSessionCookie.mockResolvedValue('mock-session-cookie-value');
  });

  it('returns 400 when idToken is missing', async () => {
    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.detail).toBe('ID token is required');
  });

  it('returns 400 when idToken is not a string', async () => {
    const res = await POST(createRequest({ idToken: 12345 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('verifies the ID token with Firebase Admin SDK', async () => {
    const res = await POST(createRequest({ idToken: 'valid-token' }));

    expect(res.status).toBe(200);
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
  });

  it('upserts Prisma user with Firebase UID', async () => {
    await POST(createRequest({ idToken: 'valid-token' }));

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'firebase-uid-abc' },
      create: {
        firebaseUid: 'firebase-uid-abc',
        email: 'session@example.com',
        name: 'Session User',
        image: 'https://example.com/photo.jpg',
      },
      update: {
        email: 'session@example.com',
        name: 'Session User',
        image: 'https://example.com/photo.jpg',
      },
    });
  });

  it('creates UserSettings for new users', async () => {
    mockUserSettingsFindUnique.mockResolvedValue(null);

    await POST(createRequest({ idToken: 'valid-token' }));

    expect(mockUserSettingsFindUnique).toHaveBeenCalledWith({
      where: { userId: 'prisma-user-1' },
    });
    expect(mockUserSettingsCreate).toHaveBeenCalledWith({
      data: {
        userId: 'prisma-user-1',
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
      },
    });
  });

  it('skips UserSettings creation when they already exist', async () => {
    mockUserSettingsFindUnique.mockResolvedValue({ id: 'existing-settings' });

    await POST(createRequest({ idToken: 'valid-token' }));

    expect(mockUserSettingsCreate).not.toHaveBeenCalled();
  });

  it('creates session cookie from the ID token', async () => {
    await POST(createRequest({ idToken: 'valid-token' }));

    expect(mockCreateSessionCookie).toHaveBeenCalledWith('valid-token');
  });

  it('sets HttpOnly session cookie in response', async () => {
    const res = await POST(createRequest({ idToken: 'valid-token' }));

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('__session=mock-session-cookie-value');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie?.toLowerCase()).toContain('samesite=strict');
    expect(setCookie).toContain('Path=/');
  });

  it('returns success with user data', async () => {
    const res = await POST(createRequest({ idToken: 'valid-token' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      userId: 'prisma-user-1',
      email: 'session@example.com',
      name: 'Session User',
    });
  });

  it('handles missing email in Firebase token by using fallback', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'uid-no-email',
      email: undefined,
      name: undefined,
      picture: undefined,
    });
    mockUserUpsert.mockResolvedValue({
      id: 'user-no-email',
      email: 'uid-no-email@firebase.user',
      name: null,
    });

    const res = await POST(createRequest({ idToken: 'valid-token' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: 'uid-no-email@firebase.user',
          name: null,
          image: null,
        }),
      })
    );
    expect(data.data.email).toBe('uid-no-email@firebase.user');
  });

  it('returns 500 when verifyIdToken fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

    const res = await POST(createRequest({ idToken: 'expired-token' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('returns 500 when createSessionCookie fails', async () => {
    mockCreateSessionCookie.mockRejectedValue(new Error('Cookie creation failed'));

    const res = await POST(createRequest({ idToken: 'valid-token' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('returns 500 when database upsert fails', async () => {
    mockUserUpsert.mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(createRequest({ idToken: 'valid-token' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
