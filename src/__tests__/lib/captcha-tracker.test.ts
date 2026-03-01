/**
 * Tests for captcha-tracker.ts
 * @jest-environment node
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

import {
  recordFailedAttempt,
  requiresCaptcha,
  clearFailedAttempts,
  getFailedAttemptCount,
  verifyHCaptcha,
} from '@/lib/captcha-tracker';

describe('captcha-tracker', () => {
  beforeEach(() => {
    // Clear any state from previous tests
    clearFailedAttempts('test@example.com');
    clearFailedAttempts('user@example.com');
    clearFailedAttempts('expired@example.com');
    clearFailedAttempts('case@example.com');
    jest.restoreAllMocks();
  });

  describe('recordFailedAttempt', () => {
    test('records first failed attempt and returns 1', () => {
      const count = recordFailedAttempt('test@example.com');
      expect(count).toBe(1);
    });

    test('increments count for subsequent attempts within window', () => {
      const count1 = recordFailedAttempt('test@example.com');
      const count2 = recordFailedAttempt('test@example.com');
      const count3 = recordFailedAttempt('test@example.com');

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(3);
    });

    test('normalizes identifier to lowercase', () => {
      recordFailedAttempt('TEST@Example.COM');
      const count = recordFailedAttempt('test@example.com');
      expect(count).toBe(2);
    });

    test('resets count when attempt window has expired', () => {
      jest.useFakeTimers();

      recordFailedAttempt('expired@example.com');
      recordFailedAttempt('expired@example.com');
      expect(getFailedAttemptCount('expired@example.com')).toBe(2);

      // Advance past the 10-minute window
      jest.advanceTimersByTime(10 * 60 * 1000 + 1);

      const count = recordFailedAttempt('expired@example.com');
      expect(count).toBe(1);

      jest.useRealTimers();
    });
  });

  describe('requiresCaptcha', () => {
    test('returns false when no attempts recorded', () => {
      expect(requiresCaptcha('unknown@example.com')).toBe(false);
    });

    test('returns false when under threshold', () => {
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      expect(requiresCaptcha('test@example.com')).toBe(false);
    });

    test('returns true when at threshold (3 attempts)', () => {
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      expect(requiresCaptcha('test@example.com')).toBe(true);
    });

    test('returns true when above threshold', () => {
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      expect(requiresCaptcha('test@example.com')).toBe(true);
    });

    test('returns false and deletes entry when window expired', () => {
      jest.useFakeTimers();

      recordFailedAttempt('expired@example.com');
      recordFailedAttempt('expired@example.com');
      recordFailedAttempt('expired@example.com');
      expect(requiresCaptcha('expired@example.com')).toBe(true);

      // Advance past the 10-minute window
      jest.advanceTimersByTime(10 * 60 * 1000 + 1);

      expect(requiresCaptcha('expired@example.com')).toBe(false);
      // Entry should be deleted, so getFailedAttemptCount returns 0
      expect(getFailedAttemptCount('expired@example.com')).toBe(0);

      jest.useRealTimers();
    });

    test('normalizes identifier to lowercase', () => {
      recordFailedAttempt('case@example.com');
      recordFailedAttempt('case@example.com');
      recordFailedAttempt('case@example.com');
      expect(requiresCaptcha('CASE@Example.COM')).toBe(true);
    });
  });

  describe('clearFailedAttempts', () => {
    test('clears existing failed attempts', () => {
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      expect(requiresCaptcha('test@example.com')).toBe(true);

      clearFailedAttempts('test@example.com');

      expect(requiresCaptcha('test@example.com')).toBe(false);
      expect(getFailedAttemptCount('test@example.com')).toBe(0);
    });

    test('handles clearing non-existent identifier without error', () => {
      expect(() => clearFailedAttempts('nonexistent@example.com')).not.toThrow();
    });

    test('normalizes identifier to lowercase', () => {
      recordFailedAttempt('test@example.com');
      clearFailedAttempts('TEST@Example.COM');
      expect(getFailedAttemptCount('test@example.com')).toBe(0);
    });
  });

  describe('getFailedAttemptCount', () => {
    test('returns 0 when no attempts recorded', () => {
      expect(getFailedAttemptCount('unknown@example.com')).toBe(0);
    });

    test('returns correct count within window', () => {
      recordFailedAttempt('test@example.com');
      recordFailedAttempt('test@example.com');
      expect(getFailedAttemptCount('test@example.com')).toBe(2);
    });

    test('returns 0 and deletes entry when window expired', () => {
      jest.useFakeTimers();

      recordFailedAttempt('expired@example.com');
      recordFailedAttempt('expired@example.com');
      expect(getFailedAttemptCount('expired@example.com')).toBe(2);

      // Advance past the 10-minute window
      jest.advanceTimersByTime(10 * 60 * 1000 + 1);

      expect(getFailedAttemptCount('expired@example.com')).toBe(0);

      // After deletion, recording again should start fresh
      const count = recordFailedAttempt('expired@example.com');
      expect(count).toBe(1);

      jest.useRealTimers();
    });

    test('normalizes identifier to lowercase', () => {
      recordFailedAttempt('case@example.com');
      expect(getFailedAttemptCount('CASE@Example.COM')).toBe(1);
    });
  });

  describe('verifyHCaptcha', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('returns false when HCAPTCHA_SECRET_KEY is not configured', async () => {
      delete process.env.HCAPTCHA_SECRET_KEY;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await verifyHCaptcha('test-token');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('HCAPTCHA_SECRET_KEY not configured');
    });

    test('returns true for successful verification', async () => {
      process.env.HCAPTCHA_SECRET_KEY = 'test-secret-key';

      const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      } as unknown as Response);

      const result = await verifyHCaptcha('valid-token');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'response=valid-token&secret=test-secret-key',
      });
    });

    test('returns false for failed verification', async () => {
      process.env.HCAPTCHA_SECRET_KEY = 'test-secret-key';

      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: false }),
      } as unknown as Response);

      const result = await verifyHCaptcha('invalid-token');

      expect(result).toBe(false);
    });

    test('returns false when fetch throws an error', async () => {
      process.env.HCAPTCHA_SECRET_KEY = 'test-secret-key';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await verifyHCaptcha('test-token');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'hCaptcha verification failed:',
        expect.any(Error)
      );
    });
  });
});
