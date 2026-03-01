import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';

// Mock Firebase admin auth
const mockVerifyIdToken = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  },
}));

// Mock prisma
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

// Mock email service
const mockSendWelcome = jest.fn();
jest.mock('@/lib/email-service', () => ({
  emailService: {
    sendWelcome: (...args: unknown[]) => mockSendWelcome(...args),
  },
}));

// Mock error-tracker and metrics
const mockCaptureError = jest.fn();
const mockMetricsIncrement = jest.fn();
jest.mock('@/lib/error-tracker', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));
jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: (...args: unknown[]) => mockMetricsIncrement(...args),
  },
}));

const DECODED_TOKEN = {
  uid: 'firebase-uid-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: null,
};

function createRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Defaults: verifyIdToken resolves with decoded token
    mockVerifyIdToken.mockResolvedValue(DECODED_TOKEN);
    // Defaults: upsert resolves with a user
    mockUserUpsert.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
    });
    // Defaults: no existing settings (new user)
    mockUserSettingsFindUnique.mockResolvedValue(null);
    // Defaults: settings creation succeeds
    mockUserSettingsCreate.mockResolvedValue({
      id: 'settings-1',
      userId: 'user-1',
      llmModel: 'gpt-4o-mini',
      discountThreshold: 50,
      autoAnalyze: true,
    });
    // Defaults: sendWelcome succeeds
    mockSendWelcome.mockResolvedValue(undefined);
  });

  it('returns 422 when idToken is missing', async () => {
    const res = await POST(createRequest({}));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when idToken is not a string', async () => {
    const res = await POST(createRequest({ idToken: 12345 }));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('successfully creates user with valid idToken', async () => {
    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-firebase-token');
    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: 'firebase-uid-123' },
        create: expect.objectContaining({
          firebaseUid: 'firebase-uid-123',
          email: 'test@example.com',
        }),
      })
    );
    expect(mockMetricsIncrement).toHaveBeenCalledWith('registration_attempts');
    expect(mockMetricsIncrement).toHaveBeenCalledWith('registration_success');
  });

  it('creates UserSettings for new user', async () => {
    mockUserSettingsFindUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));

    expect(res.status).toBe(200);
    expect(mockUserSettingsFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mockUserSettingsCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
      },
    });
  });

  it('skips UserSettings creation when they already exist', async () => {
    mockUserSettingsFindUnique.mockResolvedValue({
      id: 'settings-existing',
      userId: 'user-1',
      llmModel: 'gpt-4o-mini',
      discountThreshold: 50,
      autoAnalyze: true,
    });

    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));

    expect(res.status).toBe(200);
    expect(mockUserSettingsFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(mockUserSettingsCreate).not.toHaveBeenCalled();
  });

  it('updates existing user on upsert (re-registration)', async () => {
    mockUserUpsert.mockResolvedValue({
      id: 'user-existing',
      email: 'test@example.com',
      name: 'Updated Name',
      createdAt: new Date(),
    });

    const res = await POST(
      createRequest({ idToken: 'valid-firebase-token', name: 'Updated Name' })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.user.name).toBe('Updated Name');

    expect(mockUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: 'firebase-uid-123' },
        update: expect.objectContaining({
          name: 'Updated Name',
        }),
      })
    );
  });

  it('sends welcome email (non-blocking)', async () => {
    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));

    expect(res.status).toBe(200);
    expect(mockSendWelcome).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'test@example.com',
    });
  });

  it('still succeeds when welcome email fails', async () => {
    mockSendWelcome.mockRejectedValue(new Error('SMTP connection failed'));

    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));
    const data = await res.json();

    // Registration should still succeed -- email failure is non-blocking
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Give the non-blocking .catch() a tick to execute
    await new Promise((r) => setImmediate(r));
    expect(mockCaptureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        route: '/api/auth/register',
        action: 'send_welcome_email',
      })
    );
  });

  it('returns 500 on unexpected error (DB failure)', async () => {
    mockUserUpsert.mockRejectedValue(new Error('DB connection failed'));

    const res = await POST(createRequest({ idToken: 'valid-firebase-token' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(mockMetricsIncrement).toHaveBeenCalledWith('registration_failures');
    expect(mockCaptureError).toHaveBeenCalled();
  });

  it('returns 500 when adminAuth.verifyIdToken fails (invalid token)', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));

    const res = await POST(createRequest({ idToken: 'expired-token' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(mockMetricsIncrement).toHaveBeenCalledWith('registration_failures');
    expect(mockCaptureError).toHaveBeenCalled();
  });
});
