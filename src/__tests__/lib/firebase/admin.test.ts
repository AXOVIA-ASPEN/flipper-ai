/**
 * Tests for Firebase Admin SDK initialization
 * Verifies singleton pattern, ADC vs explicit credentials branching.
 */

const mockInitializeApp = jest.fn().mockReturnValue({ name: '[DEFAULT]' });
const mockGetApps = jest.fn().mockReturnValue([]);
const mockCert = jest.fn().mockReturnValue({ type: 'service_account' });
const mockGetAuth = jest.fn().mockReturnValue({ verifyIdToken: jest.fn() });
const mockGetStorage = jest.fn().mockReturnValue({ bucket: jest.fn() });

jest.mock('firebase-admin/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  cert: mockCert,
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: mockGetAuth,
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: mockGetStorage,
}));

describe('Firebase Admin SDK Initialization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockInitializeApp.mockClear();
    mockGetApps.mockClear().mockReturnValue([]);
    mockCert.mockClear();
    mockGetAuth.mockClear();
    mockGetStorage.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses explicit credentials when FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set', async () => {
    process.env.FIREBASE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIE\\n-----END PRIVATE KEY-----';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-bucket.firebasestorage.app';

    const mod = await import('@/lib/firebase/admin');

    expect(mockCert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'axovia-flipper',
        clientEmail: 'test@project.iam.gserviceaccount.com',
      })
    );
    expect(mockInitializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        storageBucket: 'test-bucket.firebasestorage.app',
      })
    );
    expect(mod.adminAuth).toBeDefined();
    expect(mod.adminStorage).toBeDefined();
  });

  it('uses ADC fallback when no explicit credentials', async () => {
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-bucket.firebasestorage.app';

    await import('@/lib/firebase/admin');

    expect(mockCert).not.toHaveBeenCalled();
    expect(mockInitializeApp).toHaveBeenCalledWith({
      projectId: 'axovia-flipper',
      storageBucket: 'test-bucket.firebasestorage.app',
    });
  });

  it('returns existing app when already initialized (singleton)', async () => {
    const existingApp = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([existingApp]);

    await import('@/lib/firebase/admin');

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it('exports adminAuth and adminStorage', async () => {
    const mod = await import('@/lib/firebase/admin');
    expect(mod.adminAuth).toBeDefined();
    expect(mod.adminStorage).toBeDefined();
    expect(mod.default).toBeDefined();
  });

  it('handles newline escaping in FIREBASE_PRIVATE_KEY', async () => {
    process.env.FIREBASE_CLIENT_EMAIL = 'test@project.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = 'line1\\nline2\\nline3';

    await import('@/lib/firebase/admin');

    expect(mockCert).toHaveBeenCalledWith(
      expect.objectContaining({
        privateKey: 'line1\nline2\nline3',
      })
    );
  });
});
