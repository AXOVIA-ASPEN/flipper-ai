/**
 * Tests for Firebase client configuration initialization
 */

const mockInitializeApp = jest.fn().mockReturnValue({ name: '[DEFAULT]' });
const mockGetApps = jest.fn().mockReturnValue([]);
const mockGetApp = jest.fn().mockReturnValue({ name: '[DEFAULT]' });

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
  getApp: mockGetApp,
}));

describe('Firebase Client Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockInitializeApp.mockClear();
    mockGetApps.mockClear();
    mockGetApp.mockClear();
    mockGetApps.mockReturnValue([]);
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('initializes Firebase app with config from env vars', async () => {
    const { firebaseApp } = await import('@/lib/firebase/config');

    expect(mockInitializeApp).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-project',
    });
    expect(firebaseApp).toBeDefined();
  });

  it('returns existing app if already initialized', async () => {
    const existingApp = { name: '[DEFAULT]' };
    mockGetApps.mockReturnValue([existingApp]);
    mockGetApp.mockReturnValue(existingApp);

    const { firebaseApp } = await import('@/lib/firebase/config');

    expect(mockGetApp).toHaveBeenCalled();
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(firebaseApp).toBe(existingApp);
  });
});
