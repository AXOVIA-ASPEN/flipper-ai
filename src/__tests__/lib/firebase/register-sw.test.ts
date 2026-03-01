/**
 * Tests for Firebase Cloud Messaging — Service Worker Registration
 *
 * Mocks navigator.serviceWorker to test registerFCMServiceWorker().
 */

describe('FCM Service Worker Registration', () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up browser environment
    Object.defineProperty(global, 'window', { value: {}, writable: true, configurable: true });
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: jest.fn().mockResolvedValue({
            scope: '/',
            active: null,
            installing: null,
            waiting: null,
          }),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    Object.defineProperty(global, 'navigator', { value: originalNavigator, writable: true, configurable: true });
  });

  it('registers the service worker at /firebase-messaging-sw.js', async () => {
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    const registration = await registerFCMServiceWorker();
    expect(registration).toBeDefined();
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );
  });

  it('returns the ServiceWorkerRegistration on success', async () => {
    const mockRegistration = { scope: '/', active: null };
    (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(mockRegistration);
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    const result = await registerFCMServiceWorker();
    expect(result).toBe(mockRegistration);
  });

  it('logs success message on registration', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    await registerFCMServiceWorker();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('FCM service worker registered'),
      expect.any(String)
    );
    consoleSpy.mockRestore();
  });

  it('returns null on server (no window)', async () => {
    Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    const result = await registerFCMServiceWorker();
    expect(result).toBeNull();
  });

  it('returns null when serviceWorker is not in navigator', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    const result = await registerFCMServiceWorker();
    expect(result).toBeNull();
  });

  it('returns null and warns on registration failure', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(
      new Error('SecurityError: Failed to register')
    );
    const { registerFCMServiceWorker } = await import('@/lib/firebase/register-sw');
    const result = await registerFCMServiceWorker();
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('FCM service worker registration failed'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  describe('service worker file validation', () => {
    it('firebase-messaging-sw.js exists and contains required Firebase SDK setup', () => {
      const fs = require('fs');
      const path = require('path');
      const swPath = path.resolve(__dirname, '../../../../public/firebase-messaging-sw.js');
      const content = fs.readFileSync(swPath, 'utf-8');

      expect(content).toContain('importScripts');
      expect(content).toContain('firebase.initializeApp');
      expect(content).toContain('messaging.onBackgroundMessage');
    });

    it('service worker uses Firebase version matching installed package', () => {
      const fs = require('fs');
      const path = require('path');

      const pkgPath = path.resolve(__dirname, '../../../../node_modules/firebase/package.json');
      const installedVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;

      const swPath = path.resolve(__dirname, '../../../../public/firebase-messaging-sw.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      expect(swContent).toContain(`firebasejs/${installedVersion}/firebase-app-compat.js`);
      expect(swContent).toContain(`firebasejs/${installedVersion}/firebase-messaging-compat.js`);
    });
  });
});
