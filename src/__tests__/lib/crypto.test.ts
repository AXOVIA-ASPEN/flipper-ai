/**
 * Crypto utility tests
 * @jest-environment node
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { encrypt, decrypt, maskApiKey, isEncrypted } from '@/lib/crypto';

describe('Crypto utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt / decrypt', () => {
    test('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt a long string', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt unicode characters', () => {
      const plaintext = '你好世界🌍🚀';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt and decrypt API keys', () => {
      const apiKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    test('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });

    test('should produce base64-encoded output', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    test('should throw error on invalid encrypted data', () => {
      expect(() => decrypt('invalid-data')).toThrow();
    });

    test('should throw error on tampered ciphertext', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      // Tamper with the auth tag portion (after salt+iv, before ciphertext)
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[40] = buffer[40] ^ 0xFF; // Flip bits in auth tag
      const tampered = buffer.toString('base64');
      expect(() => decrypt(tampered)).toThrow();
    });

    test('should throw error on truncated data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const truncated = encrypted.slice(0, encrypted.length / 2);
      expect(() => decrypt(truncated)).toThrow();
    });

    test('should throw error in production without ENCRYPTION_SECRET', () => {
      delete process.env.ENCRYPTION_SECRET;
      process.env.NODE_ENV = 'production';
      expect(() => encrypt('test')).toThrow('ENCRYPTION_SECRET environment variable is required in production');
    });

    test('should use development fallback when ENCRYPTION_SECRET is missing in dev', () => {
      delete process.env.ENCRYPTION_SECRET;
      process.env.NODE_ENV = 'development';
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should use custom ENCRYPTION_SECRET when provided', () => {
      process.env.ENCRYPTION_SECRET = 'my-custom-secret-key-for-testing-12345';
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should fail to decrypt with wrong secret', () => {
      process.env.ENCRYPTION_SECRET = 'secret-1';
      const encrypted = encrypt('test');
      
      process.env.ENCRYPTION_SECRET = 'secret-2';
      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe('maskApiKey', () => {
    test('should mask API key showing last 4 characters', () => {
      const apiKey = 'sk-proj-1234567890';
      const masked = maskApiKey(apiKey);
      expect(masked).toMatch(/^•+7890$/);
      expect(masked.endsWith('7890')).toBe(true);
    });

    test('should mask long API keys', () => {
      const apiKey = 'sk-proj-' + 'a'.repeat(50);
      const masked = maskApiKey(apiKey);
      expect(masked.length).toBeLessThanOrEqual(16); // 12 bullets + 4 visible
      expect(masked).toMatch(/^•+aaaa$/);
    });

    test('should handle short strings', () => {
      expect(maskApiKey('abc')).toBe('••••');
      expect(maskApiKey('ab')).toBe('••••');
      expect(maskApiKey('a')).toBe('••••');
    });

    test('should handle empty string', () => {
      expect(maskApiKey('')).toBe('••••');
    });

    test('should handle exactly 4 characters', () => {
      const masked = maskApiKey('1234');
      expect(masked).toBe('1234');
    });

    test('should mask OpenAI API key format', () => {
      const apiKey = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop';
      const masked = maskApiKey(apiKey);
      expect(masked).toMatch(/^••••••••••••mnop$/);
    });

    test('should mask Anthropic API key format', () => {
      const apiKey = 'sk-ant-api03-1234567890abcdefghijk';
      const masked = maskApiKey(apiKey);
      expect(masked).toMatch(/^••••••••••••hijk$/);
    });
  });

  describe('isEncrypted', () => {
    test('should return true for encrypted values', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    test('should return false for plaintext', () => {
      expect(isEncrypted('plaintext')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    test('should return false for short base64 strings', () => {
      const shortBase64 = Buffer.from('abc').toString('base64');
      expect(isEncrypted(shortBase64)).toBe(false);
    });

    test('should return false for invalid base64', () => {
      expect(isEncrypted('not-base64!!!')).toBe(false);
    });

    test('should return true for base64 strings of correct length', () => {
      const validLength = Buffer.alloc(49).toString('base64'); // 16+16+16+1
      expect(isEncrypted(validLength)).toBe(true);
    });

    test('should handle null/undefined gracefully', () => {
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
    });
  });

  describe('round-trip edge cases', () => {
    test('should handle empty string', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    test('should handle single character', () => {
      const encrypted = encrypt('x');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('x');
    });

    test('should handle whitespace', () => {
      const plaintext = '   \n\t   ';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should handle newlines', () => {
      const plaintext = 'line1\nline2\nline3';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    test('should handle JSON strings', () => {
      const plaintext = JSON.stringify({ key: 'value', nested: { data: [1, 2, 3] } });
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
