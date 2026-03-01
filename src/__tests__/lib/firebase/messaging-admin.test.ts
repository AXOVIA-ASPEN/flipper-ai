/**
 * Tests for Firebase Cloud Messaging — Server-side helpers (Admin SDK)
 *
 * Mocks firebase-admin/messaging to test getMessagingAdmin,
 * sendToDevice, and sendToTopic.
 */

const mockSend = jest.fn().mockResolvedValue('projects/axovia-flipper/messages/mock-123');
const mockGetMessaging = jest.fn().mockReturnValue({ send: mockSend });

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: mockGetMessaging,
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminApp: { name: '[DEFAULT]' },
}));

describe('Firebase Cloud Messaging — Server-side (Admin SDK)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSend.mockResolvedValue('projects/axovia-flipper/messages/mock-123');
    mockGetMessaging.mockReturnValue({ send: mockSend });
  });

  describe('getMessagingAdmin', () => {
    it('returns messaging instance', async () => {
      const { getMessagingAdmin } = await import('@/lib/firebase/messaging-admin');
      const result = getMessagingAdmin();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('send');
      expect(mockGetMessaging).toHaveBeenCalled();
    });

    it('returns null and logs warning when app/no-app error', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockGetMessaging.mockImplementation(() => {
        const err = new Error('No app') as Error & { code: string };
        err.code = 'app/no-app';
        throw err;
      });
      const { getMessagingAdmin } = await import('@/lib/firebase/messaging-admin');
      const result = getMessagingAdmin();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Firebase Admin credentials not configured')
      );
      consoleSpy.mockRestore();
    });

    it('returns null and logs warning when app/invalid-credential error', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockGetMessaging.mockImplementation(() => {
        const err = new Error('Invalid credential') as Error & { code: string };
        err.code = 'app/invalid-credential';
        throw err;
      });
      const { getMessagingAdmin } = await import('@/lib/firebase/messaging-admin');
      const result = getMessagingAdmin();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('gcloud auth application-default login')
      );
      consoleSpy.mockRestore();
    });

    it('returns null and logs warning for unknown initialization errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const unknownError = new Error('Unexpected init failure');
      mockGetMessaging.mockImplementation(() => {
        throw unknownError;
      });
      const { getMessagingAdmin } = await import('@/lib/firebase/messaging-admin');
      const result = getMessagingAdmin();
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'FCM Admin messaging initialization failed:',
        unknownError
      );
      consoleSpy.mockRestore();
    });
  });

  describe('sendToDevice', () => {
    it('sends notification with correct Message shape', async () => {
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToDevice('test-device-token', {
        title: 'Test Title',
        body: 'Test Body',
      });
      expect(result).toBe('projects/axovia-flipper/messages/mock-123');
      expect(mockSend).toHaveBeenCalledWith({
        token: 'test-device-token',
        notification: {
          title: 'Test Title',
          body: 'Test Body',
        },
        data: undefined,
      });
    });

    it('includes data payload when provided', async () => {
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      await sendToDevice('test-token', {
        title: 'Deal Alert',
        body: 'New flip opportunity',
        data: { listingId: '123', type: 'opportunity' },
      });
      expect(mockSend).toHaveBeenCalledWith({
        token: 'test-token',
        notification: {
          title: 'Deal Alert',
          body: 'New flip opportunity',
        },
        data: { listingId: '123', type: 'opportunity' },
      });
    });

    it('has token at top level of Message, not inside notification', async () => {
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      await sendToDevice('my-token', { title: 'Test', body: 'Test' });
      const sentMessage = mockSend.mock.calls[0][0];
      expect(sentMessage.token).toBe('my-token');
      expect(sentMessage.notification).not.toHaveProperty('token');
    });

    it('returns null and warns on invalid-registration-token', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSend.mockRejectedValue(
        Object.assign(new Error('Invalid token'), { code: 'messaging/invalid-registration-token' })
      );
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToDevice('bad-token', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stale FCM token detected')
      );
      consoleSpy.mockRestore();
    });

    it('returns null and warns on registration-token-not-registered', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockSend.mockRejectedValue(
        Object.assign(new Error('Token not registered'), {
          code: 'messaging/registration-token-not-registered',
        })
      );
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToDevice('expired-token', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stale FCM token detected')
      );
      consoleSpy.mockRestore();
    });

    it('logs warning for non-token send errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const networkError = new Error('Network timeout');
      mockSend.mockRejectedValue(networkError);
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToDevice('valid-token', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('FCM sendToDevice failed:', networkError);
      consoleSpy.mockRestore();
    });

    it('returns null when messaging admin is not available', async () => {
      mockGetMessaging.mockImplementation(() => {
        throw new Error('No credentials');
      });
      const { sendToDevice } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToDevice('token', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('sendToTopic', () => {
    it('sends notification with topic field using modern send() API', async () => {
      const { sendToTopic } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToTopic('new-deals', {
        title: 'New Deal',
        body: 'A new flip opportunity was found',
      });
      expect(result).toBe('projects/axovia-flipper/messages/mock-123');
      expect(mockSend).toHaveBeenCalledWith({
        topic: 'new-deals',
        notification: {
          title: 'New Deal',
          body: 'A new flip opportunity was found',
        },
        data: undefined,
      });
    });

    it('includes data payload when provided', async () => {
      const { sendToTopic } = await import('@/lib/firebase/messaging-admin');
      await sendToTopic('alerts', {
        title: 'Price Drop',
        body: 'Price dropped below threshold',
        data: { listingId: '456' },
      });
      expect(mockSend).toHaveBeenCalledWith({
        topic: 'alerts',
        notification: {
          title: 'Price Drop',
          body: 'Price dropped below threshold',
        },
        data: { listingId: '456' },
      });
    });

    it('returns null and logs warning when send fails', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const sendError = new Error('Topic send failed');
      mockSend.mockRejectedValue(sendError);
      const { sendToTopic } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToTopic('bad-topic', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('FCM sendToTopic failed:', sendError);
      consoleSpy.mockRestore();
    });

    it('returns null when messaging admin is not available', async () => {
      mockGetMessaging.mockImplementation(() => {
        throw new Error('No credentials');
      });
      const { sendToTopic } = await import('@/lib/firebase/messaging-admin');
      const result = await sendToTopic('topic', { title: 'Test', body: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('NotificationPayload type', () => {
    it('exports NotificationPayload interface', async () => {
      const mod = await import('@/lib/firebase/messaging-admin');
      // Type check — interface should be importable (compile-time check; runtime verify exports exist)
      expect(mod.sendToDevice).toBeDefined();
      expect(mod.sendToTopic).toBeDefined();
      expect(mod.getMessagingAdmin).toBeDefined();
    });
  });

  describe('no browser globals', () => {
    it('does not reference window, navigator, or self', async () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../../lib/firebase/messaging-admin.ts'),
        'utf-8'
      );
      // Should not contain browser globals (except in comments)
      const codeLines = content
        .split('\n')
        .filter((line: string) => !line.trim().startsWith('*') && !line.trim().startsWith('//'));
      const codeOnly = codeLines.join('\n');
      expect(codeOnly).not.toMatch(/\bwindow\b/);
      expect(codeOnly).not.toMatch(/\bnavigator\b/);
      expect(codeOnly).not.toMatch(/\bself\b/);
    });
  });
});
