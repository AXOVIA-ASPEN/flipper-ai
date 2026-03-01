/**
 * Tests for Firebase Cloud Messaging — Client-side helpers
 *
 * Mocks firebase/messaging module to test getMessagingInstance,
 * requestNotificationPermission, getFCMToken, and onForegroundMessage.
 */

const mockGetMessaging = jest.fn();
const mockGetToken = jest.fn();
const mockOnMessage = jest.fn();

jest.mock('firebase/messaging', () => ({
  getMessaging: mockGetMessaging,
  getToken: mockGetToken,
  onMessage: mockOnMessage,
}));

jest.mock('@/lib/firebase/config', () => ({
  firebaseApp: { name: '[DEFAULT]' },
}));

describe('Firebase Cloud Messaging — Client-side', () => {
  const originalWindow = global.window;
  const originalNotification = global.Notification;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    // Default: browser environment
    Object.defineProperty(global, 'window', { value: {}, writable: true, configurable: true });
    Object.defineProperty(global, 'Notification', {
      value: { requestPermission: jest.fn().mockResolvedValue('granted') },
      writable: true,
      configurable: true,
    });

    mockGetMessaging.mockReturnValue({ app: { name: '[DEFAULT]' } });
    mockGetToken.mockResolvedValue('mock-fcm-token-123');
    mockOnMessage.mockReturnValue(() => {});
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', { value: originalWindow, writable: true, configurable: true });
    Object.defineProperty(global, 'Notification', { value: originalNotification, writable: true, configurable: true });
    process.env = originalEnv;
  });

  describe('getMessagingInstance', () => {
    it('returns messaging instance in browser', async () => {
      const { getMessagingInstance } = await import('@/lib/firebase/messaging');
      const result = await getMessagingInstance();
      expect(result).toBeDefined();
      expect(mockGetMessaging).toHaveBeenCalled();
    });

    it('returns null on server (no window)', async () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      const { getMessagingInstance } = await import('@/lib/firebase/messaging');
      const result = await getMessagingInstance();
      expect(result).toBeNull();
    });

    it('returns null when firebase/messaging import fails', async () => {
      mockGetMessaging.mockImplementation(() => {
        throw new Error('Module not supported');
      });
      const { getMessagingInstance } = await import('@/lib/firebase/messaging');
      const result = await getMessagingInstance();
      expect(result).toBeNull();
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns true when permission granted', async () => {
      (Notification.requestPermission as jest.Mock).mockResolvedValue('granted');
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('returns false when permission denied', async () => {
      (Notification.requestPermission as jest.Mock).mockResolvedValue('denied');
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false when permission is default', async () => {
      (Notification.requestPermission as jest.Mock).mockResolvedValue('default');
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false on server (no window)', async () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false when Notification API is undefined', async () => {
      Object.defineProperty(global, 'Notification', { value: undefined, writable: true, configurable: true });
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false when requestPermission throws', async () => {
      (Notification.requestPermission as jest.Mock).mockRejectedValue(new Error('Browser error'));
      const { requestNotificationPermission } = await import('@/lib/firebase/messaging');
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe('getFCMToken', () => {
    it('returns token when granted and VAPID key configured', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'BLongBase64VapidKeyStringThatIsAtLeast50CharsLongForValidation123456789012345678';
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      expect(token).toBe('mock-fcm-token-123');
      expect(mockGetToken).toHaveBeenCalledWith(
        expect.anything(),
        { vapidKey: 'BLongBase64VapidKeyStringThatIsAtLeast50CharsLongForValidation123456789012345678' }
      );
    });

    it('returns null when VAPID key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      expect(token).toBeNull();
      expect(mockGetToken).not.toHaveBeenCalled();
    });

    it('returns null on server (no window)', async () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'BLongBase64VapidKeyStringThatIsAtLeast50CharsLongForValidation123456789012345678';
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      expect(token).toBeNull();
    });

    it('returns null when getToken throws', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'BLongBase64VapidKeyStringThatIsAtLeast50CharsLongForValidation123456789012345678';
      mockGetToken.mockRejectedValue(new Error('Token retrieval failed'));
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      expect(token).toBeNull();
    });

    it('returns null when getToken returns empty string', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = 'BLongBase64VapidKeyStringThatIsAtLeast50CharsLongForValidation123456789012345678';
      mockGetToken.mockResolvedValue('');
      const { getFCMToken } = await import('@/lib/firebase/messaging');
      const token = await getFCMToken();
      expect(token).toBeNull();
    });
  });

  describe('onForegroundMessage', () => {
    it('subscribes to foreground messages', async () => {
      const unsubscribe = jest.fn();
      mockOnMessage.mockReturnValue(unsubscribe);
      const callback = jest.fn();
      const { onForegroundMessage } = await import('@/lib/firebase/messaging');
      const unsub = await onForegroundMessage(callback);
      expect(mockOnMessage).toHaveBeenCalledWith(expect.anything(), callback);
      expect(unsub).toBe(unsubscribe);
    });

    it('returns no-op on server (no window)', async () => {
      Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
      const { onForegroundMessage } = await import('@/lib/firebase/messaging');
      const unsub = await onForegroundMessage(jest.fn());
      expect(typeof unsub).toBe('function');
      unsub(); // should not throw
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it('returns no-op when messaging init fails', async () => {
      mockGetMessaging.mockImplementation(() => {
        throw new Error('Not supported');
      });
      const { onForegroundMessage } = await import('@/lib/firebase/messaging');
      const unsub = await onForegroundMessage(jest.fn());
      expect(typeof unsub).toBe('function');
    });
  });

  describe('import validation', () => {
    it('can be dynamically imported without throwing', async () => {
      await expect(import('@/lib/firebase/messaging')).resolves.toBeDefined();
    });
  });
});
